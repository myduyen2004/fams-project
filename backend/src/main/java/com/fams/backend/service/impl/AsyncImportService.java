package com.fams.backend.service.impl;

import com.fams.backend.dto.response.ImportJobResponse;
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

            sendJobNotification(username, job);

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

                job.setStatus(ImportJob.JobStatus.COMPLETED);
                job.setCompletedAt(LocalDateTime.now());
                log.info("Async import job {} completed successfully", jobId);
            } finally {
                cleanUpTempDir(tempDir);
            }

        } catch (Exception e) {
            log.error("Error processing async import job {}: {}", jobId, e.getMessage(), e);
            job.setStatus(ImportJob.JobStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
        } finally {
            importJobRepository.save(job);
            sendJobNotification(username, job);
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

            job.setTotalRecords(validRowData.size());
            importJobRepository.save(job);

            // Pre-hash passwords
            Set<String> uniquePasswords = validRowData.stream()
                    .map(data -> data.dob.format(PASSWORD_FORMATTER))
                    .collect(Collectors.toSet());
            for (String rawPassword : uniquePasswords) {
                passwordHashCache.computeIfAbsent(rawPassword, passwordEncoder::encode);
            }

            // Process with incremental saves
            AtomicInteger completed = new AtomicInteger(0);
            List<User> saveBuffer = Collections.synchronizedList(new ArrayList<>());
            final int BATCH_SIZE = 20;

            List<CompletableFuture<Void>> futures = validRowData.stream()
                    .map(data -> CompletableFuture.supplyAsync(() -> {
                        String avatarUrl = null;
                        User.FaceDataStatus faceStatus = User.FaceDataStatus.NOT_REGISTERED;
                        File imageFile = imageMap.get(data.code.toLowerCase());

                        if (imageFile != null) {
                            try {
                                byte[] content = Files.readAllBytes(imageFile.toPath());
                                avatarUrl = uploadService.uploadFile(createMultipartFile(imageFile.getName(), content));
                                faceStatus = User.FaceDataStatus.REGISTERED;
                            } catch (Exception ex) {
                                log.error("Failed to upload avatar for {}: {}", data.code, ex.getMessage());
                            }
                        }

                        return User.builder()
                                .fullName(data.fullName).code(data.code).username(data.code.toLowerCase())
                                .password(passwordHashCache.get(data.dob.format(PASSWORD_FORMATTER)))
                                .email(data.email).phone(data.phone).dob(data.dob)
                                .role(mapRole(data.roleStr)).status(User.UserStatus.INACTIVE)
                                .faceDataStatus(faceStatus).avatar(avatarUrl).build();
                    }, importExecutor).thenAccept(user -> {
                        saveBuffer.add(user);
                        int current = completed.incrementAndGet();

                        job.setProcessedRecords(current);
                        if (current % 5 == 0 || current == job.getTotalRecords()) {
                            importJobRepository.save(job);
                            sendJobNotification(username, job);
                        }

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
                            job.setSuccessCount(job.getSuccessCount() + toSave.size());
                            importJobRepository.save(job);
                        }
                    }))
                    .collect(Collectors.toList());

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            if (!saveBuffer.isEmpty()) {
                userRepository.saveAll(saveBuffer);
                job.setSuccessCount(job.getSuccessCount() + saveBuffer.size());
            }
        }
    }

    private void sendJobNotification(String username, ImportJob job) {
        ImportJobResponse response = ImportJobResponse.fromEntity(job);
        log.debug("Broadcasting progress for user {}: {}%", username, response.getPercentage());
        // Frontend listens on /topic/import-progress/{username}
        messagingTemplate.convertAndSend("/topic/import-progress/" + username, response);
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
}
