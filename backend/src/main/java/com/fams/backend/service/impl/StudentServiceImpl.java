package com.fams.backend.service.impl;

import com.fams.backend.dto.StudentImportDTO;
import com.fams.backend.dto.request.StudentUpdateRequest;
import com.fams.backend.dto.response.StudentResponse;
import com.fams.backend.entity.*;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.*;
import com.fams.backend.service.StudentService;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceImpl implements StudentService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final MajorRepository majorRepository;
    private final SpecializationRepository specializationRepository;
    private final SubSpecializationRepository subSpecializationRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<StudentResponse> getAllStudents(String search, String status, String majorStr, String specializationStr,
            Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by role
            predicates.add(cb.equal(root.get("role"), User.UserRole.STUDENT));

            // ALWAYS exclude INACTIVE users
            predicates.add(cb.notEqual(root.get("status"), User.UserStatus.INACTIVE));

            // Filter by status (if provided, and not INACTIVE)
            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    User.UserStatus userStatus = User.UserStatus.valueOf(status.toUpperCase());
                    if (userStatus != User.UserStatus.INACTIVE) {
                        predicates.add(cb.equal(root.get("status"), userStatus));
                    } else {
                        // If someone explicitly asks for INACTIVE, they get nothing
                        predicates.add(cb.disjunction());
                    }
                } catch (Exception e) {
                    log.error("Invalid status filter: {}", status);
                }
            }

            // Search by name, email, code
            if (search != null && !search.isEmpty()) {
                String searchLower = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), searchLower),
                        cb.like(cb.lower(root.get("email")), searchLower),
                        cb.like(cb.lower(root.get("code")), searchLower)));
            }

            // Note: Filtering by major/specialization via Specification on User is hard
            // because StudentProfile is linked.
            // We can do it via subquery or fetch all IDs first. Subquery is better.
            if (query != null && ((majorStr != null && !majorStr.isEmpty())
                    || (specializationStr != null && !specializationStr.isEmpty()))) {
                var subquery = query.subquery(Long.class);
                var profileRoot = subquery.from(StudentProfile.class);
                subquery.select(profileRoot.get("userId"));

                List<Predicate> profilePredicates = new ArrayList<>();

                if (majorStr != null && !majorStr.isEmpty()) {
                    // Start by assuming majorStr is Name or Code.
                    // But major is an entity in StudentProfile.
                    // Joining major
                    var majorJoin = profileRoot.join("major");
                    profilePredicates.add(cb.equal(majorJoin.get("name"), majorStr));
                }

                if (specializationStr != null && !specializationStr.isEmpty()) {
                    var specJoin = profileRoot.join("specialization");
                    profilePredicates.add(cb.equal(specJoin.get("name"), specializationStr));
                }

                subquery.where(profilePredicates.toArray(new Predicate[0]));
                predicates.add(root.get("id").in(subquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> users = userRepository.findAll(spec, pageable != null ? pageable : Pageable.unpaged());

        List<Long> userIds = users.getContent().stream()
                .map(User::getId)
                .collect(Collectors.toList());

        Map<Long, StudentProfile> profileMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            studentProfileRepository.findAllById(userIds)
                    .forEach(p -> profileMap.put(p.getUserId(), p));
        }

        return users.map(user -> {
            StudentProfile profile = profileMap.get(user.getId());
            return StudentResponse.fromUserAndProfile(user, profile);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public StudentResponse getStudentById(Long id) {
        if (id == null)
            throw new IllegalArgumentException("ID cannot be null");
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sinh viên với ID: " + id));

        if (user.getRole() != User.UserRole.STUDENT) {
            throw new NotFoundException("Người dùng này không phải là sinh viên");
        }

        StudentProfile profile = studentProfileRepository.findById(id).orElse(null);
        return StudentResponse.fromUserAndProfile(user, profile);
    }

    @Override
    @Transactional
    public void deleteStudent(Long id) {
        if (id == null)
            throw new IllegalArgumentException("ID cannot be null");
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sinh viên với ID: " + id));

        if (user.getRole() != User.UserRole.STUDENT) {
            throw new NotFoundException("Người dùng này không phải là sinh viên");
        }

        studentProfileRepository.findById(id).ifPresent(studentProfileRepository::delete);
        userRepository.deleteById(id);
        log.info("Deleted student with ID: {}", id);
    }

    @Override
    @Transactional
    public void deleteStudents(List<Long> ids) {
        for (Long id : ids) {
            try {
                deleteStudent(id);
            } catch (Exception e) {
                log.error("Failed to delete student with ID: {}", id, e);
            }
        }
    }

    @Override
    @Transactional
    public StudentResponse updateStudent(Long id, StudentUpdateRequest request, MultipartFile avatar) {
        if (id == null) {
            throw new BadRequestException("ID không được để trống");
        }
        // Find User
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy sinh viên với ID: " + id));

        if (user.getRole() != User.UserRole.STUDENT) {
            throw new NotFoundException("Người dùng này không phải là sinh viên");
        }

        // --- Update User Entity fields ---
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getDob() != null) {
            user.setDob(request.getDob());
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }

        // --- Update StudentProfile Entity fields ---
        // Get it from user since we have CascadeType.ALL
        StudentProfile profile = user.getStudentProfile();

        if (profile == null) {
            profile = StudentProfile.builder()
                    .userId(user.getId())
                    .user(user)
                    .build();
            user.setStudentProfile(profile);
        }

        // Hierarchical Validation for Academic fields
        Major major = profile.getMajor();
        if (request.getMajor() != null) {
            if (request.getMajor().isEmpty()) {
                major = null;
            } else {
                final String majorNameReq = request.getMajor().trim();
                major = majorRepository.findByName(majorNameReq)
                        .orElseThrow(() -> new BadRequestException("Ngành học không tồn tại: " + majorNameReq));
            }
        }

        final Major finalMajor = major;
        Specialization spec = profile.getSpecialization();
        if (request.getSpecialization() != null) {
            if (request.getSpecialization().isEmpty()) {
                spec = null;
            } else {
                if (finalMajor == null) {
                    throw new BadRequestException("Cần chọn Ngành học trước khi chọn Chuyên ngành");
                }
                final String specNameReq = request.getSpecialization().trim();
                spec = specializationRepository.findByNameAndMajor(specNameReq, finalMajor)
                        .orElseThrow(() -> new BadRequestException("Chuyên ngành '" + specNameReq
                                + "' không thuộc Ngành '" + (finalMajor != null ? finalMajor.getName() : "") + "'"));
            }
        }

        final Specialization finalSpec = spec;
        SubSpecialization subSpec = profile.getSubSpecialization();
        if (request.getSubSpecialization() != null) {
            if (request.getSubSpecialization().isEmpty()) {
                subSpec = null;
            } else {
                if (finalSpec == null) {
                    throw new BadRequestException("Cần chọn Chuyên ngành trước khi chọn Combo");
                }
                final String subSpecNameReq = request.getSubSpecialization().trim();
                subSpec = subSpecializationRepository
                        .findByNameAndSpecialization(subSpecNameReq, finalSpec)
                        .orElseThrow(() -> new BadRequestException("Combo '" + subSpecNameReq
                                + "' không thuộc Chuyên ngành '" + (finalSpec != null ? finalSpec.getName() : "")
                                + "'"));
            }
        }

        profile.setMajor(major);
        profile.setSpecialization(spec);
        profile.setSubSpecialization(subSpec);

        if (request.getCourse() != null)
            profile.setCourse(request.getCourse().trim());
        if (request.getGpa() != null)
            profile.setGpa(request.getGpa());

        // Save User - this will cascade down to Profile
        User savedUser = userRepository.save(user);

        log.info("Updated student with ID: {} and its profile", id);
        return StudentResponse.fromUserAndProfile(savedUser, savedUser.getStudentProfile());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportStudents(String majorStr, String specializationStr, String subSpecializationStr,
            String status) {
        try {
            org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Danh sách Sinh viên");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "STT", "Mã SV", "Họ và tên", "Email", "Số điện thoại",
                    "Ngành (Major)", "Chuyên ngành (Specialization)", "Combo (Sub-Spec)", "Khóa", "GPA"
            };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Optional<List<User>> usersOpt = userRepository.findByRole(User.UserRole.STUDENT);
            List<User> users = usersOpt.orElse(new ArrayList<>());

            // Simple filtering in memory if strict filtering isn't required via query,
            // but for export implementing similar filtering to getAllStudents logic is
            // better.
            // Using logic similar to LecturerServiceImpl export

            int rowNum = 1;
            for (User user : users) {
                if (status != null && !status.isEmpty() && !user.getStatus().name().equals(status)) {
                    continue;
                }

                StudentProfile profile = studentProfileRepository.findById(user.getId()).orElse(null);

                // Filter by major/spec
                if (majorStr != null && !majorStr.isEmpty()) {
                    if (profile == null || profile.getMajor() == null || !profile.getMajor().getName().equals(majorStr))
                        continue;
                }
                if (specializationStr != null && !specializationStr.isEmpty()) {
                    if (profile == null || profile.getSpecialization() == null
                            || !profile.getSpecialization().getName().equals(specializationStr))
                        continue;
                }
                if (subSpecializationStr != null && !subSpecializationStr.isEmpty()) {
                    if (profile == null || profile.getSubSpecialization() == null
                            || !profile.getSubSpecialization().getName().equals(subSpecializationStr))
                        continue;
                }

                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(rowNum - 1);
                row.createCell(1).setCellValue(user.getCode() != null ? user.getCode() : "");
                row.createCell(2).setCellValue(user.getFullName() != null ? user.getFullName() : "");
                row.createCell(3).setCellValue(user.getEmail() != null ? user.getEmail() : "");
                row.createCell(4).setCellValue(user.getPhone() != null ? user.getPhone() : "");
                row.createCell(5).setCellValue(
                        profile != null && profile.getMajor() != null ? profile.getMajor().getName() : "");
                row.createCell(6).setCellValue(
                        profile != null && profile.getSpecialization() != null ? profile.getSpecialization().getName()
                                : "");
                row.createCell(7).setCellValue(
                        profile != null && profile.getSubSpecialization() != null
                                ? profile.getSubSpecialization().getName()
                                : "");
                row.createCell(8).setCellValue(
                        profile != null && profile.getCourse() != null ? profile.getCourse() : "");
                row.createCell(9).setCellValue(
                        profile != null && profile.getGpa() != null ? profile.getGpa() : 0.0);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Error exporting students", e);
            throw new RuntimeException("Lỗi khi xuất file Excel", e);
        }
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
    @Transactional(readOnly = true)
    public List<StudentImportDTO> previewImportStudents(MultipartFile file) {
        List<StudentImportDTO> previewList = new ArrayList<>();
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            int rowNumber = 0;
            Set<String> seenCodes = new HashSet<>();

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }
                // Format: STT, Code, FullName, Email, Phone, Major, Spec, SubSpec, Course, GPA
                String code = getCellValueAsString(currentRow.getCell(1));
                String fullName = getCellValueAsString(currentRow.getCell(2));
                String email = getCellValueAsString(currentRow.getCell(3));
                String phone = getCellValueAsString(currentRow.getCell(4));
                String major = getCellValueAsString(currentRow.getCell(5));
                String specialization = getCellValueAsString(currentRow.getCell(6));
                String subSpecialization = getCellValueAsString(currentRow.getCell(7));
                String course = getCellValueAsString(currentRow.getCell(8));
                String gpaStr = getCellValueAsString(currentRow.getCell(9));
                Double gpa = null;
                if (gpaStr != null) {
                    try {
                        gpa = Double.parseDouble(gpaStr);
                    } catch (NumberFormatException e) {
                    }
                }

                if (code == null || code.isEmpty()) {
                    rowNumber++;
                    continue;
                }

                StudentImportDTO dto = StudentImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .code(code)
                        .major(major)
                        .specialization(specialization)
                        .subSpecialization(subSpecialization)
                        .course(course)
                        .gpa(gpa)
                        .status("VALID")
                        .build();

                if (seenCodes.contains(code.toLowerCase())) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Mã SV bị trùng trong file");
                } else {
                    seenCodes.add(code.toLowerCase());

                    Optional<User> userOpt = userRepository.findByCode(code);
                    if (userOpt.isEmpty()) {
                        dto.setStatus("ERROR");
                        dto.setErrorMessage("Không tìm thấy student với mã này");
                    } else {
                        // Update profile only for existing students
                        // We don't update user fields as per requirement
                        User user = userOpt.get();
                        dto.setFullName(user.getFullName());
                        dto.setEmail(user.getEmail());
                        // The phone from Excel is used for validation, not for setting on the DTO for
                        // display
                        // dto.setPhone(phone); // Removed as per strict profile update

                        if (user.getRole() != User.UserRole.STUDENT) {
                            dto.setStatus("ERROR");
                            dto.setErrorMessage("User không phải là Sinh viên");
                        } else {
                            // Strict check
                            StringBuilder errorMsg = new StringBuilder();
                            boolean hasError = false;

                            // User fields are not updated, but we validate them for consistency
                            if (fullName != null && !fullName.trim().equalsIgnoreCase(user.getFullName())) {
                                errorMsg.append("Tên không trùng khớp (Excel: ").append(fullName).append(" vs DB: ")
                                        .append(user.getFullName()).append("). ");
                                hasError = true;
                            }
                            if (email != null && !email.trim().equalsIgnoreCase(user.getEmail())) {
                                errorMsg.append("Email không trùng khớp (Excel: ").append(email).append(" vs DB: ")
                                        .append(user.getEmail()).append("). ");
                                hasError = true;
                            }
                            String dbPhone = user.getPhone() != null ? user.getPhone() : "";
                            String xlsPhone = phone != null ? phone : "";
                            if (!xlsPhone.trim().equals(dbPhone)) {
                                errorMsg.append("SĐT không trùng khớp (Excel: ").append(xlsPhone).append(" vs DB: ")
                                        .append(dbPhone).append("). ");
                                hasError = true;
                            }

                            // Hierarchical Validation
                            Major foundMajor = null;
                            if (major != null && !major.trim().isEmpty()) {
                                foundMajor = majorRepository.findByName(major.trim()).orElse(null);
                                if (foundMajor == null) {
                                    errorMsg.append("Ngành học không tồn tại: ").append(major).append(". ");
                                    hasError = true;
                                }
                            }

                            Specialization foundSpec = null;
                            if (specialization != null && !specialization.trim().isEmpty()) {
                                if (foundMajor == null) {
                                    errorMsg.append("Chuyên ngành '").append(specialization)
                                            .append("' yêu cầu Ngành học hợp lệ. ");
                                    hasError = true;
                                } else {
                                    foundSpec = specializationRepository.findByNameAndMajor(specialization.trim(),
                                            foundMajor).orElse(null);
                                    if (foundSpec == null) {
                                        errorMsg.append("Chuyên ngành '").append(specialization)
                                                .append("' không thuộc Ngành '").append(major).append("'. ");
                                        hasError = true;
                                    }
                                }
                            }

                            if (subSpecialization != null && !subSpecialization.trim().isEmpty()) {
                                if (foundSpec == null) {
                                    errorMsg.append("Combo '").append(subSpecialization)
                                            .append("' yêu cầu Chuyên ngành hợp lệ. ");
                                    hasError = true;
                                } else {
                                    SubSpecialization foundSub = subSpecializationRepository
                                            .findByNameAndSpecialization(subSpecialization.trim(), foundSpec)
                                            .orElse(null);
                                    if (foundSub == null) {
                                        errorMsg.append("Combo '").append(subSpecialization)
                                                .append("' không thuộc Chuyên ngành '").append(specialization)
                                                .append("'. ");
                                        hasError = true;
                                    }
                                }
                            }

                            // GPA validation removed to allow updates via import

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
            throw new RuntimeException("Lỗi đọc file: " + e.getMessage());
        }
        return previewList;
    }

    @Override
    @Transactional
    public Map<String, Object> saveImportedStudents(List<StudentImportDTO> dtos) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int createdCount = 0;
        int updatedCount = 0;
        int failedCount = 0;

        for (StudentImportDTO dto : dtos) {
            if ("ERROR".equals(dto.getStatus())) {
                failedCount++;
                errors.add("Dòng " + dto.getRowNumber() + ": " + dto.getErrorMessage());
                continue;
            }
            try {
                User user = userRepository.findByCode(dto.getCode())
                        .orElseThrow(() -> new NotFoundException("Not found: " + dto.getCode()));

                StudentProfile profile = studentProfileRepository.findById(user.getId()).orElse(null);

                Major major = null;
                if (dto.getMajor() != null && !dto.getMajor().isEmpty()) {
                    major = majorRepository.findByName(dto.getMajor().trim()).orElse(null);
                }

                Specialization specialization = null;
                if (dto.getSpecialization() != null && !dto.getSpecialization().isEmpty() && major != null) {
                    specialization = specializationRepository.findByNameAndMajor(dto.getSpecialization().trim(), major)
                            .orElse(null);
                }

                SubSpecialization subSpecialization = null;
                if (dto.getSubSpecialization() != null && !dto.getSubSpecialization().isEmpty()
                        && specialization != null) {
                    subSpecialization = subSpecializationRepository
                            .findByNameAndSpecialization(dto.getSubSpecialization().trim(), specialization)
                            .orElse(null);
                }

                if (profile == null) {
                    profile = StudentProfile.builder()
                            .user(user)
                            .major(major)
                            .specialization(specialization)
                            .subSpecialization(subSpecialization)
                            .course(dto.getCourse())
                            .gpa(dto.getGpa())
                            .build();
                    createdCount++;
                } else {
                    if (dto.getMajor() != null)
                        profile.setMajor(major);
                    if (dto.getSpecialization() != null)
                        profile.setSpecialization(specialization);
                    if (dto.getSubSpecialization() != null)
                        profile.setSubSpecialization(subSpecialization);
                    if (dto.getCourse() != null)
                        profile.setCourse(dto.getCourse());
                    if (dto.getGpa() != null)
                        profile.setGpa(dto.getGpa());
                    updatedCount++;
                }
                studentProfileRepository.save(profile);

            } catch (Exception e) {
                failedCount++;
                errors.add("Lỗi SV " + dto.getCode() + ": " + e.getMessage());
                log.error("Error saving {}", dto.getCode(), e);
            }
        }

        result.put("created", createdCount);
        result.put("updated", updatedCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        return result;
    }

    @Override
    public Map<String, Object> importStudents(MultipartFile file) {
        // Direct import without preview (optional, or similar to preview+save)
        // Implementing similar to LecturerService's direct import which reads and saves
        // But re-using the logic, let's just use preview -> save internally or
        // duplicate logic
        // For brevity, I will adapt the structure
        return saveImportedStudents(previewImportStudents(file));
    }

    @Override
    public List<String> getAllMajors() {
        return majorRepository.findAll().stream().map(Major::getName).sorted().collect(Collectors.toList());
    }

    @Override
    public List<String> getAllSpecializations() {
        return specializationRepository.findAll().stream()
                .map(Specialization::getName)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getSpecializationsByMajor(String majorName) {
        if (majorName == null || majorName.isEmpty())
            return new ArrayList<>();
        return majorRepository.findByName(majorName)
                .map(m -> specializationRepository.findByMajorId(m.getId()).stream()
                        .map(Specialization::getName)
                        .sorted()
                        .collect(Collectors.toList()))
                .orElse(new ArrayList<>());
    }

    @Override
    public List<String> getSubSpecializationsBySpecialization(String specializationName) {
        if (specializationName == null || specializationName.isEmpty())
            return new ArrayList<>();
        return specializationRepository.findByName(specializationName)
                .map(s -> subSpecializationRepository.findBySpecializationId(s.getId()).stream()
                        .map(SubSpecialization::getName)
                        .sorted()
                        .collect(Collectors.toList()))
                .orElse(new ArrayList<>());
    }
}
