package com.fams.backend.service.impl;

import com.fams.backend.dto.response.ImportJobResponse;
import com.fams.backend.dto.response.UserResponse;
import com.fams.backend.entity.ImportJob;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.ImportJobRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
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
public class AsyncImportService {

    private final ImportJobRepository importJobRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final UploadService uploadService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Executor importExecutor;
    private final EmailQueueService emailQueueService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Set<String> cancelledJobIds = ConcurrentHashMap.newKeySet();

    public static final String ACTIVATION_PROGRESS_PREFIX = "fams:activation:progress:";
    public static final long CACHE_TTL_SECONDS = 3600; // 1 hour

    private static final DateTimeFormatter DOB_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter PASSWORD_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy");
    private static final java.util.regex.Pattern DIACRITICS_PATTERN = java.util.regex.Pattern
            .compile("\\p{InCombiningDiacriticalMarks}+");
    private final Map<String, String> passwordHashCache = new ConcurrentHashMap<>();

    @Async("asyncImportExecutor")
    public void processZipImportAsync(String jobId, byte[] fileBytes, String filename, String importMode,
            String username) {
        ImportJob job = importJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new NotFoundException("Job not found"));

        try {
            job.setStatus(ImportJob.JobStatus.PROCESSING);
            job.setStartedAt(LocalDateTime.now());
            importJobRepository.save(job);

            sendJobNotification(username, job, null);

            if ("REPLACE".equalsIgnoreCase(importMode)) {
                log.info(
                        "REPLACE mode selected (ZIP). Deleting all INACTIVE STUDENT and LECTURER users before import.");
                userRepository.deleteAllByRoleInAndStatus(Arrays.asList(User.UserRole.STUDENT, User.UserRole.LECTURER),
                        User.UserStatus.INACTIVE);
            }

            // Extract and process ZIP
            Path tempDir = Files.createTempDirectory("async_import_");
            try {
                processZipFile(fileBytes, filename, tempDir, job, username, importMode);
                log.info("Initial ZIP processing done for job {}. Background enrichment continues.", jobId);
            } finally {
                cancelledJobIds.remove(jobId);
                cleanUpTempDir(tempDir);
            }

        } catch (Exception e) {
            log.error("Error processing async import job {}: {}", jobId, e.getMessage(), e);
            job.setStatus(ImportJob.JobStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            importJobRepository.save(job); // Save job status before sending final notification
            sendJobNotification(username, job, null); // Send final notification for failure
        }
    }

