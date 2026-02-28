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
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
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
            String subSpecializationStr, Pageable pageable) {
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
                    || (specializationStr != null && !specializationStr.isEmpty())
                    || (subSpecializationStr != null && !subSpecializationStr.isEmpty()))) {
                var subquery = query.subquery(Long.class);
                var profileRoot = subquery.from(StudentProfile.class);
                subquery.select(profileRoot.get("userId"));

                List<Predicate> profilePredicates = new ArrayList<>();

                if (majorStr != null && !majorStr.isEmpty()) {
                    var majorJoin = profileRoot.join("major");
                    profilePredicates.add(cb.equal(majorJoin.get("name"), majorStr));
                }

                if (specializationStr != null && !specializationStr.isEmpty()) {
                    var specJoin = profileRoot.join("specialization");
                    profilePredicates.add(cb.equal(specJoin.get("name"), specializationStr));
                }

                if (subSpecializationStr != null && !subSpecializationStr.isEmpty()) {
                    var subSpecJoin = profileRoot.join("subSpecialization");
                    profilePredicates.add(cb.equal(subSpecJoin.get("name"), subSpecializationStr));
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
        boolean userChanged = false;
        if (request.getFullName() != null && !request.getFullName().isBlank()
                && !request.getFullName().trim().equals(user.getFullName())) {
            user.setFullName(request.getFullName().trim());
            userChanged = true;
        }
        if (request.getPhone() != null && !request.getPhone().trim().equals(user.getPhone())) {
            user.setPhone(request.getPhone().trim());
            userChanged = true;
        }
        if (request.getDob() != null && !request.getDob().equals(user.getDob())) {
            user.setDob(request.getDob());
            userChanged = true;
        }
        if (request.getStatus() != null && !request.getStatus().equals(user.getStatus())) {
            user.setStatus(request.getStatus());
            userChanged = true;
        }

        // --- Update StudentProfile Entity fields ---
        StudentProfile profile = user.getStudentProfile();

        if (profile == null) {
            profile = StudentProfile.builder()
                    .userId(user.getId())
                    .user(user)
                    .build();
            user.setStudentProfile(profile);
            userChanged = true;
        }

        boolean profileChanged = false;

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

        if (major != profile.getMajor()) {
            profile.setMajor(major);
            profileChanged = true;
        }
        if (spec != profile.getSpecialization()) {
            profile.setSpecialization(spec);
            profileChanged = true;
        }
        if (subSpec != profile.getSubSpecialization()) {
            profile.setSubSpecialization(subSpec);
            profileChanged = true;
        }

        if (request.getCourse() != null && !request.getCourse().trim().equals(profile.getCourse())) {
            profile.setCourse(request.getCourse().trim());
            profileChanged = true;
        }
        if (request.getGpa() != null && !request.getGpa().equals(profile.getGpa())) {
            profile.setGpa(request.getGpa());
            profileChanged = true;
        }

        if (userChanged || profileChanged) {
            userRepository.save(user); // Cascade saves profile
            log.info("Updated student with ID: {} and its profile", id);
        } else {
            log.info("No changes detected for student with ID: {}, skipping save", id);
        }

        return StudentResponse.fromUserAndProfile(user, user.getStudentProfile());
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportStudents(String majorStr, String specializationStr, String subSpecializationStr,
            String status) {
        try {
            Workbook workbook = new SXSSFWorkbook();
            Sheet sheet = workbook.createSheet("Danh sách Sinh viên");
            ((SXSSFSheet) sheet).trackAllColumnsForAutoSizing();

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
                    "Ngành (Major)", "Chuyên ngành (Specialization)", "Chuyên ngành hẹp", "Khóa", "GPA"
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
        List<Map<String, String>> rowDataList = new ArrayList<>();

        // Phase 1: Read Excel into memory and extract codes
        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            int rowIndex = 0;

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                if (rowIndex == 0) {
                    rowIndex++;
                    continue;
                }

                // Format: STT, Code, FullName, Email, Phone, Major, Spec, SubSpec, Course, GPA
                String code = getCellValueAsString(currentRow.getCell(1));
                if (code == null || code.trim().isEmpty()) {
                    rowIndex++;
                    continue;
                }

                Map<String, String> data = new HashMap<>();
                data.put("rowNumber", String.valueOf(rowIndex + 1));
                data.put("code", code.trim());
                data.put("fullName", getCellValueAsString(currentRow.getCell(2)));
                data.put("email", getCellValueAsString(currentRow.getCell(3)));
                data.put("phone", getCellValueAsString(currentRow.getCell(4)));
                data.put("major", getCellValueAsString(currentRow.getCell(5)));
                data.put("specialization", getCellValueAsString(currentRow.getCell(6)));
                data.put("subSpecialization", getCellValueAsString(currentRow.getCell(7)));
                data.put("course", getCellValueAsString(currentRow.getCell(8)));
                data.put("gpa", getCellValueAsString(currentRow.getCell(9)));

                rowDataList.add(data);
                rowIndex++;
            }
        } catch (Exception e) {
            log.error("Error reading student import file", e);
            throw new RuntimeException("Lỗi đọc file: " + e.getMessage());
        }

        if (rowDataList.isEmpty()) {
            return previewList;
        }

        // Phase 2: Batch Pre-fetch data
        Set<String> codesInFile = rowDataList.stream()
                .map(d -> d.get("code").toLowerCase())
                .collect(Collectors.toSet());

        Map<String, User> userMap = userRepository.findByCodeInIgnoreCase(codesInFile).stream()
                .collect(Collectors.toMap(u -> u.getCode().trim().toLowerCase(), u -> u, (a, b) -> a));

        Map<String, Major> majorMap = majorRepository.findAll().stream()
                .collect(Collectors.toMap(m -> m.getName().trim().toLowerCase(), m -> m, (a, b) -> a));

        Map<String, Specialization> specMap = specializationRepository.findAll().stream()
                .collect(Collectors.toMap(s -> s.getName().trim().toLowerCase() + "|" + s.getMajor().getId(), s -> s,
                        (a, b) -> a));

        Map<String, SubSpecialization> subSpecMap = subSpecializationRepository.findAll().stream()
                .collect(Collectors.toMap(
                        ss -> ss.getName().trim().toLowerCase() + "|" + ss.getSpecialization().getId(),
                        ss -> ss, (a, b) -> a));

        // Phase 3: Process rows in-memory
        Set<String> seenCodes = new HashSet<>();
        for (Map<String, String> data : rowDataList) {
            String code = data.get("code");
            int currentRowNum = Integer.parseInt(data.get("rowNumber"));

            Double gpa = null;
            if (data.get("gpa") != null) {
                try {
                    gpa = Double.parseDouble(data.get("gpa"));
                } catch (NumberFormatException e) {
                }
            }

            StudentImportDTO dto = StudentImportDTO.builder()
                    .rowNumber(currentRowNum)
                    .code(code)
                    .major(data.get("major"))
                    .specialization(data.get("specialization"))
                    .subSpecialization(data.get("subSpecialization"))
                    .course(data.get("course"))
                    .gpa(gpa)
                    .status("VALID")
                    .build();

            if (seenCodes.contains(code.toLowerCase())) {
                dto.setStatus("ERROR");
                dto.setErrorMessage("Mã SV bị trùng trong file");
            } else {
                seenCodes.add(code.toLowerCase());

                User user = userMap.get(code.toLowerCase());
                if (user == null) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage("Không tìm thấy student với mã này");
                } else {
                    dto.setFullName(user.getFullName());
                    dto.setEmail(user.getEmail());

                    if (user.getRole() != User.UserRole.STUDENT) {
                        dto.setStatus("ERROR");
                        dto.setErrorMessage("User không phải là Sinh viên");
                    } else {
                        StringBuilder errorMsg = new StringBuilder();
                        boolean hasError = false;

                        String fullName = data.get("fullName");
                        String email = data.get("email");
                        String phone = data.get("phone");

                        if (fullName != null && !fullName.trim().isEmpty()
                                && !fullName.trim().equalsIgnoreCase(user.getFullName())) {
                            errorMsg.append("Tên không trùng khớp (Excel: ").append(fullName)
                                    .append(" vs DB: ").append(user.getFullName()).append("). ");
                            hasError = true;
                        }
                        if (email != null && !email.trim().isEmpty()
                                && !email.trim().equalsIgnoreCase(user.getEmail())) {
                            errorMsg.append("Email không trùng khớp (Excel: ").append(email)
                                    .append(" vs DB: ").append(user.getEmail()).append("). ");
                            hasError = true;
                        }

                        String dbPhone = user.getPhone() != null ? user.getPhone() : "";
                        String excelPhone = phone != null ? phone : "";
                        if (phone != null && !phone.trim().isEmpty() && !excelPhone.trim().equals(dbPhone)) {
                            errorMsg.append("Số điện thoại không trùng khớp (Excel: ").append(phone)
                                    .append(" vs DB: ").append(dbPhone).append("). ");
                            hasError = true;
                        }

                        Major foundMajor = null;
                        String majorName = data.get("major");
                        if (majorName != null && !majorName.trim().isEmpty()) {
                            foundMajor = majorMap.get(majorName.trim().toLowerCase());
                            if (foundMajor == null) {
                                errorMsg.append("Ngành học không tồn tại: ").append(majorName).append(". ");
                                hasError = true;
                            }
                        }

                        Specialization foundSpec = null;
                        String specName = data.get("specialization");
                        if (specName != null && !specName.trim().isEmpty()) {
                            if (foundMajor == null) {
                                errorMsg.append("Chuyên ngành '").append(specName)
                                        .append("' yêu cầu Ngành học hợp lệ. ");
                                hasError = true;
                            } else {
                                foundSpec = specMap.get(specName.trim().toLowerCase() + "|" + foundMajor.getId());
                                if (foundSpec == null) {
                                    errorMsg.append("Chuyên ngành '").append(specName)
                                            .append("' không thuộc Ngành '").append(majorName).append("'. ");
                                    hasError = true;
                                }
                            }
                        }

                        String subSpecName = data.get("subSpecialization");
                        if (subSpecName != null && !subSpecName.trim().isEmpty()) {
                            if (foundSpec == null) {
                                errorMsg.append("Combo '").append(subSpecName)
                                        .append("' yêu cầu Chuyên ngành hợp lệ. ");
                                hasError = true;
                            } else {
                                SubSpecialization foundSub = subSpecMap
                                        .get(subSpecName.trim().toLowerCase() + "|" + foundSpec.getId());
                                if (foundSub == null) {
                                    errorMsg.append("Combo '").append(subSpecName)
                                            .append(" không thuộc Chuyên ngành '").append(specName)
                                            .append("'. ");
                                    hasError = true;
                                }
                            }
                        }

                        if (hasError) {
                            dto.setStatus("ERROR");
                            dto.setErrorMessage(errorMsg.toString().trim());
                        }
                    }
                }
            }
            previewList.add(dto);
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

        if (dtos.isEmpty()) {
            result.put("created", 0);
            result.put("updated", 0);
            result.put("failed", 0);
            result.put("errors", errors);
            return result;
        }

        // Phase 1: Pre-fetch & Cache for O(1) performance
        log.info("Starting high-speed import processing for {} students", dtos.size());

        // Cache Academic Entities with case-insensitive keys
        Map<String, Major> majorMap = majorRepository.findAll().stream()
                .collect(Collectors.toMap(m -> m.getName().trim().toLowerCase(), m -> m, (a, b) -> a));

        Map<String, Specialization> specMap = specializationRepository.findAll().stream()
                .collect(Collectors.toMap(s -> s.getName().trim().toLowerCase() + "|" + s.getMajor().getId(), s -> s,
                        (a, b) -> a));

        Map<String, SubSpecialization> subSpecMap = subSpecializationRepository.findAll().stream()
                .collect(
                        Collectors.toMap(ss -> ss.getName().trim().toLowerCase() + "|" + ss.getSpecialization().getId(),
                                ss -> ss, (a, b) -> a));

        List<String> codes = dtos.stream()
                .filter(d -> !"ERROR".equals(d.getStatus()))
                .map(d -> d.getCode().trim().toLowerCase()) // MUST lowercase for the LOWER(u.code) IN :codes query
                .collect(Collectors.toList());

        Map<String, User> userMap = userRepository.findByCodeInIgnoreCase(codes).stream()
                .collect(Collectors.toMap(u -> u.getCode().trim().toLowerCase(), u -> u));

        List<Long> userIds = userMap.values().stream().map(User::getId).collect(Collectors.toList());
        Map<Long, StudentProfile> profileMap = studentProfileRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(StudentProfile::getUserId, p -> p));

        List<StudentProfile> newProfilesToSave = new ArrayList<>();
        List<StudentProfile> existingProfilesToSave = new ArrayList<>();

        // Phase 2: In-memory Transformation
        for (StudentImportDTO dto : dtos) {
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

                StudentProfile profile = profileMap.get(user.getId());

                Major major = null;
                if (dto.getMajor() != null && !dto.getMajor().trim().isEmpty()) {
                    major = majorMap.get(dto.getMajor().trim().toLowerCase());
                }

                Specialization specialization = null;
                if (dto.getSpecialization() != null && !dto.getSpecialization().trim().isEmpty() && major != null) {
                    specialization = specMap.get(dto.getSpecialization().trim().toLowerCase() + "|" + major.getId());
                }

                SubSpecialization subSpecialization = null;
                if (dto.getSubSpecialization() != null && !dto.getSubSpecialization().trim().isEmpty()
                        && specialization != null) {
                    subSpecialization = subSpecMap
                            .get(dto.getSubSpecialization().trim().toLowerCase() + "|" + specialization.getId());
                }

                if (profile == null) {
                    profile = StudentProfile.builder()
                            .user(user)
                            .major(major)
                            .specialization(specialization)
                            .subSpecialization(subSpecialization)
                            .course(dto.getCourse() != null ? dto.getCourse().trim() : null)
                            .gpa(dto.getGpa())
                            .build();
                    createdCount++;
                    newProfilesToSave.add(profile);
                } else {
                    boolean changed = false;

                    if (!java.util.Objects.equals(profile.getMajor(), major)) {
                        profile.setMajor(major);
                        changed = true;
                    }
                    if (!java.util.Objects.equals(profile.getSpecialization(), specialization)) {
                        profile.setSpecialization(specialization);
                        changed = true;
                    }
                    if (!java.util.Objects.equals(profile.getSubSpecialization(), subSpecialization)) {
                        profile.setSubSpecialization(subSpecialization);
                        changed = true;
                    }

                    String newCourse = dto.getCourse() != null ? dto.getCourse().trim() : null;
                    if (!java.util.Objects.equals(profile.getCourse(), newCourse)) {
                        profile.setCourse(newCourse);
                        changed = true;
                    }
                    if (!java.util.Objects.equals(profile.getGpa(), dto.getGpa())) {
                        profile.setGpa(dto.getGpa());
                        changed = true;
                    }

                    if (changed) {
                        updatedCount++;
                        existingProfilesToSave.add(profile);
                    }
                }

            } catch (Exception e) {
                failedCount++;
                errors.add("Lỗi xử lý SV " + dto.getCode() + ": " + e.getMessage());
                log.error("Internal error processing imported student {}", dto.getCode(), e);
            }
        }

        // Phase 3: Optimized Batch Persistence
        // Save new profiles one by one to ensure proper persist semantics with @MapsId
        for (StudentProfile newProfile : newProfilesToSave) {
            try {
                studentProfileRepository.save(newProfile);
            } catch (Exception e) {
                createdCount--;
                failedCount++;
                errors.add("Lỗi lưu profile mới cho SV: " + e.getMessage());
                log.error("Error saving new profile", e);
            }
        }

        // Save existing profiles in batch (these are already managed entities)
        if (!existingProfilesToSave.isEmpty()) {
            studentProfileRepository.saveAll(existingProfilesToSave);
            log.info("Batch saved {} updated student profiles successfully", existingProfilesToSave.size());
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

    @Override
    public Page<StudentResponse> getAllStudents(String search, String status, String majorStr, String specializationStr,
            String subSpecializationStr, Pageable pageable) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getAllStudents'");
    }
}
