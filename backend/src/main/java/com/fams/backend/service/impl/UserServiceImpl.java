package com.fams.backend.service.impl;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
import com.fams.backend.entity.ImportJob;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.UserService;
import jakarta.persistence.criteria.Fetch;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.fams.backend.service.UploadService uploadService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Executor importExecutor;
    private final com.fams.backend.repository.ImportJobRepository importJobRepository;
    private final com.fams.backend.service.impl.SystemLogService systemLogService;
    private final com.fams.backend.service.impl.AsyncImportService asyncImportService;
    private final com.fams.backend.service.impl.EmailQueueService emailQueueService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_USERS = "users";
    private static final String CACHE_USER_DETAILS = "user_details";

    private static final DateTimeFormatter DOB_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter PASSWORD_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy");

    // Extreme Optimization: Cache for hashed passwords (BCrypt is slow)
    // Common birthdates will only be hashed once.
    private final Map<String, String> passwordHashCache = new ConcurrentHashMap<>();

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(String search, String role, String status, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            // Eager loading for UserResponse mapping - ONLY on data query, not count query
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                Fetch<User, com.fams.backend.entity.StudentProfile> studentProfileFetch = root.fetch("studentProfile",
                        JoinType.LEFT);
                studentProfileFetch.fetch("major", JoinType.LEFT);
                studentProfileFetch.fetch("specialization", JoinType.LEFT);
                studentProfileFetch.fetch("subSpecialization", JoinType.LEFT);

                root.fetch("lecturerProfile", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();
            // ... predicates logic ...

            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    User.UserStatus userStatus = Enum.valueOf(User.UserStatus.class, status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), userStatus));
                } catch (Exception e) {
                    log.error("Invalid status filter: {}", status);
                }
            }

            if (role != null && !role.isEmpty() && !role.equalsIgnoreCase("all")) {
                try {
                    User.UserRole userRole = Enum.valueOf(User.UserRole.class, role.toUpperCase());
                    predicates.add(cb.equal(root.get("role"), userRole));
                } catch (Exception e) {
                    log.error("Invalid role filter: {}", role);
                }
            }

            if (search != null && !search.isEmpty()) {
                String searchLower = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), searchLower),
                        cb.like(cb.lower(root.get("email")), searchLower),
                        cb.like(cb.lower(root.get("code")), searchLower),
                        cb.like(cb.lower(root.get("username")), searchLower)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return userRepository.findAll(spec, pageable).map(UserResponse::fromUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return userRepository.findById(id)
                .map(UserResponse::fromUser)
                .orElseThrow(() -> new NotFoundException("User not found with id: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        return userRepository.findByUsernameWithProfiles(username)
                .map(UserResponse::fromUser)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));
    }

    @Override
    @Transactional
    @CacheEvict(value = CACHE_USERS, allEntries = true)
    public UserResponse createUser(UserRequest request, MultipartFile avatar) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã tồn tại");
        }
        if (userRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã số đã tồn tại");
        }

        String avatarUrl = uploadService.uploadFile(avatar);

        User user = User.builder()
                .code(request.getCode())
                .username(null)
                .password(null)
                .fullName(request.getFullName())
                .email(request.getEmail())
                .dob(request.getDob())
                .phone(request.getPhone())
                .role(request.getRole())
                .status(User.UserStatus.INACTIVE)
                .avatar(avatarUrl)
                .faceDataStatus(avatarUrl != null ? User.FaceDataStatus.REGISTERED
                        : (request.getFaceDataStatus() != null ? request.getFaceDataStatus()
                                : User.FaceDataStatus.NOT_REGISTERED))
                .build();

        log.info("Creating new user with email: {} and code: {}", request.getEmail(), request.getCode());
        User savedUser = userRepository.save(user);

        // Audit log
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        systemLogService.logUserCreated(adminUsername, savedUser.getCode(), savedUser.getFullName());

        return UserResponse.fromUser(savedUser);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CACHE_USERS, allEntries = true),
            @CacheEvict(value = CACHE_USER_DETAILS, allEntries = true)
    })
    public void activateUsers(List<Long> ids) {
        log.info("Activating users: {}", ids);
        List<User> users = userRepository.findAllById(ids);
        List<EmailQueueService.EmailTask> emailTasks = new ArrayList<>();

        for (User user : users) {
            if (user.getStatus() != User.UserStatus.ACTIVE) {
                user.setUsername(user.getCode());
                String unaccentedName = unaccent(
                        user.getFullName().split(" ")[user.getFullName().split(" ").length - 1]);
                String dobStr = user.getDob().format(PASSWORD_FORMATTER);
                String rawPassword = unaccentedName.toLowerCase() + "@" + dobStr;

                user.setPassword(getHashedPassword(rawPassword));
                user.setStatus(User.UserStatus.ACTIVE);
                user.setIsPasswordChanged(false);

                // Collect email task for batch processing
                emailTasks.add(new EmailQueueService.EmailTask(
                        null, // No specific jobId for individual activation
                        user.getEmail(),
                        user.getFullName(),
                        user.getUsername(),
                        rawPassword));
            }
        }

        // Final database save (all users updated at once)
        userRepository.saveAll(users);

        // Push all emails to Redis queue (asynchronous - very fast)
        if (!emailTasks.isEmpty()) {
            emailQueueService.pushEmailTasks(emailTasks);
            log.info("Pushed {} email tasks for bulk activation.", emailTasks.size());
        }

        log.info("Activated {} users successfully", users.size());

        // Audit log
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        systemLogService.logUsersActivated(adminUsername, users.size());
    }

    @Override
    @Transactional
    public void activateAllInactiveUsers() {
        String adminUsername = getCurrentUsername();
        log.info("Triggering background activation for admin: {}", adminUsername);
        asyncImportService.activateAllUsersAsync(adminUsername);
    }

    private String getHashedPassword(String rawPassword) {
        return passwordHashCache.computeIfAbsent(rawPassword, passwordEncoder::encode);
    }

    @Override
    @Transactional
    @CacheEvict(value = CACHE_USER_DETAILS, key = "#username")
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setIsPasswordChanged(true);
        log.info("Password changed successfully for user: {}", username);
        userRepository.save(user);

        // Audit log
        systemLogService.logPasswordChanged(username);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CACHE_USERS, allEntries = true),
            @CacheEvict(value = CACHE_USER_DETAILS, key = "#username")
    })
    public UserResponse updateMyProfile(String username, com.fams.backend.dto.request.UpdateProfileRequest request,
            MultipartFile avatar) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));

        // Update Phone and DOB (Allowed for everyone)
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getDob() != null) {
            user.setDob(request.getDob());
        }

        // Avatar Update Logic
        // Student: Cannot changed avatar
        // Others (Lecturer, Admin, Staff): Can change avatar
        if (user.getRole() != User.UserRole.STUDENT) {
            if (avatar != null && !avatar.isEmpty()) {
                String avatarUrl = uploadService.uploadFile(avatar);
                user.setAvatar(avatarUrl);
                // Also update face data status if needed, but for now just update avatar
                user.setFaceDataStatus(User.FaceDataStatus.REGISTERED);
            }
        }
        // Note: Silently ignore avatar update for students or if file is empty

        log.info("Profile updated for user: {}", username);
        return UserResponse.fromUser(userRepository.save(user));
    }

    private String unaccent(String src) {
        if (src == null)
            return "";
        String nfdNormalizedString = java.text.Normalizer.normalize(src, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(nfdNormalizedString).replaceAll("").replace('đ', 'd').replace('Đ',
                'D');
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CACHE_USERS, allEntries = true),
            @CacheEvict(value = CACHE_USER_DETAILS, key = "#id")
    })
    public UserResponse updateUser(Long id, UserRequest request, MultipartFile avatar) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found with id: " + id));

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())
                && userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username đã tồn tại");
        }
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã tồn tại");
        }
        if (request.getCode() != null && (user.getCode() == null || !user.getCode().equals(request.getCode()))
                && userRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã số đã tồn tại");
        }

        if (avatar != null && !avatar.isEmpty()) {
            String avatarUrl = uploadService.uploadFile(avatar);
            user.setAvatar(avatarUrl);
            user.setFaceDataStatus(User.FaceDataStatus.REGISTERED);
        }

        User.UserRole oldRole = user.getRole();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setDob(request.getDob());
        user.setRole(request.getRole());
        user.setStatus(request.getStatus());

        if (request.getFaceDataStatus() != null) {
            if (avatar == null || avatar.isEmpty()) {
                user.setFaceDataStatus(request.getFaceDataStatus());
            }
        }

        User savedUser = userRepository.save(user);

        // Audit log for role change
        if (oldRole != savedUser.getRole()) {
            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            systemLogService.logRoleChanged(adminUsername, savedUser.getUsername(), oldRole.name(),
                    savedUser.getRole().name());
        }

        log.info("User updated successfully: id={}, code={}", id, user.getCode());
        return UserResponse.fromUser(savedUser);
    }

    @Override
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CACHE_USERS, allEntries = true),
            @CacheEvict(value = CACHE_USER_DETAILS, key = "#id")
    })
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("User not found with id: " + id);
        }
        log.info("Deleting user with id: {}", id);
        userRepository.deleteById(id);
    }

    @Override
    @Transactional
    @CacheEvict(value = CACHE_USERS, allEntries = true)
    public void importUsers(MultipartFile file, String importMode) {
        log.info("Importing users from file: {}, mode: {}", file.getOriginalFilename(), importMode);

        if ("REPLACE".equalsIgnoreCase(importMode)) {
            log.info("REPLACE mode selected. Deleting all INACTIVE STUDENT and LECTURER users before import.");
            userRepository.deleteAllByRoleInAndStatus(Arrays.asList(User.UserRole.STUDENT, User.UserRole.LECTURER),
                    User.UserStatus.INACTIVE);
        }

        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("user_import_");
            List<File> imageFiles = new ArrayList<>();
            File excelFile = null;

            try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
                ZipEntry zipEntry = zis.getNextEntry();
                while (zipEntry != null) {
                    File newFile = new File(tempDir.toFile(), zipEntry.getName());
                    if (zipEntry.isDirectory()) {
                        newFile.mkdirs();
                    } else {
                        newFile.getParentFile().mkdirs();
                        Files.copy(zis, newFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
                        String fileName = newFile.getName().toLowerCase();
                        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"))
                            excelFile = newFile;
                        else if (isImage(fileName))
                            imageFiles.add(newFile);
                    }
                    zipEntry = zis.getNextEntry();
                }
            }

            if (excelFile == null) {
                if (file.getOriginalFilename() != null && (file.getOriginalFilename().endsWith(".xlsx")
                        || file.getOriginalFilename().endsWith(".xls"))) {
                    processExcelImport(file.getInputStream(), Collections.emptyMap(), getCurrentUsername());
                    return;
                }
                throw new BadRequestException("Không tìm thấy file Excel trong file tải lên");
            }

            Map<String, File> imageMap = new HashMap<>();
            for (File img : imageFiles) {
                String name = img.getName();
                int lastDotIndex = name.lastIndexOf('.');
                String code = (lastDotIndex > 0) ? name.substring(0, lastDotIndex).toLowerCase() : name.toLowerCase();
                imageMap.put(code, img);
            }

            try (InputStream is = new FileInputStream(excelFile)) {
                processExcelImport(is, imageMap, getCurrentUsername());
            }

        } catch (Exception e) {
            log.error("Failed to import users", e);
            throw new BadRequestException("Lỗi khi xử lý file import: " + e.getMessage());
        } finally {
            if (tempDir != null)
                cleanUpTempDir(tempDir);
        }
    }

    private boolean isImage(String fileName) {
        return fileName.endsWith(".jpg") || fileName.endsWith(".png") || fileName.endsWith(".jpeg");
    }

    private void cleanUpTempDir(Path tempDir) {
        try (Stream<Path> walk = Files.walk(tempDir)) {
            walk.sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
        } catch (IOException e) {
            log.warn("Failed to clean up temp dir: {}", tempDir);
        }
    }

    private void processExcelImport(InputStream is, Map<String, File> imageMap, String requester) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            List<ImportRowData> validRowData = new ArrayList<>();
            List<String> validationErrors = new ArrayList<>();
            Set<String> seenCodes = new HashSet<>();
            Set<String> seenEmails = new HashSet<>();
            int rowNumber = 0;

            String progressTopic = "/topic/import-progress/" + requester;
            sendProgress(progressTopic, "VALIDATING", 0, 0, "Đang kiểm tra dữ liệu file Excel...");

            // EXTREME OPTIMIZATION: Collect all codes/emails from the file first
            List<Row> allRows = new ArrayList<>();
            while (rows.hasNext())
                allRows.add(rows.next());

            Set<String> codesInFile = allRows.stream()
                    .filter(r -> r.getRowNum() > 0)
                    .map(r -> getCellValue(r.getCell(1)).toLowerCase())
                    .filter(c -> !c.isEmpty())
                    .collect(Collectors.toSet());

            Set<String> emailsInFile = allRows.stream()
                    .filter(r -> r.getRowNum() > 0)
                    .map(r -> getCellValue(r.getCell(4)).toLowerCase())
                    .filter(e -> !e.isEmpty())
                    .collect(Collectors.toSet());

            // Fetch only those that exist in DB
            Set<String> existingCodes = userRepository.findByCodeInIgnoreCase(codesInFile).stream()
                    .map(u -> u.getCode().toLowerCase())
                    .collect(Collectors.toSet());
            Set<String> existingEmails = userRepository.findByEmailInIgnoreCase(emailsInFile).stream()
                    .map(u -> u.getEmail().toLowerCase())
                    .collect(Collectors.toSet());

            for (Row currentRow : allRows) {
                int currentRowNum = rowNumber + 1;
                if (rowNumber++ == 0)
                    continue;

                String fullName = getCellValue(currentRow.getCell(0));
                String code = getCellValue(currentRow.getCell(1));
                String roleStr = getCellValue(currentRow.getCell(2));
                String dobStr = getCellValue(currentRow.getCell(3));
                String email = getCellValue(currentRow.getCell(4));
                String phone = getCellValue(currentRow.getCell(5));

                if (code.isEmpty() || email.isEmpty())
                    continue;

                String codeLower = code.toLowerCase();
                String emailLower = email.toLowerCase();
                boolean rowHasError = false;

                if (seenCodes.contains(codeLower)) {
                    validationErrors
                            .add("Dòng " + currentRowNum + ": Mã nhân viên '" + code + "' bị trùng lặp trong file.");
                    rowHasError = true;
                }
                if (existingCodes.contains(codeLower)) {
                    validationErrors
                            .add("Dòng " + currentRowNum + ": Mã nhân viên '" + code + "' đã tồn tại trên hệ thống.");
                    rowHasError = true;
                }
                if (seenEmails.contains(emailLower)) {
                    validationErrors.add("Dòng " + currentRowNum + ": Email '" + email + "' bị trùng lặp trong file.");
                    rowHasError = true;
                }
                if (existingEmails.contains(emailLower)) {
                    validationErrors.add("Dòng " + currentRowNum + ": Email '" + email + "' đã tồn tại trên hệ thống.");
                    rowHasError = true;
                }

                LocalDate dob = null;
                try {
                    dob = LocalDate.parse(dobStr, DOB_FORMATTER);
                } catch (Exception e) {
                    validationErrors.add("Dòng " + currentRowNum + ": Định dạng ngày sinh không hợp lệ: " + dobStr);
                    rowHasError = true;
                }

                if (!rowHasError) {
                    seenCodes.add(codeLower);
                    seenEmails.add(emailLower);
                    validRowData.add(new ImportRowData(fullName, code, roleStr, dob, email, phone));
                }
            }

            if (!validationErrors.isEmpty()) {
                sendProgress(progressTopic, "ERROR", 0, 0, "Dữ liệu không hợp lệ");
                throw new BadRequestException("Dữ liệu file không hợp lệ:\n" + String.join("\n", validationErrors));
            }

            int total = validRowData.size();
            sendProgress(progressTopic, "PRE_HASHING", 0, total, "Đang chuẩn bị mã hóa...");

            // EXTREME OPTIMIZATION 1: Pre-hash all unique passwords upfront
            // This isolates CPU-intensive work from I/O tasks
            Set<String> uniqueRawPasswords = validRowData.stream()
                    .map(data -> data.dob.format(PASSWORD_FORMATTER))
                    .collect(Collectors.toSet());

            log.info("Pre-hashing {} unique passwords", uniqueRawPasswords.size());
            for (String rawPassword : uniqueRawPasswords) {
                getHashedPassword(rawPassword); // Populates the cache
            }

            sendProgress(progressTopic, "PROCESSING", 0, total, "Đang xử lý ảnh và lưu dữ liệu...");
            AtomicInteger completedCount = new AtomicInteger(0);
            AtomicInteger savedCount = new AtomicInteger(0);

            // EXTREME OPTIMIZATION 2: Incremental streaming saves
            // Save batches immediately as they complete instead of waiting for all
            List<User> saveBuffer = Collections.synchronizedList(new ArrayList<>());
            final int BATCH_SIZE = 20;

            List<CompletableFuture<Void>> futures = validRowData.stream()
                    .map(data -> CompletableFuture.supplyAsync(() -> {
                        String avatarUrl = null;
                        File imageFile = imageMap.get(data.code.toLowerCase());
                        User.FaceDataStatus faceStatus = User.FaceDataStatus.NOT_REGISTERED;

                        if (imageFile != null) {
                            try {
                                byte[] content = Files.readAllBytes(imageFile.toPath());
                                avatarUrl = uploadService.uploadFile(new MockMultipartFile(imageFile.getName(),
                                        imageFile.getName(), "image/jpeg", content));
                                faceStatus = User.FaceDataStatus.REGISTERED;
                            } catch (Exception ex) {
                                log.error("Failed to upload avatar for user {}: {}", data.code, ex.getMessage());
                            }
                        }

                        int currentCount = completedCount.incrementAndGet();
                        if (currentCount % 10 == 0 || currentCount == total) {
                            sendProgress(progressTopic, "PROCESSING", currentCount, total,
                                    "Đang xử lý: " + currentCount + "/" + total);
                        }

                        return User.builder()
                                .fullName(data.fullName).code(data.code).username(data.code.toLowerCase())
                                .password(getHashedPassword(data.dob.format(PASSWORD_FORMATTER)))
                                .email(data.email).phone(data.phone).dob(data.dob)
                                .role(mapRole(data.roleStr)).status(User.UserStatus.INACTIVE)
                                .faceDataStatus(faceStatus).avatar(avatarUrl).build();
                    }, importExecutor).thenAccept(user -> {
                        // Incremental save: accumulate and flush in batches
                        saveBuffer.add(user);
                        if (saveBuffer.size() >= BATCH_SIZE) {
                            List<User> toSave;
                            synchronized (saveBuffer) {
                                if (saveBuffer.size() >= BATCH_SIZE) {
                                    toSave = new ArrayList<>(saveBuffer.subList(0, BATCH_SIZE));
                                    saveBuffer.subList(0, BATCH_SIZE).clear();
                                } else {
                                    return;
                                }
                            }
                            userRepository.saveAll(toSave);
                            int saved = savedCount.addAndGet(toSave.size());
                            sendProgress(progressTopic, "SAVING", saved, total, "Đã lưu: " + saved + "/" + total);
                        }
                    }))
                    .collect(Collectors.toList());

            // Wait for all processing to complete
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            // Save any remaining users in buffer
            if (!saveBuffer.isEmpty()) {
                userRepository.saveAll(saveBuffer);
                int finalSaved = savedCount.addAndGet(saveBuffer.size());
                sendProgress(progressTopic, "SAVING", finalSaved, total, "Đã lưu: " + finalSaved + "/" + total);
            }

            log.info("Successfully imported {} users.", total);
            sendProgress(progressTopic, "COMPLETED", total, total, "Import thành công " + total + " người dùng");
        }
    }

    private void sendProgress(String topic, String status, int current, int total, String message) {
        Map<String, Object> progress = new HashMap<>();
        progress.put("status", status);
        progress.put("current", current);
        progress.put("total", total);
        progress.put("message", message);
        progress.put("percentage", total > 0 ? (int) ((double) current / total * 100) : 100);
        messagingTemplate.convertAndSend(topic, progress);
    }

    private String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private String getCellValue(Cell cell) {
        if (cell == null)
            return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield DOB_FORMATTER.format(cell.getLocalDateTimeCellValue().toLocalDate());
                }
                yield String.valueOf((long) cell.getNumericCellValue());
            }
            default -> "";
        };
    }

    private User.UserRole mapRole(String roleStr) {
        if (roleStr == null)
            return User.UserRole.STUDENT;
        return switch (roleStr.toLowerCase()) {
            case "admin", "quản trị viên" -> User.UserRole.ADMIN;
            case "phòng đào tạo", "academic_staff" -> User.UserRole.ACADEMIC_STAFF;
            case "giảng viên", "lecturer" -> User.UserRole.LECTURER;
            default -> User.UserRole.STUDENT;
        };
    }

    private static class ImportRowData {
        final String fullName, code, roleStr;
        final LocalDate dob;
        final String email, phone;

        ImportRowData(String fn, String c, String r, LocalDate d, String e, String p) {
            this.fullName = fn;
            this.code = c;
            this.roleStr = r;
            this.dob = d;
            this.email = e;
            this.phone = p;
        }
    }

    // ========================= NEW: Background Job Import Methods
    // =========================

    @Override
    @Transactional
    @CacheEvict(value = CACHE_USERS, allEntries = true)
    public void importExcelSync(MultipartFile file, String importMode) {
        checkActiveJob();
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        log.info("Fast Excel import (no images): {}, mode: {}", file.getOriginalFilename(), importMode);

        // Audit log - start
        systemLogService.logImportStarted(adminUsername, file.getOriginalFilename(), importMode);

        if ("REPLACE".equalsIgnoreCase(importMode)) {
            userRepository.deleteAllByRoleInAndStatus(
                    Arrays.asList(User.UserRole.STUDENT, User.UserRole.LECTURER),
                    User.UserStatus.INACTIVE);
        }

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            List<User> usersToSave = new ArrayList<>();
            int rowNumber = 0;

            Set<String> existingCodes = userRepository.findAllCodes().stream()
                    .map(String::toLowerCase).collect(Collectors.toSet());
            Set<String> existingEmails = userRepository.findAllEmails().stream()
                    .map(String::toLowerCase).collect(Collectors.toSet());

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                if (rowNumber++ == 0)
                    continue;

                String code = getCellValue(currentRow.getCell(1));
                String email = getCellValue(currentRow.getCell(4));
                if (code.isEmpty() || email.isEmpty())
                    continue;

                if (existingCodes.contains(code.toLowerCase()) ||
                        existingEmails.contains(email.toLowerCase())) {
                    continue;
                }

                String fullName = getCellValue(currentRow.getCell(0));
                String roleStr = getCellValue(currentRow.getCell(2));
                String dobStr = getCellValue(currentRow.getCell(3));
                String phone = getCellValue(currentRow.getCell(5));

                try {
                    LocalDate dob = LocalDate.parse(dobStr, DOB_FORMATTER);
                    String password = getHashedPassword(dob.format(PASSWORD_FORMATTER));

                    usersToSave.add(User.builder()
                            .fullName(fullName).code(code).username(code.toLowerCase())
                            .password(password).email(email).phone(phone).dob(dob)
                            .role(mapRole(roleStr)).status(User.UserStatus.INACTIVE)
                            .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                            .build());
                } catch (Exception e) {
                    log.warn("Skipping invalid row {}: {}", rowNumber, e.getMessage());
                }
            }

            if (!usersToSave.isEmpty()) {
                userRepository.saveAll(usersToSave);
                log.info("Excel sync import completed: {} users", usersToSave.size());
            }

        } catch (Exception e) {
            log.error("Error during Excel sync import: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to import Excel file: " + e.getMessage());
        }
    }

    @Override
    public String importZipAsync(byte[] fileBytes, String filename, String importMode) {
        checkActiveJob();
        String jobId = UUID.randomUUID().toString();
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        ImportJob job = ImportJob.builder()
                .jobId(jobId)
                .type(ImportJob.ImportType.ZIP_FULL)
                .status(ImportJob.JobStatus.PENDING)
                .filename(filename)
                .createdBy(username)
                .build();

        importJobRepository.save(job);
        log.info("Created async import job: {} for user: {}", jobId, username);

        // Trigger async processing with bytes (already copied in Controller!)
        asyncImportService.processZipImportAsync(jobId, fileBytes, filename, importMode, username);

        return jobId;
    }

    @Override
    public com.fams.backend.dto.response.ImportJobResponse getImportJobStatus(String jobId) {
        ImportJob job = importJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new NotFoundException("Import job not found: " + jobId));
        return com.fams.backend.dto.response.ImportJobResponse.fromEntity(job);
    }

    @Override
    public com.fams.backend.dto.response.ImportJobResponse getActiveImportJob() {
        return importJobRepository.findTopByStatusInOrderByCreatedAtDesc(
                Arrays.asList(ImportJob.JobStatus.PENDING, ImportJob.JobStatus.PROCESSING))
                .map(job -> {
                    // Self-healing: auto-complete stuck jobs at 100%
                    if (job.getTotalRecords() != null && job.getTotalRecords() > 0
                            && job.getProcessedRecords() != null
                            && job.getProcessedRecords() >= job.getTotalRecords()) {
                        job.setStatus(ImportJob.JobStatus.COMPLETED);
                        job.setStatusMessage("Import hoàn tất thành công!");
                        job.setCompletedAt(java.time.LocalDateTime.now());
                        importJobRepository.save(job);
                        return null; // No active job anymore
                    }
                    return com.fams.backend.dto.response.ImportJobResponse.fromEntity(job);
                })
                .orElse(null);
    }

    @Override
    @Transactional
    public void cleanupStuckJobs() {
        List<ImportJob> stuckJobs = importJobRepository.findByStatusIn(
                Arrays.asList(ImportJob.JobStatus.PENDING, ImportJob.JobStatus.PROCESSING));

        for (ImportJob job : stuckJobs) {
            job.setStatus(ImportJob.JobStatus.CANCELLED);
            job.setErrorMessage("Hệ thống đã tự động hủy bỏ vì tiến trình bị kẹt.");
            job.setCompletedAt(LocalDateTime.now());
        }
        importJobRepository.saveAll(stuckJobs);
        log.info("Cleaned up {} stuck import jobs", stuckJobs.size());
    }

    @Override
    public void cancelMyActiveImportJob() {
        String username = getCurrentUsername();
        importJobRepository.findTopByStatusInAndCreatedByOrderByCreatedAtDesc(
                Arrays.asList(ImportJob.JobStatus.PENDING, ImportJob.JobStatus.PROCESSING),
                username).ifPresent(job -> {
                    asyncImportService.stopJob(job.getJobId());
                });
    }

    private void checkActiveJob() {
        if (importJobRepository.existsByStatusIn(
                Arrays.asList(ImportJob.JobStatus.PENDING, ImportJob.JobStatus.PROCESSING))) {
            throw new BadRequestException(
                    "Hiện đang có một tiến trình import đang chạy. Vui lòng đợi cho đến khi hoàn tất.");
        }
    }

    // ========================= Helper Methods =========================

    private static class MockMultipartFile implements MultipartFile {
        private final String name, originalFilename, contentType;
        private final byte[] content;

        public MockMultipartFile(String n, String of, String ct, byte[] c) {
            this.name = n;
            this.originalFilename = of;
            this.contentType = ct;
            this.content = c;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getOriginalFilename() {
            return originalFilename;
        }

        @Override
        public String getContentType() {
            return contentType;
        }

        @Override
        public boolean isEmpty() {
            return content == null || content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() {
            return content;
        }

        @Override
        public InputStream getInputStream() {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(File dest) throws IOException {
            Files.write(dest.toPath(), content);
        }
    }

    // ========================= Preview Import Implementation
    // =========================

    @Override
    public com.fams.backend.dto.response.PreviewImportResponse previewImportFile(MultipartFile file) {
        long start = System.currentTimeMillis();
        log.info("⚡ Fast-previewing import file: {}", file.getOriginalFilename());

        Path tempDir = null;
        try {
            List<com.fams.backend.dto.response.PreviewImportResponse.PreviewRow> previewRows = new ArrayList<>();
            List<String> validationMessages = new ArrayList<>();
            int totalRows = 0;
            int validRows = 0;
            int errorRows = 0;

            Set<String> imageCodes = new HashSet<>();
            InputStream excelStream = null;

            String filename = file.getOriginalFilename();
            boolean isZip = filename != null && filename.toLowerCase().endsWith(".zip");

            if (isZip) {
                // OPTIMIZATION: Scan ZIP in-memory - only extract Excel, just detect image
                // names
                tempDir = Files.createTempDirectory("preview_import_");
                byte[] zipBytes = file.getBytes(); // Read once into memory
                try (ZipInputStream zis = new ZipInputStream(new java.io.ByteArrayInputStream(zipBytes))) {
                    ZipEntry zipEntry;
                    File excelFile = null;
                    while ((zipEntry = zis.getNextEntry()) != null) {
                        if (!zipEntry.isDirectory()) {
                            String name = zipEntry.getName().toLowerCase();
                            String baseName = name.contains("/") ? name.substring(name.lastIndexOf("/") + 1) : name;

                            if (baseName.endsWith(".xlsx") || baseName.endsWith(".xls")) {
                                // Only extract Excel file to disk
                                excelFile = new File(tempDir.toFile(), baseName);
                                Files.copy(zis, excelFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
                            } else if (isImage(baseName)) {
                                // Just record the code - DON'T extract image to disk
                                String code = baseName.contains(".") ? baseName.substring(0, baseName.lastIndexOf("."))
                                        : baseName;
                                imageCodes.add(code.toLowerCase());
                                // Skip reading image data by consuming the stream
                                zis.closeEntry();
                                continue;
                            }
                        }
                    }
                    if (excelFile != null) {
                        excelStream = new FileInputStream(excelFile);
                    }
                }
            } else {
                excelStream = file.getInputStream();
            }

            if (excelStream == null) {
                throw new BadRequestException("Không tìm thấy file Excel");
            }

            // OPTIMIZATION: Parse Excel FIRST to collect codes/emails, THEN do targeted DB
            // queries
            List<String[]> rawRows = new ArrayList<>(); // Store parsed rows temporarily
            try (InputStream is = excelStream; Workbook workbook = new XSSFWorkbook(is)) {
                Sheet sheet = workbook.getSheetAt(0);
                Iterator<Row> rows = sheet.iterator();
                int rowNumber = 0;

                while (rows.hasNext()) {
                    Row currentRow = rows.next();
                    if (rowNumber++ == 0)
                        continue;

                    String fullName = getCellValue(currentRow.getCell(0));
                    String code = getCellValue(currentRow.getCell(1));
                    String roleStr = getCellValue(currentRow.getCell(2));
                    String dobStr = getCellValue(currentRow.getCell(3));
                    String email = getCellValue(currentRow.getCell(4));
                    String phone = getCellValue(currentRow.getCell(5));

                    if (code.isEmpty() && email.isEmpty() && fullName.isEmpty())
                        continue;

                    rawRows.add(
                            new String[] { fullName, code, roleStr, dobStr, email, phone, String.valueOf(rowNumber) });
                }
            }

            // OPTIMIZATION: Targeted batch query - only check codes/emails from the file
            Set<String> codesInFile = rawRows.stream().map(r -> r[1].toLowerCase()).filter(c -> !c.isEmpty())
                    .collect(Collectors.toSet());
            Set<String> emailsInFile = rawRows.stream().map(r -> r[4].toLowerCase()).filter(e -> !e.isEmpty())
                    .collect(Collectors.toSet());

            Set<String> existingCodes = codesInFile.isEmpty() ? Collections.emptySet()
                    : userRepository.findByCodeInIgnoreCase(codesInFile).stream()
                            .map(u -> u.getCode().toLowerCase()).collect(Collectors.toSet());
            Set<String> existingEmails = emailsInFile.isEmpty() ? Collections.emptySet()
                    : userRepository.findByEmailInIgnoreCase(emailsInFile).stream()
                            .map(u -> u.getEmail().toLowerCase()).collect(Collectors.toSet());

            Set<String> seenCodes = new HashSet<>();
            Set<String> seenEmails = new HashSet<>();

            // Build preview rows (pure in-memory, no DB calls)
            for (String[] row : rawRows) {
                String fullName = row[0], code = row[1], roleStr = row[2], dobStr = row[3], email = row[4],
                        phone = row[5];
                int rowNumber = Integer.parseInt(row[6]);

                totalRows++;
                StringBuilder errorMsg = new StringBuilder();
                String status = "valid";

                if (code.isEmpty()) {
                    errorMsg.append("Thiếu mã số. ");
                    status = "error";
                } else if (seenCodes.contains(code.toLowerCase())) {
                    errorMsg.append("Mã số trùng lặp trong file. ");
                    status = "error";
                } else if (existingCodes.contains(code.toLowerCase())) {
                    errorMsg.append("Mã số đã tồn tại. ");
                    status = "error";
                }

                if (email.isEmpty()) {
                    errorMsg.append("Thiếu email. ");
                    status = "error";
                } else if (seenEmails.contains(email.toLowerCase())) {
                    errorMsg.append("Email trùng lặp trong file. ");
                    status = "error";
                } else if (existingEmails.contains(email.toLowerCase())) {
                    errorMsg.append("Email đã tồn tại. ");
                    status = "error";
                }

                if (!dobStr.isEmpty()) {
                    try {
                        LocalDate.parse(dobStr, DOB_FORMATTER);
                    } catch (Exception e) {
                        errorMsg.append("Ngày sinh không hợp lệ. ");
                        status = "error";
                    }
                }

                if ("error".equals(status)) {
                    errorRows++;
                } else {
                    validRows++;
                    seenCodes.add(code.toLowerCase());
                    seenEmails.add(email.toLowerCase());
                }

                boolean hasImage = imageCodes.contains(code.toLowerCase());
                previewRows.add(com.fams.backend.dto.response.PreviewImportResponse.PreviewRow.builder()
                        .rowNumber(rowNumber)
                        .fullName(fullName)
                        .code(code)
                        .role(roleStr)
                        .dob(dobStr)
                        .email(email)
                        .phone(phone)
                        .hasImage(hasImage)
                        .status(status)
                        .errorMessage(errorMsg.length() > 0 ? errorMsg.toString().trim() : null)
                        .build());
            }

            if (errorRows > 0)
                validationMessages.add("Có " + errorRows + " dòng lỗi cần kiểm tra lại.");
            if (validRows > 0)
                validationMessages.add(validRows + " người dùng hợp lệ sẵn sàng import.");
            if (isZip)
                validationMessages.add("Tìm thấy " + imageCodes.size() + " ảnh trong file ZIP.");

            long elapsed = System.currentTimeMillis() - start;
            log.info("⚡ Preview completed in {}ms for {} rows", elapsed, totalRows);

            return com.fams.backend.dto.response.PreviewImportResponse.builder()
                    .totalRows(totalRows)
                    .validRows(validRows)
                    .errorRows(errorRows)
                    .previewData(previewRows)
                    .validationMessages(validationMessages)
                    .build();

        } catch (Exception e) {
            log.error("Error previewing import file", e);
            throw new BadRequestException("Lỗi khi xem trước file: " + e.getMessage());
        } finally {
            if (tempDir != null)
                cleanUpTempDir(tempDir);
        }
    }

    @Override
    public Object getActivationProgress(String username) {
        String key = com.fams.backend.service.impl.AsyncImportService.ACTIVATION_PROGRESS_PREFIX + username;
        String json = redisTemplate.opsForValue().get(key);
        if (json == null)
            return null;
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            log.error("Failed to parse activation progress from Redis", e);
            return null;
        }
    }

    @Override
    public byte[] downloadSampleFile() {
        try {
            // Priority 1: Direct path (more reliable in Docker volumes)
            Path directPath = Paths.get("src/main/resources/static/samples/user_import_sample.zip");
            if (Files.exists(directPath)) {
                return Files.readAllBytes(directPath);
            }

            // Priority 2: Classpath resource
            InputStream is = getClass().getResourceAsStream("/static/samples/user_import_sample.zip");
            if (is != null) {
                return is.readAllBytes();
            }

            throw new NotFoundException("Sample file not found");
        } catch (IOException e) {
            log.error("Failed to read sample file", e);
            throw new RuntimeException("Lỗi khi đọc file mẫu: " + e.getMessage());
        }
    }
}