    private void processZipFile(byte[] fileBytes, String filename, Path tempDir, ImportJob job, String username,
            String importMode)
            throws IOException {

        long extractStart = System.currentTimeMillis();
        Map<String, byte[]> imageDataMap = new HashMap<>();
        byte[] excelBytes = null;

        // OPTIMIZATION: Extract ZIP 100% in-memory — ZERO disk I/O for images
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(fileBytes))) {
            ZipEntry zipEntry;
            while ((zipEntry = zis.getNextEntry()) != null) {
                if (zipEntry.isDirectory())
                    continue;

                String entryName = zipEntry.getName().toLowerCase();
                String baseName = entryName.contains("/") ? entryName.substring(entryName.lastIndexOf("/") + 1)
                        : entryName;

                if (baseName.endsWith(".xlsx") || baseName.endsWith(".xls")) {
                    // Read Excel into memory
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    zis.transferTo(baos);
                    excelBytes = baos.toByteArray();
                } else if (isImage(baseName)) {
                    // Read image into memory — NO disk write
                    String code = baseName.contains(".")
                            ? baseName.substring(0, baseName.lastIndexOf(".")).toLowerCase()
                            : baseName.toLowerCase();
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    zis.transferTo(baos);
                    imageDataMap.put(code, baos.toByteArray());
                }
            }
        }

        if (excelBytes == null) {
            throw new BadRequestException("No Excel file found in ZIP");
        }

        long extractElapsed = System.currentTimeMillis() - extractStart;
        log.info("⚡ ZIP extracted in-memory: {} images + Excel in {}ms (ZERO disk I/O)",
                imageDataMap.size(), extractElapsed);

        try (InputStream is = new ByteArrayInputStream(excelBytes)) {
            processExcelWithImages(is, imageDataMap, job, username);
        }
    }

    // Pre-computed placeholder password hash (INACTIVE users can't login anyway)
    // Real password is set during activation phase
    private static final String PLACEHOLDER_PASSWORD_HASH = "$2a$10$PLACEHOLDER_IMPORT_HASH_DO_NOT_USE_FOR_LOGIN";

    private void processExcelWithImages(InputStream is, Map<String, byte[]> imageDataMap, ImportJob job,
            String username)
            throws IOException {

        long methodStart = System.currentTimeMillis();

        try (Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            List<ImportRowData> validRowData = new ArrayList<>();
            int rowNumber = 0;

            Set<String> existingCodes = userRepository.findAllCodes().stream()
                    .map(String::toLowerCase).collect(Collectors.toSet());
            Set<String> existingEmails = userRepository.findAllEmails().stream()
                    .map(String::toLowerCase).collect(Collectors.toSet());

            // Parse and validate
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

                if (code.isEmpty() || email.isEmpty())
                    continue;

                if (existingCodes.contains(code.toLowerCase())) {
                    job.setFailedCount(job.getFailedCount() + 1);
                    String error = "Dòng " + (rowNumber) + ": Mã số [" + code + "] đã tồn tại trong hệ thống.";
                    job.setErrorMessage(job.getErrorMessage() == null ? error : job.getErrorMessage() + "\n" + error);
                    continue;
                }
                if (existingEmails.contains(email.toLowerCase())) {
                    job.setFailedCount(job.getFailedCount() + 1);
                    String error = "Dòng " + (rowNumber) + ": Email [" + email + "] đã tồn tại trong hệ thống.";
                    job.setErrorMessage(job.getErrorMessage() == null ? error : job.getErrorMessage() + "\n" + error);
                    continue;
                }

                try {
                    LocalDate dob = LocalDate.parse(dobStr, DOB_FORMATTER);
                    validRowData.add(new ImportRowData(fullName, code, roleStr, dob, email, phone));
                } catch (Exception e) {
                    job.setFailedCount(job.getFailedCount() + 1);
                    String error = "Dòng " + (rowNumber) + ": Ngày sinh [" + dobStr
                            + "] không hợp lệ (định dạng đúng: dd/mm/yyyy).";
                    job.setErrorMessage(job.getErrorMessage() == null ? error : job.getErrorMessage() + "\n" + error);
                    log.warn("Invalid date format for user {}: {}", code, dobStr);
                }
            }

            int totalValidRecords = validRowData.size();
            int totalImages = (int) validRowData.stream()
                    .filter(data -> imageDataMap.containsKey(data.code.toLowerCase()))
                    .count();

            job.setTotalRecords(totalValidRecords + totalImages);
            job.setProcessedRecords(0);
            job.setStatus(ImportJob.JobStatus.PROCESSING);
            job.setSuccessCount(0);
            job.setFailedCount(0);
            importJobRepository.save(job);
            sendJobNotification(username, job, null);

            // ==========================================
            // PHASE 1: LIGHTNING-SPEED METADATA INSERT
            // ==========================================
            long phase1Start = System.currentTimeMillis();
            log.info("⚡ Phase 1: LIGHTNING INSERT {} users (BCrypt DEFERRED)...", totalValidRecords);

            List<User> initialUsers = validRowData.stream()
                    .map(data -> User.builder()
                            .fullName(data.fullName).code(data.code).username(data.code.toLowerCase())
                            .password(PLACEHOLDER_PASSWORD_HASH)
                            .email(data.email).phone(data.phone).dob(data.dob)
                            .role(mapRole(data.roleStr)).status(User.UserStatus.INACTIVE)
                            .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                            .avatar(null).build())
                    .collect(Collectors.toList());

            bulkInsertUsers(initialUsers);

            long phase1Elapsed = System.currentTimeMillis() - phase1Start;
            log.info("⚡ Phase 1 DONE: {} users in {}ms", totalValidRecords, phase1Elapsed);

            job.setSuccessCount(totalValidRecords);
            job.setProcessedRecords(totalValidRecords);
            job.setStatusMessage("DATA_PHASE_COMPLETE");
            importJobRepository.save(job);

            // REAL-TIME: Fetch inserted users and send to frontend immediately
            List<String> insertedCodes = validRowData.stream()
                    .map(d -> d.code.toLowerCase()).collect(Collectors.toList());
            List<User> insertedUsers = userRepository.findByCodeInIgnoreCase(insertedCodes);
            // Send in batches of 50 to avoid huge WebSocket messages
            for (int i = 0; i < insertedUsers.size(); i += 50) {
                List<User> batch = insertedUsers.subList(i, Math.min(i + 50, insertedUsers.size()));
                sendJobNotification(username, job, batch);
            }
            log.info("⚡ Sent {} users to frontend in real-time", insertedUsers.size());

            // ==========================================
            // PHASE 2: VIRTUAL-THREAD IMAGE ENRICHMENT
            // ==========================================
            if (totalImages == 0) {
                long totalElapsed = System.currentTimeMillis() - methodStart;
                log.info("🏁 TOTAL IMPORT TIME: {}ms for {} users (no images)", totalElapsed, totalValidRecords);
                finalizeJob(job, username);
                return;
            }

            log.info("⚡ Phase 2: {} images via Virtual Threads → 'fams_users/avatars'...", totalImages);

            // OPTIMIZATION: Compress in-memory byte arrays directly — NO disk read
            Map<String, byte[]> compressedImageMap = validRowData.parallelStream()
                    .filter(data -> imageDataMap.containsKey(data.code.toLowerCase()))
                    .collect(Collectors.toConcurrentMap(
                            data -> data.code.toLowerCase(),
                            data -> {
                                try {
                                    byte[] raw = imageDataMap.get(data.code.toLowerCase());
                                    return compressImage(raw);
                                } catch (Exception e) {
                                    return new byte[0];
                                }
                            }));

            // Free original uncompressed images from memory
            imageDataMap.clear();

            // Virtual Threads for unlimited I/O concurrency
            java.util.concurrent.ExecutorService virtualExecutor = java.util.concurrent.Executors
                    .newVirtualThreadPerTaskExecutor();
            AtomicInteger completedImages = new AtomicInteger(0);
            Map<String, String> avatarUrlMap = new ConcurrentHashMap<>();

            // Throttle with semaphore to avoid overwhelming Cloudinary API
            java.util.concurrent.Semaphore uploadSemaphore = new java.util.concurrent.Semaphore(50);

            List<CompletableFuture<Void>> futures = validRowData.stream()
                    .filter(data -> compressedImageMap.containsKey(data.code.toLowerCase()))
                    .map(data -> CompletableFuture.runAsync(() -> {
                        if (cancelledJobIds.contains(job.getJobId()))
                            return;

                        byte[] content = compressedImageMap.get(data.code.toLowerCase());
                        if (content != null && content.length > 0) {
                            try {
                                String url = null;
                                uploadSemaphore.acquire();
                                try {
                                    url = uploadService.uploadFile(
                                            createMultipartFile(data.code + ".jpg", content),
                                            "fams_users/avatars");
                                    if (url != null) {
                                        avatarUrlMap.put(data.code, url);
                                    }
                                } finally {
                                    uploadSemaphore.release();
                                }

                                int current = completedImages.incrementAndGet();
                                if (current % 5 == 0 || current == totalImages) {
                                    job.setProcessedRecords(totalValidRecords + current);
                                    job.setStatusMessage(
                                            String.format("Đang tải ảnh: %d/%d...", current, totalImages));
                                    importJobRepository.save(job);
                                    sendJobNotification(username, job, null);
                                }

                                // REAL-TIME: Send individual avatar update to frontend
                                if (url != null) {
                                    final String avatarUrl = url;
                                    userRepository.findByCodeIgnoreCase(data.code).ifPresent(u -> {
                                        u.setAvatar(avatarUrl);
                                        sendJobNotification(username, job, List.of(u));
                                    });
                                }
                            } catch (Exception ex) {
                                log.error("Upload failed for {}: {}", data.code, ex.getMessage());
                            }
                        }
                    }, virtualExecutor))
                    .collect(Collectors.toList());

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                    .thenRun(() -> {
                        try {
                            if (!avatarUrlMap.isEmpty()) {
                                bulkUpdateAvatars(avatarUrlMap);
                            }
                            long totalElapsed = System.currentTimeMillis() - methodStart;
                            log.info("🏁 TOTAL IMPORT TIME: {}ms for {} users + {} images",
                                    totalElapsed, totalValidRecords, totalImages);
                        } catch (Exception e) {
                            log.error("Error during Phase 2 finalization: {}", e.getMessage(), e);
                        } finally {
                            // ALWAYS finalize — never leave job stuck as PROCESSING
                            try {
                                virtualExecutor.close();
                            } catch (Exception ignored) {
                            }
                            finalizeJob(job, username);
                        }
                    })
                    .exceptionally(ex -> {
                        log.error("Phase 2 CompletableFuture failed: {}", ex.getMessage(), ex);
                        // Safety net: finalize job even if thenRun itself throws
                        finalizeJob(job, username);
                        return null;
                    });

            log.info("⚡ Phase 2 kicked off: {} images on Virtual Threads (50 concurrent max).", totalImages);
        }
    }

    @Async("asyncImportExecutor")
    public void activateAllUsersAsync(String adminUsername) {
        String topic = "/topic/activation-progress/" + adminUsername;
        log.info("Starting Extreme Optimized Background Activation Job for: {}", adminUsername);

        List<User> inactiveUsers = userRepository.findByStatusOrderByIdDesc(User.UserStatus.INACTIVE);
        if (inactiveUsers.isEmpty()) {
            sendActivationProgressWithPercentage(topic, "COMPLETED", 0, 0, "Không còn tài khoản chờ kích hoạt", null,
                    100);
            return;
        }

        int total = inactiveUsers.size();
        sendActivationProgressWithPercentage(topic, "STARTED", 0, total,
                String.format("Phát hiện %d tài khoản chờ kích hoạt...", total), null, 0);

        // PHASE 1: Extreme Parallel Hashing (Preparation - 10% of bar)
        Map<String, List<User>> usersByPassword = inactiveUsers.parallelStream().collect(Collectors.groupingBy(user -> {
            String fullName = user.getFullName() != null ? user.getFullName().trim() : "";
            int lastSpace = fullName.lastIndexOf(' ');
            String lastWord = (lastSpace >= 0) ? fullName.substring(lastSpace + 1) : fullName;
            String unaccentedName = unaccent(lastWord).toLowerCase();
            String dobPart = user.getDob() != null ? user.getDob().format(PASSWORD_FORMATTER) : "01012000";
            return unaccentedName + "@" + dobPart;
        }));

        AtomicInteger uniqueHashed = new AtomicInteger(0);
        int totalUnique = usersByPassword.size();

        usersByPassword.entrySet().parallelStream().forEach(entry -> {
            try {
                String hashedPassword = getHashedPassword(entry.getKey());
                for (User user : entry.getValue()) {
                    user.setUsername(user.getCode());
                    user.setPassword(hashedPassword);
                    user.setStatus(User.UserStatus.ACTIVE);
                    user.setIsPasswordChanged(false);
                }
                int currentGroup = uniqueHashed.incrementAndGet();
                if (currentGroup % 20 == 0 || currentGroup == totalUnique) {
                    int percentage = (int) ((double) currentGroup / totalUnique * 10);
                    // Keep 'current' at 0 during hashing phase as no users are committed yet
                    sendActivationProgressWithPercentage(topic, "HASHING", 0, total,
                            String.format("Đang chuẩn bị bảo mật cho %d nhóm tài khoản...", totalUnique), null, percentage);
                }
            } catch (Exception e) {
                log.error("Error during hashing for group {}: {}", entry.getKey(), e.getMessage());
            }
        });

        // PHASE 2: Concurrent Batch Activation & Concurrent Email Queuing (90% of bar)
        log.info("Phase 2: Concurrent batch processing via Virtual Threads...");
        final int BATCH_SIZE = 50;
        String activationJobId = "ACT_ALL_" + System.currentTimeMillis();
        AtomicInteger processedCount = new AtomicInteger(0);

        try (java.util.concurrent.ExecutorService virtualExecutor = java.util.concurrent.Executors
                .newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<Void>> futures = new ArrayList<>();

            for (int i = 0; i < inactiveUsers.size(); i += BATCH_SIZE) {
                final int start = i;
                final int end = Math.min(i + BATCH_SIZE, inactiveUsers.size());
                final List<User> batch = new ArrayList<>(inactiveUsers.subList(start, end));

                futures.add(CompletableFuture.runAsync(() -> {
                    try {
                        // Update Database
                        int updated = bulkActivateUsers(batch);
                        log.info("Activated batch of {} users (actually updated: {})", batch.size(), updated);

                        // Create and Push Email Tasks immediately
                        List<EmailQueueService.EmailTask> emailTasks = batch.stream().map(user -> {
                            String fullName = user.getFullName() != null ? user.getFullName().trim() : "";
                            int lastSpace = fullName.lastIndexOf(' ');
                            String lastWord = (lastSpace >= 0) ? fullName.substring(lastSpace + 1) : fullName;
                            String unaccentedName = unaccent(lastWord).toLowerCase();
                            String dobPart = user.getDob() != null ? user.getDob().format(PASSWORD_FORMATTER) : "01012000";
                            String rawPassword = unaccentedName + "@" + dobPart;
                            return new EmailQueueService.EmailTask(activationJobId, user.getEmail(), user.getFullName(),
                                    user.getUsername(), rawPassword);
                        }).collect(Collectors.toList());
                        emailQueueService.pushEmailTasks(emailTasks);

                        // Update Progress
                        int currentProcessed = processedCount.addAndGet(batch.size());
                        int percentage = 10 + (int) ((double) currentProcessed / total * 90);
                        List<Long> activatedIds = batch.stream().map(User::getId).collect(Collectors.toList());

                        sendActivationProgressWithPercentage(topic, "PROCESSING", currentProcessed, total,
                                String.format("Đang kích hoạt tài khoản: %d/%d", currentProcessed, total), activatedIds,
                                percentage);
                    } catch (Exception e) {
                        log.error("Error processing activation batch: {}", e.getMessage(), e);
                        sendActivationProgressWithPercentage(topic, "ERROR", processedCount.get(), total,
                                "Lỗi khi xử lý một số tài khoản: " + e.getMessage(), null, 0);
                    }
                }, virtualExecutor));
            }

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (Exception e) {
            log.error("Critical error in activation job: {}", e.getMessage(), e);
            sendActivationProgressWithPercentage(topic, "ERROR", processedCount.get(), total,
                    "Lỗi hệ thống khi kích hoạt tài khoản: " + e.getMessage(), null, 0);
            return;
        }

        // PHASE 3: Final Flush
        log.info("Final Phase: Cache eviction and completion notification.");
        try {
            java.util.Set<String> keys = redisTemplate.keys("users*");
            if (keys != null && !keys.isEmpty())
                redisTemplate.delete(keys);
        } catch (Exception ignored) {
        }

        sendActivationProgressWithPercentage(topic, "COMPLETED", total, total,
                "Đã kích hoạt toàn bộ " + total + " tài khoản thành công!", null, 100);
    }

    private void sendActivationProgress(String topic, String status, int current, int total, String message,
            List<Long> activatedUserIds) {
        sendActivationProgressWithPercentage(topic, status, current, total, message, activatedUserIds,
                total > 0 ? (int) ((double) current / total * 100) : 100);
    }

    private void sendActivationProgressWithPercentage(String topic, String status, int current, int total,
            String message, List<Long> activatedUserIds, int percentage) {
        Map<String, Object> progress = new HashMap<>();
        progress.put("status", status);
        progress.put("current", current);
        progress.put("total", total);
        progress.put("message", message);
        progress.put("percentage", percentage);
        if (activatedUserIds != null && !activatedUserIds.isEmpty()) {
            progress.put("activatedUserIds", activatedUserIds);
        }

        // Cache in Redis for cross-reload availability
        String username = topic.substring(topic.lastIndexOf('/') + 1);
        try {
            String json = objectMapper.writeValueAsString(progress);
            redisTemplate.opsForValue().set(ACTIVATION_PROGRESS_PREFIX + username, json,
                    java.time.Duration.ofSeconds(CACHE_TTL_SECONDS));
        } catch (Exception e) {
            log.error("Failed to cache activation progress: {}", e.getMessage());
        }

        messagingTemplate.convertAndSend(topic, progress);
    }

    private String getHashedPassword(String rawPassword) {
        return passwordHashCache.computeIfAbsent(rawPassword, passwordEncoder::encode);
    }

    private String unaccent(String src) {
        if (src == null)
            return "";
        String nfdNormalizedString = java.text.Normalizer.normalize(src, java.text.Normalizer.Form.NFD);
        return DIACRITICS_PATTERN.matcher(nfdNormalizedString).replaceAll("").replace('đ', 'd').replace('Đ',
                'D');
    }

    private void finalizeJob(ImportJob job, String username) {
        job.setStatus(ImportJob.JobStatus.COMPLETED);
        job.setStatusMessage("Import hoàn tất thành công! Đã cập nhật đầy đủ dữ liệu và ảnh.");
        job.setCompletedAt(LocalDateTime.now());
        importJobRepository.save(job);
        sendJobNotification(username, job, null);
        log.info("Async import job {} fully completed including enrichment", job.getJobId());
    }

    public void stopJob(String jobId) {
        cancelledJobIds.add(jobId);
        emailQueueService.cancelJobEmails(jobId);
        importJobRepository.findByJobId(jobId).ifPresent(job -> {
            job.setStatus(ImportJob.JobStatus.CANCELLED);
            job.setStatusMessage("Tiến trình đã bị dừng do đăng xuất.");
            job.setCompletedAt(LocalDateTime.now());
            importJobRepository.save(job);
            sendJobNotification(job.getCreatedBy(), job, null);
            log.info("Import job {} marked as CANCELLED", jobId);
        });
    }

    private void sendJobNotification(String username, ImportJob job, List<User> newUsers) {
        String destination = "/topic/import-progress/" + username;
        ImportJobResponse response = ImportJobResponse.fromEntity(job);
        if (newUsers != null && !newUsers.isEmpty()) {
            response.setNewUsers(newUsers.stream()
                    .map(UserResponse::fromUser)
                    .collect(java.util.stream.Collectors.toList()));
        }
        messagingTemplate.convertAndSend(destination, response);
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

    private MultipartFile createMultipartFile(String filename, byte[] content) {
        return new MockMultipartFile(filename, filename, "image/jpeg", content);
    }

    private static class MockMultipartFile implements MultipartFile {
        private final String name, originalFilename, contentType;
        private final byte[] content;

        MockMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
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
            return content.length == 0;
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

    private byte[] compressImage(byte[] data) {
        // OPTIMIZATION: Skip compression for small images (< 100KB)
        if (data.length < 100 * 1024) {
            return data;
        }

        try {
            java.awt.image.BufferedImage originalImage = javax.imageio.ImageIO
                    .read(new java.io.ByteArrayInputStream(data));
            if (originalImage == null)
                return data;

            // Skip if already small enough
            if (originalImage.getWidth() <= 400 && originalImage.getHeight() <= 400) {
                return data;
            }

            int targetWidth = 400;
            int targetHeight = 400;

            // NEAREST_NEIGHBOR is 10x faster than BILINEAR — good enough for 400x400
            // avatars
            java.awt.image.BufferedImage outputImage = new java.awt.image.BufferedImage(targetWidth, targetHeight,
                    java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g2d = outputImage.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
                    java.awt.RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_RENDERING, java.awt.RenderingHints.VALUE_RENDER_SPEED);
            g2d.drawImage(originalImage, 0, 0, targetWidth, targetHeight, null);
            g2d.dispose();

            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(outputImage, "jpg", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.warn("Image compression failed, using original: {}", e.getMessage());
            return data;
        }
    }

    private void sendUserUpdateNotification(String username, ImportJob job, User user) {
        String destination = "/topic/import-progress/" + username;
        ImportJobResponse response = ImportJobResponse.fromEntity(job);
        response.setStatusMessage("Đang làm giàu dữ liệu: " + user.getFullName());
        response.setNewUsers(Collections.singletonList(UserResponse.fromUser(user)));
        messagingTemplate.convertAndSend(destination, response);
    }

    /**
     * Ultra-fast bulk insertion using native JDBC batch update.
     * Bypasses Hibernate overhead for extreme speed.
     */
    private void bulkInsertUsers(List<User> users) {
        if (users.isEmpty())
            return;

        String sql = "INSERT INTO users (full_name, code, username, password, email, phone, dob, role, status, face_data_status, avatar, created_at, updated_at, is_password_changed) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        long start = System.currentTimeMillis();
        LocalDateTime now = LocalDateTime.now();

        jdbcTemplate.batchUpdate(sql, users, 500, (ps, user) -> {
            ps.setString(1, user.getFullName());
            ps.setString(2, user.getCode());
            ps.setString(3, user.getUsername());
            ps.setString(4, user.getPassword());
            ps.setString(5, user.getEmail());
            ps.setString(6, user.getPhone());
            ps.setObject(7, user.getDob());
            ps.setString(8, user.getRole().name());
            ps.setString(9, user.getStatus().name());
            ps.setString(10, user.getFaceDataStatus().name());
            ps.setString(11, user.getAvatar());
            ps.setObject(12, now);
            ps.setObject(13, now);
            ps.setBoolean(14, false);
        });

        long elapsed = System.currentTimeMillis() - start;
        log.info("JDBC Bulk Insert: {} users in {}ms", users.size(), elapsed);
    }

    /**
     * Ultra-fast bulk activation using native JDBC batch update.
     * Bypasses Hibernate overhead for extreme speed.
     */
    private int bulkActivateUsers(List<User> users) {
        if (users.isEmpty())
            return 0;

        String sql = "UPDATE users SET username = ?, password = ?, status = 'ACTIVE', is_password_changed = false WHERE id = ?";

        long start = System.currentTimeMillis();

        int[][] results = jdbcTemplate.batchUpdate(sql, users, 500, (ps, user) -> {
            ps.setString(1, user.getUsername());
            ps.setString(2, user.getPassword());
            ps.setLong(3, user.getId());
        });

        int totalUpdated = 0;
        for (int[] batch : results) {
            for (int r : batch) {
                totalUpdated += r;
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("JDBC Bulk Update: {} users in {}ms", totalUpdated, elapsed);

        return totalUpdated;
    }

    /**
     * Ultra-fast bulk avatar update using native JDBC.
     * Single batch UPDATE for all avatar URLs after Cloudinary uploads complete.
     */
    private void bulkUpdateAvatars(Map<String, String> codeToUrlMap) {
        if (codeToUrlMap.isEmpty())
            return;

        String sql = "UPDATE users SET avatar = ?, updated_at = ? WHERE code = ?";

        long start = System.currentTimeMillis();
        LocalDateTime now = LocalDateTime.now();

        List<Map.Entry<String, String>> entries = new ArrayList<>(codeToUrlMap.entrySet());
        jdbcTemplate.batchUpdate(sql, entries, 500, (ps, entry) -> {
            ps.setString(1, entry.getValue()); // avatar URL
            ps.setObject(2, now); // updated_at
            ps.setString(3, entry.getKey()); // code
        });

        long elapsed = System.currentTimeMillis() - start;
        log.info("JDBC Bulk Avatar Update: {} users in {}ms", codeToUrlMap.size(), elapsed);
    }
}
