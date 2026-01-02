package com.fams.backend.service.impl;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.criteria.Predicate;

import java.time.format.DateTimeFormatter;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
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
    private final com.fams.backend.service.EmailService emailService;

    private static final DateTimeFormatter DOB_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter PASSWORD_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy");

    @Override
    public Page<UserResponse> getAllUsers(String search, String role, String status, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    User.UserStatus userStatus = User.UserStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), userStatus));
                } catch (Exception e) {
                    log.error("Invalid status filter: {}", status);
                }
            }

            if (role != null && !role.isEmpty() && !role.equalsIgnoreCase("all")) {
                try {
                    User.UserRole userRole = User.UserRole.valueOf(role.toUpperCase());
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
    public UserResponse getUserById(Long id) {
        return userRepository.findById(id)
                .map(UserResponse::fromUser)
                .orElseThrow(() -> new NotFoundException("User not found with id: " + id));
    }

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request, MultipartFile avatar) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã tồn tại");
        }
        if (userRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã số đã tồn tại");
        }

        // Upload avatar to cloud if present
        String avatarUrl = uploadService.uploadFile(avatar);

        // New flow: Initial users are INACTIVE and have NO username/password
        User user = User.builder()
                .code(request.getCode())
                .username(null) // No account yet
                .password(null) // No account yet
                .fullName(request.getFullName())
                .email(request.getEmail())
                .dob(request.getDob())
                .phone(request.getPhone())
                .role(request.getRole())
                .status(User.UserStatus.INACTIVE) // Initially inactive
                .avatar(avatarUrl)
                .faceDataStatus(avatarUrl != null ? User.FaceDataStatus.REGISTERED
                        : (request.getFaceDataStatus() != null ? request.getFaceDataStatus()
                                : User.FaceDataStatus.NOT_REGISTERED))
                .build();

        return UserResponse.fromUser(userRepository.save(user));
    }

    @Override
    @Transactional
    public void activateUsers(List<Long> ids) {
        log.info("Activating users: {}", ids);
        List<User> users = userRepository.findAllById(ids);
        for (User user : users) {
            if (user.getStatus() != User.UserStatus.ACTIVE) {
                // Generate username: same as code
                user.setUsername(user.getCode());

                // Generate password: [UnaccentedFirstName]@ddMMyyyy
                String unaccentedName = unaccent(
                        user.getFullName().split(" ")[user.getFullName().split(" ").length - 1]);
                String dobStr = user.getDob().format(PASSWORD_FORMATTER);
                String rawPassword = unaccentedName + "@" + dobStr;

                user.setPassword(passwordEncoder.encode(rawPassword));
                user.setStatus(User.UserStatus.ACTIVE);
                user.setIsPasswordChanged(false);

                // Send email
                emailService.sendAccountInfo(user.getEmail(), user.getFullName(), user.getUsername(), rawPassword);
            }
        }
        userRepository.saveAll(users);
        log.info("Activated {} users successfully", users.size());
        log.info("Activated {} users successfully", users.size());
    }

    @Override
    @Transactional
    public void changePassword(String username, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found: " + username));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setIsPasswordChanged(true);
        userRepository.save(user);
    }

    private String unaccent(String src) {
        if (src == null)
            return "";
        String nfdNormalizedString = java.text.Normalizer.normalize(src, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(nfdNormalizedString).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserRequest request, MultipartFile avatar) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found with id: " + id));

        // Check unique fields if changed
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

        // Upload new avatar if present
        if (avatar != null && !avatar.isEmpty()) {
            String avatarUrl = uploadService.uploadFile(avatar);
            user.setAvatar(avatarUrl);
            user.setFaceDataStatus(User.FaceDataStatus.REGISTERED);
        }

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setDob(request.getDob());
        user.setRole(request.getRole());
        user.setStatus(request.getStatus());

        if (request.getFaceDataStatus() != null) {
            // Only update if not already set by avatar upload in this call
            if (avatar == null || avatar.isEmpty()) {
                user.setFaceDataStatus(request.getFaceDataStatus());
            }
        }

        return UserResponse.fromUser(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void importUsers(MultipartFile file) {
        log.info("Importing users from file: {}", file.getOriginalFilename());
        Path tempDir = null;
        try {
            // Create temp directory to unzip
            tempDir = Files.createTempDirectory("user_import_");
            List<File> imageFiles = new ArrayList<>();
            File excelFile = null;

            // Unzip file
            try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
                ZipEntry zipEntry = zis.getNextEntry();
                while (zipEntry != null) {
                    File newFile = new File(tempDir.toFile(), zipEntry.getName());
                    if (zipEntry.isDirectory()) {
                        if (!newFile.isDirectory() && !newFile.mkdirs()) {
                            throw new IOException("Failed to create directory " + newFile);
                        }
                    } else {
                        // Fix for Windows-created archives
                        File parent = newFile.getParentFile();
                        if (!parent.isDirectory() && !parent.mkdirs()) {
                            throw new IOException("Failed to create directory " + parent);
                        }

                        // Write file content
                        Files.copy(zis, newFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

                        String fileName = newFile.getName().toLowerCase();
                        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
                            excelFile = newFile;
                        } else if (fileName.endsWith(".jpg") || fileName.endsWith(".png")
                                || fileName.endsWith(".jpeg")) {
                            imageFiles.add(newFile);
                        }
                    }
                    zipEntry = zis.getNextEntry();
                }
            }

            if (excelFile == null) {
                // Try parsing as direct Excel upload if not zip or no excel found in zip
                if (file.getOriginalFilename() != null && (file.getOriginalFilename().endsWith(".xlsx")
                        || file.getOriginalFilename().endsWith(".xls"))) {
                    processExcelImport(file.getInputStream(), Collections.emptyMap());
                    return;
                }
                throw new BadRequestException("Không tìm thấy file Excel trong file tải lên");
            }

            // Map images by filename (without extension) -> User Code
            Map<String, File> imageMap = new HashMap<>(); // key: code (lowercase), value: file
            for (File img : imageFiles) {
                String name = img.getName();
                String code = name.substring(0, name.lastIndexOf('.')).toLowerCase();
                imageMap.put(code, img);
            }

            try (InputStream is = new FileInputStream(excelFile)) {
                processExcelImport(is, imageMap);
            }

        } catch (Exception e) {
            log.error("Failed to import users", e);
            throw new BadRequestException("Lỗi khi xử lý file import: " + e.getMessage());
        } finally {
            // Cleanup temp dir
            if (tempDir != null) {
                try (Stream<Path> walk = Files.walk(tempDir)) {
                    walk.sorted(Comparator.reverseOrder())
                            .map(Path::toFile)
                            .forEach(File::delete);
                } catch (IOException e) {
                    log.warn("Failed to clean up temp dir: {}", tempDir);
                }
            }
        }
    }

    private void processExcelImport(InputStream is, Map<String, File> imageMap) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            List<User> usersToSave = new ArrayList<>();
            int rowNumber = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();

                // Skip header
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                String fullName = getCellValue(currentRow.getCell(0));
                String code = getCellValue(currentRow.getCell(1));
                String roleStr = getCellValue(currentRow.getCell(2));
                String dobStr = getCellValue(currentRow.getCell(3));
                String email = getCellValue(currentRow.getCell(4));
                String phone = getCellValue(currentRow.getCell(5));

                if (code == null || code.isEmpty() || email == null || email.isEmpty()) {
                    continue;
                }

                if (userRepository.existsByCode(code) || userRepository.existsByEmail(email)) {
                    log.warn("User already exists: code={}, email={}", code, email);
                    continue;
                }

                LocalDate dob;
                try {
                    dob = LocalDate.parse(dobStr, DOB_FORMATTER);
                } catch (Exception e) {
                    log.error("Invalid DOB format at row {}: {}", rowNumber, dobStr);
                    continue;
                }

                String username = code.toLowerCase();
                String rawPassword = dob.format(PASSWORD_FORMATTER);

                String avatarUrl = null;
                User.FaceDataStatus faceStatus = User.FaceDataStatus.NOT_REGISTERED;

                // Check for image
                File imageFile = imageMap.get(code.toLowerCase());
                if (imageFile != null) {
                    try {
                        // Create MultipartFile from File for uploadService
                        // Since uploadService expects MultipartFile, we need a simple adapter or change
                        // uploadService to accept File/InputStream
                        // Re-using uploadService.uploadFile(MultipartFile) requires mocking or using
                        // specific implementation
                        // EASIER: Read bytes and mock, OR overload uploadService. Let's assume we can't
                        // easily change uploadService interface right now.
                        // We will use a MockMultipartFile equivalent or just implement a simple
                        // anonymous class.

                        // Wait, creating a MultipartFile from File in Spring context is verbose.
                        // Let's read bytes.
                        byte[] content = Files.readAllBytes(imageFile.toPath());
                        MultipartFile multipartFile = new MockMultipartFile(imageFile.getName(), imageFile.getName(),
                                "image/jpeg", content);
                        avatarUrl = uploadService.uploadFile(multipartFile);
                        faceStatus = User.FaceDataStatus.REGISTERED;
                    } catch (Exception ex) {
                        log.error("Failed to upload avatar for user {}: {}", code, ex.getMessage());
                    }
                }

                User user = User.builder()
                        .fullName(fullName)
                        .code(code)
                        .username(username)
                        .password(passwordEncoder.encode(rawPassword))
                        .email(email)
                        .phone(phone)
                        .dob(dob)
                        .role(mapRole(roleStr))
                        .status(User.UserStatus.INACTIVE)
                        .faceDataStatus(faceStatus)
                        .avatar(avatarUrl)
                        .build();

                usersToSave.add(user);
                rowNumber++;
            }

            if (!usersToSave.isEmpty()) {
                userRepository.saveAll(usersToSave);
                log.info("Imported {} users successfully", usersToSave.size());
            }
        }
    }

    // Simple MockMultipartFile implementation to avoid extra dependencies if
    // spring-test is not available at runtime or strict
    // We can define it as a static inner class or just use a helper
    private static class MockMultipartFile implements MultipartFile {
        private final String name;
        private final String originalFilename;
        private final String contentType;
        private final byte[] content;

        public MockMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
            this.name = name;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.content = content;
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
        public byte[] getBytes() throws IOException {
            return content;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(File dest) throws IOException, IllegalStateException {
            Files.write(dest.toPath(), content);
        }
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
}
