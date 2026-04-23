package com.fams.backend.service.impl;

import com.fams.backend.dto.request.LecturerProfileRequest;
import com.fams.backend.dto.LecturerImportDTO;
import com.fams.backend.dto.response.LecturerResponse;
import com.fams.backend.entity.LecturerProfile;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.LecturerProfileRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.LecturerService;
import com.fams.backend.repository.MajorRepository;
import com.fams.backend.repository.SpecializationRepository;
import com.fams.backend.repository.UserSessionRepository;
import java.time.LocalDateTime;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LecturerServiceImpl implements LecturerService {

    private final UserRepository userRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final MajorRepository majorRepository;
    private final SpecializationRepository specializationRepository;
    private final UserSessionRepository userSessionRepository;
    private final SystemLogService systemLogService;


    @Override
    public Page<LecturerResponse> getAllLecturers(String search, String status, String department,
            String majorStr, String specializationStr, Boolean hasProfile, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by LECTURER role
            predicates.add(cb.equal(root.get("role"), User.UserRole.LECTURER));

            // ALWAYS exclude INACTIVE users
            predicates.add(cb.notEqual(root.get("status"), User.UserStatus.INACTIVE));

            // Filter by status (if provided, and not INACTIVE)
            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    User.UserStatus userStatus = User.UserStatus.valueOf(status.toUpperCase());
                    if (userStatus != User.UserStatus.INACTIVE) {
                        predicates.add(cb.equal(root.get("status"), userStatus));
                    } else {
                        predicates.add(cb.disjunction());
                    }
                } catch (Exception e) {
                    log.error("Invalid status filter: {}", status);
                }
            }

            // Search
            if (search != null && !search.isEmpty()) {
                String searchLower = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), searchLower),
                        cb.like(cb.lower(root.get("email")), searchLower),
                        cb.like(cb.lower(root.get("code")), searchLower)));
            }

            // Filter by hasProfile using subquery
            if (hasProfile != null) {
                var subquery = query.subquery(Long.class);
                var profileRoot = subquery.from(LecturerProfile.class);
                subquery.select(profileRoot.get("userId"));
                if (hasProfile) {
                    predicates.add(root.get("id").in(subquery));
                } else {
                    predicates.add(cb.not(root.get("id").in(subquery)));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> users = userRepository.findAll(spec, pageable);

        // Get all user IDs
        List<Long> userIds = users.getContent().stream()
                .map(User::getId)
                .collect(Collectors.toList());

        // Fetch profiles for these users
        Map<Long, LecturerProfile> profileMap = lecturerProfileRepository.findAllByUserIdIn(userIds)
                .stream()
                .collect(Collectors.toMap(LecturerProfile::getUserId, p -> p));

        // In-memory filter by department / major / specialization
        boolean hasDeptFilter = department != null && !department.isEmpty() && !department.equalsIgnoreCase("all");
        boolean hasMajorFilter = majorStr != null && !majorStr.isEmpty() && !majorStr.equalsIgnoreCase("all");
        boolean hasSpecFilter = specializationStr != null && !specializationStr.isEmpty() && !specializationStr.equalsIgnoreCase("all");

        if (hasDeptFilter || hasMajorFilter || hasSpecFilter) {
            List<User> filteredUsers = users.getContent().stream()
                    .filter(user -> {
                        LecturerProfile profile = profileMap.get(user.getId());
                        if (profile == null) return false;
                        if (hasDeptFilter && !department.equalsIgnoreCase(profile.getDepartment())) return false;
                        if (hasMajorFilter) {
                            if (profile.getMajor() == null || !majorStr.equalsIgnoreCase(profile.getMajor().getName())) return false;
                        }
                        if (hasSpecFilter) {
                            if (profile.getSpecialization() == null || !specializationStr.equalsIgnoreCase(profile.getSpecialization().getName())) return false;
                        }
                        return true;
                    })
                    .collect(Collectors.toList());

            return new org.springframework.data.domain.PageImpl<>(
                    filteredUsers.stream()
                            .map(user -> LecturerResponse.fromUserAndProfile(user, profileMap.get(user.getId())))
                            .collect(Collectors.toList()),
                    pageable,
                    filteredUsers.size());
        }

        List<LecturerResponse> content = users.getContent().stream()
                .map(user -> {
                    LecturerProfile profile = profileMap.get(user.getId());
                    return LecturerResponse.fromUserAndProfile(user, profile);
                })
                .collect(Collectors.toList());

        // Batch fetch last login times
        if (!userIds.isEmpty()) {
            Map<Long, LocalDateTime> lastLoginMap = userSessionRepository.findLatestLoginTimesByUserIds(userIds)
                    .stream()
                    .collect(Collectors.toMap(
                            row -> (Long) row[0],
                            row -> (LocalDateTime) row[1]
                    ));
            content.forEach(res -> res.setLastLogin(lastLoginMap.get(res.getId())));
        }

        return new org.springframework.data.domain.PageImpl<>(content, pageable, users.getTotalElements());
    }

    @Override
    public LecturerResponse getLecturerById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + id));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        LecturerProfile profile = lecturerProfileRepository.findByUser(user).orElse(null);
        LecturerResponse response = LecturerResponse.fromUserAndProfile(user, profile);

        // Fetch last login
        userSessionRepository.findTopByUserIdOrderByLoginTimeDesc(id)
                .ifPresent(session -> response.setLastLogin(session.getLoginTime()));

        return response;
    }

    @Override
    public List<String> getAllDepartments() {
        return lecturerProfileRepository.findAll().stream()
                .map(LecturerProfile::getDepartment)
                .filter(d -> d != null && !d.isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public void deleteLecturer(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + id));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        // Delete profile first if exists
        lecturerProfileRepository.findByUser(user).ifPresent(lecturerProfileRepository::delete);
        String code = user.getCode();
        // Delete user
        userRepository.deleteById(id);
        log.info("Deleted lecturer with ID: {}", id);
        systemLogService.logLecturerDeleted(code);
    }

    @Override
    @Transactional
    public void deleteLecturers(List<Long> ids) {
        for (Long id : ids) {
            try {
                deleteLecturer(id);
            } catch (Exception e) {
                log.error("Failed to delete lecturer with ID: {}", id, e);
            }
        }
        systemLogService.logLecturersDeleted(ids.size());
    }

    @Override
    @Transactional
    public LecturerResponse registerLecturerProfile(Long userId, LecturerProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + userId));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        // Check if profile already exists
        if (lecturerProfileRepository.existsById(userId)) {
            throw new IllegalStateException("Giảng viên này đã có thông tin profile");
        }

        // Create new profile
        LecturerProfile profile = LecturerProfile.builder()
                .user(user)
                .department(request.getDepartment())
                .expertise(request.getExpertise())
                .bio(request.getBio())
                .build();

        lecturerProfileRepository.save(profile);
        log.info("Registered profile for lecturer with ID: {}", userId);

        return LecturerResponse.fromUserAndProfile(user, profile);
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public LecturerResponse updateLecturer(Long id, com.fams.backend.dto.request.LecturerUpdateRequest request,
            MultipartFile avatar) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + id));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        LecturerProfile profile = lecturerProfileRepository.findByUser(user).orElse(null);
        log.info("Found existing profile: {}", profile != null);

        // Resolve Major
        com.fams.backend.entity.Major newMajor = null;
        if (request.getMajor() != null && !request.getMajor().trim().isEmpty()) {
            final String majorName = request.getMajor().trim();
            newMajor = majorRepository.findByName(majorName)
                    .orElseThrow(() -> new com.fams.backend.exception.BadRequestException(
                            "Ngành dạy không tồn tại: " + majorName));
        }

        // Resolve Specialization (must belong to Major)
        final com.fams.backend.entity.Major resolvedMajor = newMajor;
        com.fams.backend.entity.Specialization newSpec = null;
        if (request.getSpecialization() != null && !request.getSpecialization().trim().isEmpty()) {
            if (resolvedMajor == null) {
                throw new com.fams.backend.exception.BadRequestException("Phải chọn Ngành dạy trước khi chọn Chuyên ngành");
            }
            final String specName = request.getSpecialization().trim();
            newSpec = specializationRepository.findByNameAndMajor(specName, resolvedMajor)
                    .orElseThrow(() -> new com.fams.backend.exception.BadRequestException(
                            "Chuyên ngành '" + specName + "' không thuộc Ngành '" + resolvedMajor.getName() + "'"));
        }

        if (profile == null) {
            log.info("Creating new profile for user {}", user.getId());
            profile = LecturerProfile.builder()
                    .user(user)
                    .department(request.getDepartment())
                    .major(newMajor)
                    .specialization(newSpec)
                    .expertise(request.getExpertise())
                    .bio(request.getBio())
                    .build();
        } else {
            log.info("Updating existing profile for user {}", user.getId());
            if (request.getDepartment() != null) profile.setDepartment(request.getDepartment());
            if (newMajor != null || request.getMajor() != null) profile.setMajor(newMajor);
            if (newSpec != null || request.getSpecialization() != null) profile.setSpecialization(newSpec);
            if (request.getExpertise() != null) profile.setExpertise(request.getExpertise());
            if (request.getBio() != null) profile.setBio(request.getBio());
        }
        LecturerProfile savedProfile = lecturerProfileRepository.save(profile);
        log.info("Saved profile: id={}, major={}", savedProfile.getUserId(),
                savedProfile.getMajor() != null ? savedProfile.getMajor().getName() : "null");
        systemLogService.logLecturerUpdated(user.getCode(), user.getFullName());

        return LecturerResponse.fromUserAndProfile(user, savedProfile);
    }

    @Override
    public byte[] exportLecturers(String department, String majorStr, String specializationStr, String status) {
        try {
            org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách Giảng viên");

            // Style cho header
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_ORANGE.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            // Header row
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "STT",
                    "Mã giảng viên",
                    "Họ và tên",
                    "Email",
                    "Số điện thoại",
                    "Ngành dạy (Major)",
                    "Chuyên ngành (Specialization)",
                    "Chuyên môn (Expertise)",
                    "Tiểu sử (Bio)"
            };
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Get data
            List<User> users = userRepository.findAllLecturersWithProfiles();

            int rowNum = 1;
            for (User user : users) {
                if (status != null && !status.isEmpty() && !user.getStatus().name().equals(status)) {
                    continue;
                }
                LecturerProfile profile = user.getLecturerProfile();

                // Filter by department (legacy)
                if (department != null && !department.isEmpty()) {
                    if (profile == null || !department.equals(profile.getDepartment())) continue;
                }
                // Filter by major
                if (majorStr != null && !majorStr.isEmpty()) {
                    if (profile == null || profile.getMajor() == null ||
                            !majorStr.equalsIgnoreCase(profile.getMajor().getName())) continue;
                }
                // Filter by specialization
                if (specializationStr != null && !specializationStr.isEmpty()) {
                    if (profile == null || profile.getSpecialization() == null ||
                            !specializationStr.equalsIgnoreCase(profile.getSpecialization().getName())) continue;
                }

                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(rowNum - 1); // STT
                row.createCell(1).setCellValue(user.getCode() != null ? user.getCode() : "");
                row.createCell(2).setCellValue(user.getFullName() != null ? user.getFullName() : "");
                row.createCell(3).setCellValue(user.getEmail() != null ? user.getEmail() : "");
                row.createCell(4).setCellValue(user.getPhone() != null ? user.getPhone() : "");
                row.createCell(5).setCellValue(
                        profile != null && profile.getMajor() != null ? profile.getMajor().getName() : "");
                row.createCell(6).setCellValue(
                        profile != null && profile.getSpecialization() != null ? profile.getSpecialization().getName() : "");
                row.createCell(7).setCellValue(
                        profile != null && profile.getExpertise() != null ? profile.getExpertise() : "");
                row.createCell(8).setCellValue(
                        profile != null && profile.getBio() != null ? profile.getBio() : "");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            systemLogService.logLecturerExported();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error exporting lecturers", e);
            throw new RuntimeException("Lỗi khi xuất file Excel", e);
        }
    }

    @Override
    @Transactional
    public Map<String, Object> importLecturers(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;
        int failedCount = 0;

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            Set<String> seenCodes = new HashSet<>();
            int rowNumber = 0;

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                // Read cells theo cấu trúc file Excel:
                // A=STT, B=Mã GV, C=Họ tên, D=Email, E=SĐT, F=Department, G=Expertise, H=Tiểu
                // sử, I=Trạng thái, J=Profile
                // Chỉ đọc Mã GV (B) để tìm User, và update Department/Expertise/Bio
                // KHÔNG thay đổi thông tin cứng của User (code, email, fullName, phone, status)
                String code = getCellValueAsString(currentRow.getCell(1)); // Cột B - Mã GV
                String department = getCellValueAsString(currentRow.getCell(5)); // Cột F - Department
                String expertise = getCellValueAsString(currentRow.getCell(6)); // Cột G - Expertise
                String bio = getCellValueAsString(currentRow.getCell(7)); // Cột H - Tiểu sử

                // Skip empty rows
                if (code == null || code.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    errors.add("Dòng " + currentRowNum + ": Mã GV '" + code + "' bị trùng trong file");
                    failedCount++;
                    rowNumber++;
                    continue;
                }
                seenCodes.add(code.toLowerCase());

                // Find existing lecturer by code
                Optional<User> existingUserOpt = userRepository.findByCode(code);
                if (existingUserOpt.isEmpty()) {
                    errors.add("Dòng " + currentRowNum + ": Không tìm thấy giảng viên với mã '" + code + "'");
                    failedCount++;
                    rowNumber++;
                    continue;
                }

                User user = existingUserOpt.get();

                // Check if user is a lecturer
                if (user.getRole() != User.UserRole.LECTURER) {
                    errors.add("Dòng " + currentRowNum + ": Mã '" + code + "' không phải là giảng viên");
                    failedCount++;
                    rowNumber++;
                    continue;
                }

                try {
                    // Kiểm tra xem đã có profile chưa - tìm theo User object
                    Optional<LecturerProfile> existingProfile = lecturerProfileRepository.findByUser(user);

                    if (existingProfile.isPresent()) {
                        // UPDATE profile nếu đã có - chỉ update các field có giá trị trong file
                        LecturerProfile profile = existingProfile.get();
                        if (department != null && !department.trim().isEmpty()) {
                            profile.setDepartment(department.trim());
                        }
                        if (expertise != null && !expertise.trim().isEmpty()) {
                            profile.setExpertise(expertise.trim());
                        }
                        if (bio != null && !bio.trim().isEmpty()) {
                            profile.setBio(bio.trim());
                        }
                        lecturerProfileRepository.save(profile);
                        updatedCount++;
                        log.info("Updated profile for lecturer: {} - {}", code, user.getFullName());
                    } else {
                        // CREATE profile mới nếu chưa có
                        LecturerProfile profile = LecturerProfile.builder()
                                .user(user)
                                .department(department != null ? department.trim() : null)
                                .expertise(expertise != null ? expertise.trim() : null)
                                .bio(bio != null ? bio.trim() : null)
                                .build();
                        lecturerProfileRepository.save(profile);
                        createdCount++;
                        log.info("Created profile for lecturer: {} - {}", code, user.getFullName());
                    }
                } catch (Exception e) {
                    errors.add("Dòng " + currentRowNum + ": Lỗi khi xử lý profile: " + e.getMessage());
                    failedCount++;
                    log.error("Error processing profile for lecturer at row {}: {}", currentRowNum, e.getMessage());
                }

                rowNumber++;
            }

        } catch (Exception e) {
            log.error("Error processing import file", e);
            throw new RuntimeException("Lỗi khi xử lý file import: " + e.getMessage());
        }

        result.put("created", createdCount);
        result.put("updated", updatedCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        systemLogService.logLecturerImportCompleted(createdCount, updatedCount, failedCount);
        return result;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null)
            return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                double value = cell.getNumericCellValue();
                if (value == Math.floor(value)) {
                    return String.valueOf((long) value);
                }
                return String.valueOf(value);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return null;
        }
    }

    @Override
    public List<LecturerImportDTO> previewImportLecturers(MultipartFile file) {
        List<LecturerImportDTO> previewList = new ArrayList<>();

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            Set<String> seenCodes = new HashSet<>();

            // Pre-load major map for fast lookup: name(ignoreCase) -> Major
            Map<String, com.fams.backend.entity.Major> majorByName = majorRepository.findAll().stream()
                    .collect(Collectors.toMap(
                            m -> m.getName().trim().toLowerCase(),
                            m -> m,
                            (a, b) -> a));

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                // Columns:
                // B(1)=Mã GV, C(2)=Họ tên, D(3)=Email, E(4)=SĐT
                // F(5)=Ngành dạy, G(6)=Chuyên ngành, H(7)=Chuyên môn, I(8)=Tiểu sử
                String code        = getCellValueAsString(currentRow.getCell(1));
                String fullName    = getCellValueAsString(currentRow.getCell(2));
                String email       = getCellValueAsString(currentRow.getCell(3));
                String phone       = getCellValueAsString(currentRow.getCell(4));
                String majorName   = getCellValueAsString(currentRow.getCell(5));
                String specName    = getCellValueAsString(currentRow.getCell(6));
                String expertise   = getCellValueAsString(currentRow.getCell(7));
                String bio         = getCellValueAsString(currentRow.getCell(8));

                if (code == null || code.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                LecturerImportDTO dto = LecturerImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .code(code)
                        .major(majorName)
                        .specialization(specName)
                        .expertise(expertise)
                        .bio(bio)
                        .status("VALID")
                        .build();

                // Check duplicate in file
                if (seenCodes.contains(code.toLowerCase())) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã GV bị trùng trong file");
                } else {
                    seenCodes.add(code.toLowerCase());

                    // Validate User exists
                    Optional<User> userOpt = userRepository.findByCode(code);
                    if (userOpt.isEmpty()) {
                        dto.setStatus("ERROR");
                        dto.setErrorMessage("Không tìm thấy giảng viên");
                    } else {
                        User user = userOpt.get();
                        dto.setFullName(user.getFullName());
                        dto.setEmail(user.getEmail());
                        dto.setPhone(phone);

                        if (user.getRole() != User.UserRole.LECTURER) {
                            dto.setStatus("ERROR");
                            dto.setErrorMessage("Không phải là giảng viên");
                        } else {
                            StringBuilder errorMsg = new StringBuilder();
                            boolean hasError = false;

                            // Validate Full Name
                            if (fullName != null && !fullName.trim().equalsIgnoreCase(user.getFullName())) {
                                errorMsg.append("Tên không trùng khớp (Excel: ").append(fullName)
                                        .append(" vs DB: ").append(user.getFullName()).append("). ");
                                hasError = true;
                            }

                            // Validate Email
                            if (email != null && !email.trim().equalsIgnoreCase(user.getEmail())) {
                                errorMsg.append("Email không trùng khớp (Excel: ").append(email)
                                        .append(" vs DB: ").append(user.getEmail()).append("). ");
                                hasError = true;
                            }

                            // Validate Phone
                            String dbPhone = user.getPhone() != null ? user.getPhone() : "";
                            String excelPhone = phone != null ? phone : "";
                            if (!excelPhone.trim().equals(dbPhone)) {
                                errorMsg.append("SĐT không trùng khớp (Excel: ").append(excelPhone)
                                        .append(" vs DB: ").append(dbPhone).append("). ");
                                hasError = true;
                            }

                            // Validate Major / Specialization
                            if (majorName != null && !majorName.trim().isEmpty()) {
                                com.fams.backend.entity.Major majorEntity =
                                        majorByName.get(majorName.trim().toLowerCase());
                                if (majorEntity == null) {
                                    errorMsg.append("Ngành dạy không hợp lệ: '").append(majorName).append("'. ");
                                    hasError = true;
                                } else if (specName != null && !specName.trim().isEmpty()) {
                                    // Specialization must belong to the selected Major
                                    Optional<com.fams.backend.entity.Specialization> specOpt =
                                            specializationRepository.findByNameIgnoreCaseAndMajor(specName.trim(), majorEntity);
                                    if (specOpt.isEmpty()) {
                                        errorMsg.append("Chuyên ngành '").append(specName)
                                                .append("' không thuộc Ngành '").append(majorName).append("'. ");
                                        hasError = true;
                                    }
                                }
                            } else if (specName != null && !specName.trim().isEmpty()) {
                                // Has spec but no major
                                errorMsg.append("Phải chọn Ngành dạy trước khi chọn Chuyên ngành. ");
                                hasError = true;
                            }

                            if (hasError) {
                                dto.setStatus("ERROR");
                                dto.setErrorMessage(errorMsg.toString().trim());
                            }
                        }
                    }
                }

                previewList.add(dto);
                rowNumber++;
            }

        } catch (Exception e) {
            log.error("Error previewing import file", e);
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage());
        }
        return previewList;
    }

    @Override
    @Transactional
    @CacheEvict(value = "dashboardStats", allEntries = true)
    public Map<String, Object> saveImportedLecturers(List<LecturerImportDTO> dtos) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;
        int failedCount = 0;

        if (dtos == null || dtos.isEmpty()) {
            result.put("created", 0);
            result.put("updated", 0);
            result.put("failed", 0);
            result.put("errors", errors);
            return result;
        }

        // Phase 0: Deduplicate input by code (last one wins)
        Map<String, LecturerImportDTO> uniqueDtosMap = new LinkedHashMap<>();
        for (LecturerImportDTO dto : dtos) {
            String code = dto.getCode() != null ? dto.getCode().trim().toLowerCase() : null;
            if (code != null) {
                uniqueDtosMap.put(code, dto);
            }
        }
        Collection<LecturerImportDTO> uniqueDtos = uniqueDtosMap.values();

        log.info("Starting robust lecturer import processing for {} records (Unique: {})", dtos.size(),
                uniqueDtos.size());

        // Phase 1: Pre-fetch & Cache
        List<String> codes = uniqueDtos.stream()
                .filter(d -> !"ERROR".equals(d.getStatus()))
                .map(d -> d.getCode().trim().toLowerCase())
                .collect(Collectors.toList());

        Map<String, User> userMap = userRepository.findByCodeInIgnoreCase(codes).stream()
                .collect(Collectors.toMap(u -> u.getCode().trim().toLowerCase(), u -> u));

        List<Long> userIds = userMap.values().stream().map(User::getId).collect(Collectors.toList());
        Map<Long, LecturerProfile> profileMap = lecturerProfileRepository.findAllByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(LecturerProfile::getUserId, p -> p));

        // Pre-load majors & specializations for lookup
        Map<String, com.fams.backend.entity.Major> majorByName = majorRepository.findAll().stream()
                .collect(Collectors.toMap(
                        m -> m.getName().trim().toLowerCase(),
                        m -> m,
                        (a, b) -> a));

        List<com.fams.backend.entity.Specialization> allSpecs = specializationRepository.findAll();

        List<LecturerProfile> profilesToSave = new ArrayList<>();

        // Phase 2: In-memory Transformation
        for (LecturerImportDTO dto : uniqueDtos) {
            if ("ERROR".equals(dto.getStatus())) {
                failedCount++;
                errors.add("Dòng " + dto.getRowNumber() + ": " + dto.getErrorMessage());
                continue;
            }

            try {
                User user = userMap.get(dto.getCode().trim().toLowerCase());
                if (user == null) {
                    throw new NotFoundException("Không tìm thấy user với mã: " + dto.getCode());
                }

                LecturerProfile profile = profileMap.get(user.getId());

                String newExp = dto.getExpertise() != null ? dto.getExpertise().trim() : null;
                String newBio = dto.getBio() != null ? dto.getBio().trim() : null;

                // Resolve Major entity
                com.fams.backend.entity.Major newMajor = null;
                if (dto.getMajor() != null && !dto.getMajor().trim().isEmpty()) {
                    newMajor = majorByName.get(dto.getMajor().trim().toLowerCase());
                    if (newMajor == null) {
                        throw new IllegalArgumentException("Ngành dạy không hợp lệ: " + dto.getMajor());
                    }
                }

                // Resolve Specialization entity (must belong to Major)
                com.fams.backend.entity.Specialization newSpec = null;
                if (dto.getSpecialization() != null && !dto.getSpecialization().trim().isEmpty()) {
                    if (newMajor == null) {
                        throw new IllegalArgumentException("Phải có Ngành dạy để chọn Chuyên ngành");
                    }
                    final com.fams.backend.entity.Major finalMajor = newMajor;
                    final String specName = dto.getSpecialization().trim();
                    newSpec = allSpecs.stream()
                            .filter(s -> s.getMajor() != null &&
                                    s.getMajor().getId().equals(finalMajor.getId()) &&
                                    s.getName().equalsIgnoreCase(specName))
                            .findFirst()
                            .orElseThrow(() -> new IllegalArgumentException(
                                    "Chuyên ngành '" + specName + "' không thuộc Ngành '" + finalMajor.getName() + "'"));
                }

                if (profile == null) {
                    profile = LecturerProfile.builder()
                            .user(user)
                            .major(newMajor)
                            .specialization(newSpec)
                            .expertise(newExp)
                            .bio(newBio)
                            .build();
                    createdCount++;
                    profilesToSave.add(profile);
                } else {
                    boolean changed = false;
                    if (!Objects.equals(profile.getMajor(), newMajor)) { profile.setMajor(newMajor); changed = true; }
                    if (!Objects.equals(profile.getSpecialization(), newSpec)) { profile.setSpecialization(newSpec); changed = true; }
                    if (!Objects.equals(profile.getExpertise(), newExp)) { profile.setExpertise(newExp); changed = true; }
                    if (!Objects.equals(profile.getBio(), newBio)) { profile.setBio(newBio); changed = true; }
                    if (changed) { updatedCount++; profilesToSave.add(profile); }
                }
            } catch (Exception e) {
                failedCount++;
                errors.add("Lỗi xử lý GV " + dto.getCode() + ": " + e.getMessage());
                log.error("Error processing imported lecturer {}: {}", dto.getCode(), e.getMessage());
            }
        }

        // Phase 3: Optimized Batch Persistence
        if (!profilesToSave.isEmpty()) {
            try {
                lecturerProfileRepository.saveAll(profilesToSave);
                log.info("Batch saved {} modified lecturer profiles successfully", profilesToSave.size());
            } catch (Exception e) {
                log.error("Batch save failed: {}. Attempting individual saves...", e.getMessage());
                for (LecturerProfile profile : profilesToSave) {
                    try {
                        lecturerProfileRepository.save(profile);
                    } catch (Exception ex) {
                        log.error("Failed to save profile for user {}: {}", profile.getUser().getCode(), ex.getMessage());
                        failedCount++;
                        errors.add("Lỗi lưu dữ liệu GV " + profile.getUser().getCode() + ": " + ex.getMessage());
                    }
                }
            }
        }

        result.put("created", createdCount);
        result.put("updated", updatedCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        systemLogService.logLecturerImportCompleted(createdCount, updatedCount, failedCount);
        return result;
    }
}
