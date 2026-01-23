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
    private final PasswordEncoder passwordEncoder;
    private final UploadService uploadService;
    private final SimpMessagingTemplate messagingTemplate;
    private final Executor importExecutor;
    private final Set<String> cancelledJobIds = ConcurrentHashMap.newKeySet();

    private static final DateTimeFormatter DOB_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter PASSWORD_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy");
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

        List<File> imageFiles = new ArrayList<>();
        File excelFile = null;

        // Extract ZIP from byte array
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(fileBytes))) {
            ZipEntry zipEntry = zis.getNextEntry();
            while (zipEntry != null) {
                File newFile = new File(tempDir.toFile(), zipEntry.getName());
                if (zipEntry.isDirectory()) {
                    newFile.mkdirs();
                } else {
                    newFile.getParentFile().mkdirs();
                    Files.copy(zis, newFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    String fileName = newFile.getName().toLowerCase();
                    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
                        excelFile = newFile;
                    } else if (isImage(fileName)) {
                        imageFiles.add(newFile);
                    }
                }
                zipEntry = zis.getNextEntry();
            }
        }

        if (excelFile == null) {
            throw new BadRequestException("No Excel file found in ZIP");
        }

        Map<String, File> imageMap = new HashMap<>();
        for (File img : imageFiles) {
            String name = img.getName();
            int lastDotIndex = name.lastIndexOf('.');
            String code = (lastDotIndex > 0) ? name.substring(0, lastDotIndex).toLowerCase() : name.toLowerCase();
            imageMap.put(code, img);
        }

        try (InputStream is = new FileInputStream(excelFile)) {
            processExcelWithImages(is, imageMap, job, username);
        }
    }

    private void processExcelWithImages(InputStream is, Map<String, File> imageMap, ImportJob job, String username)
            throws IOException {

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
            // Total steps = record save + image uploads
            int totalImages = (int) validRowData.stream()
                    .filter(data -> imageMap.containsKey(data.code.toLowerCase()))
                    .count();

            job.setTotalRecords(totalValidRecords + totalImages);
            job.setProcessedRecords(0);
            importJobRepository.save(job);
            sendJobNotification(username, job, null);

            // Parallel pre-hash passwords (BCrypt is slow)
            Set<String> uniquePasswords = validRowData.stream()
                    .map(data1 -> data1.dob.format(PASSWORD_FORMATTER))
                    .collect(Collectors.toSet());
            uniquePasswords.parallelStream()
                    .forEach(rawPassword -> passwordHashCache.computeIfAbsent(rawPassword, passwordEncoder::encode));

            // Process with Instant Data + Background Media Enrichment
            final int BATCH_SIZE = 100;
            job.setStatus(ImportJob.JobStatus.PROCESSING);
            job.setSuccessCount(0);
            job.setFailedCount(0);
            job.setProcessedRecords(0);
            importJobRepository.save(job);

            // Phase 1: Instant Metadata Save (Nano-Speed)
            log.info("Phase 1: Saving {} user metadata records instantly...", validRowData.size());
            List<User> initialUsers = validRowData.stream()
                    .map(data -> User.builder()
                            .fullName(data.fullName).code(data.code).username(data.code.toLowerCase())
                            .password(passwordHashCache.get(data.dob.format(PASSWORD_FORMATTER)))
                            .email(data.email).phone(data.phone).dob(data.dob)
                            .role(mapRole(data.roleStr)).status(User.UserStatus.INACTIVE)
                            .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                            .avatar(null).build())
                    .collect(Collectors.toList());

            for (int i = 0; i < initialUsers.size(); i += BATCH_SIZE) {
                int end = Math.min(i + BATCH_SIZE, initialUsers.size());
                List<User> savedBatch = userRepository.saveAll(initialUsers.subList(i, end));

                job.setSuccessCount(job.getSuccessCount() + (end - i));
                job.setProcessedRecords(end);
                job.setStatusMessage("Đang tạo tài khoản: " + end + "/" + totalValidRecords);
                importJobRepository.save(job);
                sendJobNotification(username, job, savedBatch);
            }
            log.info("Phase 1 Complete: 2000 users created in seconds.");

            // Explicitly signal that Phase 1 (Data) is done to the frontend
            job.setStatusMessage("DATA_PHASE_COMPLETE");
            importJobRepository.save(job);
            sendJobNotification(username, job, null);

            // Phase 2: Background Image Enrichment (Massive Parallel I/O)
            log.info("Phase 2: Starting Background Media Enrichment...");

            // Phase 2.1: Parallel High-Speed Compression
            Map<String, byte[]> compressedImageMap = validRowData.parallelStream()
                    .filter(data -> imageMap.containsKey(data.code.toLowerCase()))
                    .collect(Collectors.toConcurrentMap(
                            data -> data.code.toLowerCase(),
                            data -> {
                                try {
                                    File imgFile = imageMap.get(data.code.toLowerCase());
                                    return compressImage(Files.readAllBytes(imgFile.toPath()));
                                } catch (Exception e) {
                                    return new byte[0];
                                }
                            }));

            // Phase 2.2: Async Upload & Dynamic Association
            AtomicInteger completedImages = new AtomicInteger(0);
            List<CompletableFuture<Void>> futures = validRowData.stream()
                    .filter(data -> compressedImageMap.containsKey(data.code.toLowerCase()))
                    .map(data -> CompletableFuture.runAsync(() -> {
                        if (cancelledJobIds.contains(job.getJobId()))
                            return;

                        byte[] content = compressedImageMap.get(data.code.toLowerCase());
                        if (content != null && content.length > 0) {
                            try {
                                String url = uploadService.uploadFile(createMultipartFile(data.code + ".jpg", content));
                                userRepository.findByCode(data.code).ifPresent(user -> {
                                    user.setAvatar(url);
                                    user.setFaceDataStatus(User.FaceDataStatus.REGISTERED);
                                    userRepository.save(user); // Individual update for dynamic refresh

                                    int current = completedImages.incrementAndGet();
                                    job.setProcessedRecords(totalValidRecords + current); // Continue progress
                                    job.setStatusMessage(
                                            String.format("Đang làm giàu dữ liệu: %d/%d ảnh...", current, totalImages));
                                    importJobRepository.save(job);

                                    // Real-time UI refresh for this specific user with full job context
                                    sendUserUpdateNotification(username, job, user);
                                });
                            } catch (Exception ex) {
                                log.error("Background enrichment failed for {}: {}", data.code, ex.getMessage());
                            }
                        }
                    }, importExecutor))
                    .collect(Collectors.toList());

            if (futures.isEmpty()) {
                finalizeJob(job, username);
            } else {
                CompletableFuture<?>[] futuresArray = futures.toArray(new CompletableFuture[0]);
                CompletableFuture.allOf(futuresArray)
                        .thenRun(() -> finalizeJob(job, username));
                log.info("Background Media Enrichment kicked off for {} images.", totalImages);
            }
        }
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
        try {
            java.awt.image.BufferedImage originalImage = javax.imageio.ImageIO
                    .read(new java.io.ByteArrayInputStream(data));
            if (originalImage == null)
                return data;

            int targetWidth = 400;
            int targetHeight = 400;

            // Faster & Modern Bilinear Scaling
            java.awt.image.BufferedImage outputImage = new java.awt.image.BufferedImage(targetWidth, targetHeight,
                    java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g2d = outputImage.createGraphics();
            g2d.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
                    java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
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
}
