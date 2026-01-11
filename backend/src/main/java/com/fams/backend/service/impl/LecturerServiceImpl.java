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
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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

    @Override
    public Page<LecturerResponse> getAllLecturers(String search, String status, String department, Boolean hasProfile,
            Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by LECTURER role
            predicates.add(cb.equal(root.get("role"), User.UserRole.LECTURER));

            // Filter by status
            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    User.UserStatus userStatus = User.UserStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), userStatus));
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
                    // Has profile: user.id IN (SELECT userId FROM lecturer_profiles)
                    predicates.add(root.get("id").in(subquery));
                } else {
                    // No profile: user.id NOT IN (SELECT userId FROM lecturer_profiles)
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

        // Filter by department if specified (in memory since profile data needed)
        if (department != null && !department.isEmpty() && !department.equalsIgnoreCase("all")) {
            List<User> filteredUsers = users.getContent().stream()
                    .filter(user -> {
                        LecturerProfile profile = profileMap.get(user.getId());
                        return profile != null && department.equalsIgnoreCase(profile.getDepartment());
                    })
                    .collect(Collectors.toList());

            return new org.springframework.data.domain.PageImpl<>(
                    filteredUsers.stream()
                            .map(user -> LecturerResponse.fromUserAndProfile(user, profileMap.get(user.getId())))
                            .collect(Collectors.toList()),
                    pageable,
                    filteredUsers.size());
        }

        return users.map(user -> {
            LecturerProfile profile = profileMap.get(user.getId());
            return LecturerResponse.fromUserAndProfile(user, profile);
        });
    }

    @Override
    public LecturerResponse getLecturerById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + id));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        LecturerProfile profile = lecturerProfileRepository.findByUser(user).orElse(null);
        return LecturerResponse.fromUserAndProfile(user, profile);
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
    public void deleteLecturer(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + id));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        // Delete profile first if exists
        lecturerProfileRepository.findByUser(user).ifPresent(lecturerProfileRepository::delete);
        // Delete user
        userRepository.deleteById(id);
        log.info("Deleted lecturer with ID: {}", id);
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
    public LecturerResponse updateLecturer(Long id, com.fams.backend.dto.request.LecturerUpdateRequest request,
            MultipartFile avatar) {
        // Find User
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy giảng viên với ID: " + id));

        if (user.getRole() != User.UserRole.LECTURER) {
            throw new NotFoundException("Người dùng này không phải là giảng viên");
        }

        // Update or Create Profile (Only update profile, ignore user info changes)
        LecturerProfile profile = lecturerProfileRepository.findByUser(user).orElse(null);
        log.info("Found existing profile: {}", profile != null);

        if (profile == null) {
            log.info("Creating new profile for user {}", user.getId());
            profile = LecturerProfile.builder()
                    .user(user)
                    .department(request.getDepartment())
                    .expertise(request.getExpertise())
                    .bio(request.getBio())
                    .build();
        } else {
            log.info("Updating existing profile for user {}", user.getId());
            if (request.getDepartment() != null) {
                log.info("Updating department to: {}", request.getDepartment());
                profile.setDepartment(request.getDepartment());
            }
            if (request.getExpertise() != null) {
                log.info("Updating expertise to: {}", request.getExpertise());
                profile.setExpertise(request.getExpertise());
            }
            if (request.getBio() != null) {
                log.info("Updating bio to: {}", request.getBio());
                profile.setBio(request.getBio());
            }
        }
        LecturerProfile savedProfile = lecturerProfileRepository.save(profile);
        log.info("Saved profile: id={}, dept={}", savedProfile.getUserId(), savedProfile.getDepartment());

        // Note: Avatar is NOT updated here because it belongs to User. If needed, we
        // can update it separately,
        // but considering the "don't update user info" rule, we might skip it too.
        // However, if the user uploaded an avatar, they might expect it to update.
        // Given the strict instruction "update profile like import", import doesn't
        // update avatar of existing users.
        // So I will only return the response.

        return LecturerResponse.fromUserAndProfile(user, savedProfile);
    }

    @Override
    public byte[] exportLecturers(String department, String status) {
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

            // Header row - Tất cả thông tin LecturerProfile
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "STT",
                    "Mã giảng viên",
                    "Họ và tên",
                    "Email",
                    "Số điện thoại",
                    "Chuyên ngành (Department)",
                    "Chuyên môn (Expertise)",
                    "Tiểu sử (Bio)"
            };
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Get data - giữ nguyên thứ tự từ database
            Optional<List<User>> usersOpt = userRepository.findByRole(User.UserRole.LECTURER);
            List<User> users = usersOpt.orElse(new ArrayList<>());

            int rowNum = 1;
            for (User user : users) {
                if (status != null && !status.isEmpty() && !user.getStatus().name().equals(status)) {
                    continue;
                }
                LecturerProfile profile = lecturerProfileRepository.findByUser(user).orElse(null);
                if (department != null && !department.isEmpty()) {
                    if (profile == null || !department.equals(profile.getDepartment())) {
                        continue;
                    }
                }

                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(rowNum - 1); // STT
                row.createCell(1).setCellValue(user.getCode() != null ? user.getCode() : ""); // Mã GV
                row.createCell(2).setCellValue(user.getFullName() != null ? user.getFullName() : ""); // Họ tên
                row.createCell(3).setCellValue(user.getEmail() != null ? user.getEmail() : ""); // Email
                row.createCell(4).setCellValue(user.getPhone() != null ? user.getPhone() : ""); // Số điện thoại
                row.createCell(5).setCellValue(
                        profile != null && profile.getDepartment() != null ? profile.getDepartment() : ""); // Department
                row.createCell(6)
                        .setCellValue(profile != null && profile.getExpertise() != null ? profile.getExpertise() : ""); // Expertise
                row.createCell(7).setCellValue(profile != null && profile.getBio() != null ? profile.getBio() : ""); // Bio
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
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

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                String code = getCellValueAsString(currentRow.getCell(1));
                String department = getCellValueAsString(currentRow.getCell(5));
                String expertise = getCellValueAsString(currentRow.getCell(6));
                String bio = getCellValueAsString(currentRow.getCell(7));

                if (code == null || code.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                LecturerImportDTO dto = LecturerImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .code(code)
                        .department(department)
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

                    // Validate User
                    Optional<User> userOpt = userRepository.findByCode(code);
                    if (userOpt.isEmpty()) {
                        dto.setStatus("ERROR");
                        dto.setErrorMessage("Không tìm thấy giảng viên");
                    } else {
                        User user = userOpt.get();
                        dto.setFullName(user.getFullName());
                        dto.setEmail(user.getEmail());

                        if (user.getRole() != User.UserRole.LECTURER) {
                            dto.setStatus("ERROR");
                            dto.setErrorMessage("Không phải là giảng viên");
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
    public Map<String, Object> saveImportedLecturers(List<LecturerImportDTO> dtos) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;
        int failedCount = 0;

        for (LecturerImportDTO dto : dtos) {
            if ("ERROR".equals(dto.getStatus())) {
                failedCount++;
                errors.add("Dòng " + dto.getRowNumber() + ": " + dto.getErrorMessage());
                continue;
            }

            try {
                User user = userRepository.findByCode(dto.getCode())
                        .orElseThrow(() -> new NotFoundException("Not found user: " + dto.getCode()));

                Optional<LecturerProfile> existingProfile = lecturerProfileRepository.findByUser(user);

                if (existingProfile.isPresent()) {
                    LecturerProfile profile = existingProfile.get();
                    if (dto.getDepartment() != null && !dto.getDepartment().isEmpty())
                        profile.setDepartment(dto.getDepartment().trim());
                    if (dto.getExpertise() != null && !dto.getExpertise().isEmpty())
                        profile.setExpertise(dto.getExpertise().trim());
                    if (dto.getBio() != null && !dto.getBio().isEmpty())
                        profile.setBio(dto.getBio().trim());

                    lecturerProfileRepository.save(profile);
                    updatedCount++;
                } else {
                    LecturerProfile profile = LecturerProfile.builder()
                            .user(user)
                            .department(dto.getDepartment() != null ? dto.getDepartment().trim() : null)
                            .expertise(dto.getExpertise() != null ? dto.getExpertise().trim() : null)
                            .bio(dto.getBio() != null ? dto.getBio().trim() : null)
                            .build();

                    lecturerProfileRepository.save(profile);
                    createdCount++;
                }

            } catch (Exception e) {
                failedCount++;
                errors.add("Lỗi xử lý giảng viên " + dto.getCode() + ": " + e.getMessage());
                log.error("Error saving imported lecturer {}", dto.getCode(), e);
            }
        }

        result.put("created", createdCount);
        result.put("updated", updatedCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        return result;
    }
}
