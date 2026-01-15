package com.fams.backend.service.impl;

import com.fams.backend.dto.ClassSectionImportDTO;
import com.fams.backend.dto.EnrollmentImportDTO;
import com.fams.backend.dto.response.ClassSectionResponse;
import com.fams.backend.dto.response.EnrollmentResponse;
import com.fams.backend.dto.response.LecturerOptionResponse;
import com.fams.backend.entity.ClassSection;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.Enrollment;
import com.fams.backend.entity.Semester;
import com.fams.backend.entity.User;
import com.fams.backend.repository.ClassSectionRepository;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.EnrollmentRepository;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.ClassSectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClassSectionServiceImpl implements ClassSectionService {

    private final ClassSectionRepository classSectionRepository;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ClassSectionResponse> getClassSectionsBySemester(
            String semesterCode,
            String search,
            String status,
            Long lecturerId,
            Pageable pageable) {

        // Convert status from string to enum if provided
        String statusValue = null;
        if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("ALL")) {
            try {
                ClassSection.ClassStatus.valueOf(status.toUpperCase());
                statusValue = status.toUpperCase();
            } catch (IllegalArgumentException e) {
                // Invalid status, ignore it
            }
        }

        Page<ClassSection> classSections = classSectionRepository.findBySemesterCodeWithFilters(
                semesterCode,
                search,
                statusValue,
                lecturerId,
                pageable);

        return classSections.map(this::convertToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LecturerOptionResponse> getLecturersBySemester(String semesterCode) {
        // Get all lecturers who have class sections in this semester
        List<ClassSection> classSections = classSectionRepository.findAll();

        // Use LinkedHashMap to maintain order and ensure uniqueness by lecturer ID
        Map<Long, LecturerOptionResponse> lecturerMap = new LinkedHashMap<>();

        classSections.stream()
                .filter(cs -> cs.getSemester().getCode().equals(semesterCode))
                .filter(cs -> cs.getLecturer() != null)
                .forEach(cs -> {
                    User lecturer = cs.getLecturer();
                    if (!lecturerMap.containsKey(lecturer.getId())) {
                        lecturerMap.put(lecturer.getId(), LecturerOptionResponse.builder()
                                .id(lecturer.getId())
                                .fullName(lecturer.getFullName())
                                .username(lecturer.getUsername())
                                .build());
                    }
                });

        return new ArrayList<>(lecturerMap.values());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEnrollmentsByClassName(String className) {
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);

        return enrollments.stream()
                .map(this::convertToEnrollmentResponse)
                .collect(Collectors.toList());
    }

    private EnrollmentResponse convertToEnrollmentResponse(Enrollment enrollment) {
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .className(enrollment.getClassSection().getClassName())
                .studentCode(enrollment.getStudentCode())
                .studentName(enrollment.getStudent().getFullName())
                .status(enrollment.getStatus().name())
                .build();
    }

    private ClassSectionResponse convertToResponse(ClassSection classSection) {
        return ClassSectionResponse.builder()
                .className(classSection.getClassName())
                .courseCode(classSection.getCourse().getCode())
                .courseName(classSection.getCourse().getName())
                .semesterCode(classSection.getSemester().getCode())
                .lecturerName(classSection.getLecturer() != null ? classSection.getLecturer().getFullName() : null)
                .enrollmentInfo(classSection.getCurrentEnrollment() + " / " + classSection.getMaxStudents())
                .slots(classSection.getNumberOfSlots())
                .status(classSection.getStatus().name())
                .build();
    }

    // ==================== IMPORT METHODS ====================

    @Override
    public List<ClassSectionImportDTO> previewImportClassSections(String semesterCode, MultipartFile file) {
        List<ClassSectionImportDTO> previewList = new ArrayList<>();

        // Validate semester exists
        Optional<Semester> semesterOpt = semesterRepository.findByCode(semesterCode);
        if (semesterOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy học kỳ: " + semesterCode);
        }

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            Set<String> seenClassNames = new HashSet<>();

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                // Read cells: A=ClassName, B=CourseCode, C=LecturerCode, D=MaxStudents
                String className = getCellValueAsString(currentRow.getCell(0));
                String courseCode = getCellValueAsString(currentRow.getCell(1));
                String lecturerCode = getCellValueAsString(currentRow.getCell(2));
                Integer maxStudents = getCellValueAsInteger(currentRow.getCell(3));

                // Skip completely empty rows
                boolean isEmptyRow = (className == null || className.trim().isEmpty())
                        && (courseCode == null || courseCode.trim().isEmpty())
                        && (lecturerCode == null || lecturerCode.trim().isEmpty())
                        && maxStudents == null;
                if (isEmptyRow) {
                    rowNumber++;
                    continue;
                }

                ClassSectionImportDTO dto = ClassSectionImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .className(className != null ? className.trim() : "")
                        .courseCode(courseCode != null ? courseCode.trim().toUpperCase() : "")
                        .lecturerCode(lecturerCode != null ? lecturerCode.trim().toLowerCase() : null)
                        .maxStudents(maxStudents != null ? maxStudents : 30)
                        .status("VALID")
                        .build();

                // Validate
                List<String> errors = new ArrayList<>();
                List<String> warnings = new ArrayList<>();

                // Check className is not empty
                if (dto.getClassName() == null || dto.getClassName().isEmpty()) {
                    errors.add("Mã lớp học phần không được để trống");
                }

                // Check courseCode is not empty
                if (dto.getCourseCode() == null || dto.getCourseCode().isEmpty()) {
                    errors.add("Mã môn học không được để trống");
                } else {
                    // Check course exists
                    Optional<Course> courseOpt = courseRepository.findByCode(dto.getCourseCode());
                    if (courseOpt.isEmpty()) {
                        errors.add("Không tìm thấy môn học: " + dto.getCourseCode());
                    } else {
                        Course course = courseOpt.get();
                        dto.setCourseName(course.getName());
                        // Check course status
                        if (course.getStatus() == Course.CourseStatus.INACTIVE) {
                            errors.add("Môn học đã ngừng đào tạo");
                        }
                    }
                }

                // Check lecturer exists (optional)
                if (dto.getLecturerCode() != null && !dto.getLecturerCode().isEmpty()) {
                    Optional<User> lecturerOpt = userRepository.findByUsername(dto.getLecturerCode());
                    if (lecturerOpt.isEmpty()) {
                        errors.add("Không tìm thấy giảng viên: " + dto.getLecturerCode());
                    } else {
                        User lecturer = lecturerOpt.get();
                        if (lecturer.getRole() != User.UserRole.LECTURER) {
                            errors.add("User " + dto.getLecturerCode() + " không phải là giảng viên");
                        } else {
                            dto.setLecturerName(lecturer.getFullName());
                        }
                    }
                }

                // Check maxStudents
                if (dto.getMaxStudents() != null && dto.getMaxStudents() <= 0) {
                    errors.add("Số lượng sinh viên tối đa phải > 0");
                }

                // Check duplicate in file
                if (className != null && !className.trim().isEmpty()) {
                    if (seenClassNames.contains(className.toLowerCase())) {
                        errors.add("Mã lớp học phần bị trùng trong file");
                    } else {
                        seenClassNames.add(className.toLowerCase());
                    }

                    // Check if className exists in database (case-insensitive)
                    if (classSectionRepository.existsByClassNameIgnoreCase(className.trim())) {
                        errors.add("Mã lớp học phần đã tồn tại trong hệ thống");
                    }
                }

                // Set status and messages
                if (!errors.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage(String.join("; ", errors));
                } else if (!warnings.isEmpty()) {
                    dto.setStatus("WARNING");
                    dto.setWarningMessage(String.join("; ", warnings));
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
    public Map<String, Object> saveImportedClassSections(String semesterCode, List<ClassSectionImportDTO> dtos) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();

        // Get semester
        Semester semester = semesterRepository.findByCode(semesterCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ: " + semesterCode));

        // Check if there are any ERROR rows
        List<ClassSectionImportDTO> errorRows = dtos.stream()
                .filter(dto -> "ERROR".equals(dto.getStatus()))
                .toList();

        if (!errorRows.isEmpty()) {
            for (ClassSectionImportDTO errorDto : errorRows) {
                errors.add("Dòng " + errorDto.getRowNumber() + ": " + errorDto.getErrorMessage());
            }
            result.put("created", 0);
            result.put("failed", errorRows.size());
            result.put("errors", errors);
            result.put("message", "Không thể import vì có " + errorRows.size() + " dòng lỗi.");
            return result;
        }

        // Phase 1: Validate all rows first (before any insert)
        List<ClassSection> classSectionsToSave = new ArrayList<>();
        for (ClassSectionImportDTO dto : dtos) {
            // Double check - className should not exist (case-insensitive)
            if (classSectionRepository.existsByClassNameIgnoreCase(dto.getClassName())) {
                errors.add("Dòng " + dto.getRowNumber() + ": Mã lớp học phần đã tồn tại trong hệ thống");
                continue;
            }

            // Get course
            Optional<Course> courseOpt = courseRepository.findByCode(dto.getCourseCode());
            if (courseOpt.isEmpty()) {
                errors.add("Dòng " + dto.getRowNumber() + ": Không tìm thấy môn học " + dto.getCourseCode());
                continue;
            }
            Course course = courseOpt.get();

            // Check course status
            if (course.getStatus() == Course.CourseStatus.INACTIVE) {
                errors.add("Dòng " + dto.getRowNumber() + ": Môn học đã ngừng đào tạo");
                continue;
            }

            // Get lecturer (optional)
            User lecturer = null;
            if (dto.getLecturerCode() != null && !dto.getLecturerCode().isEmpty()) {
                Optional<User> lecturerOpt = userRepository.findByUsername(dto.getLecturerCode());
                if (lecturerOpt.isEmpty()) {
                    errors.add("Dòng " + dto.getRowNumber() + ": Không tìm thấy giảng viên " + dto.getLecturerCode());
                    continue;
                }
                lecturer = lecturerOpt.get();
            }

            // Build class section entity
            ClassSection classSection = ClassSection.builder()
                    .className(dto.getClassName())
                    .course(course)
                    .semester(semester)
                    .lecturer(lecturer)
                    .maxStudents(dto.getMaxStudents() != null ? dto.getMaxStudents() : 30)
                    .currentEnrollment(0)
                    .numberOfSlots(course.getNumberOfSlots())
                    .status(ClassSection.ClassStatus.UPCOMING)
                    .build();

            classSectionsToSave.add(classSection);
        }

        // If there are validation errors, don't save anything
        if (!errors.isEmpty()) {
            result.put("created", 0);
            result.put("failed", errors.size());
            result.put("errors", errors);
            result.put("message", "Không thể import vì có " + errors.size() + " dòng lỗi.");
            return result;
        }

        // Phase 2: Save all validated class sections
        try {
            classSectionRepository.saveAll(classSectionsToSave);
            log.info("Successfully imported {} class sections for semester {}", classSectionsToSave.size(),
                    semesterCode);

            result.put("created", classSectionsToSave.size());
            result.put("failed", 0);
            result.put("errors", errors);
            result.put("message", "Import thành công " + classSectionsToSave.size() + " lớp học phần.");
        } catch (Exception e) {
            log.error("Error saving class sections: {}", e.getMessage());
            throw new RuntimeException("Lỗi khi lưu dữ liệu: " + e.getMessage());
        }

        return result;
    }

    @Override
    public byte[] getImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            // Create data sheet
            Sheet dataSheet = workbook.createSheet("Template Import Lớp học phần");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            // Create headers
            Row headerRow = dataSheet.createRow(0);
            String[] headers = { "Class Name", "Course Code", "Lecturer Code", "Max Students" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Add sample data
            Row sampleRow = dataSheet.createRow(1);
            sampleRow.createCell(0).setCellValue("SE18B02-PRN211");
            sampleRow.createCell(1).setCellValue("PRN211");
            sampleRow.createCell(2).setCellValue("sonnt5");
            sampleRow.createCell(3).setCellValue(30);

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                dataSheet.autoSizeColumn(i);
            }

            // Create instruction sheet
            Sheet instructionSheet = workbook.createSheet("Hướng dẫn");
            String[] instructions = {
                    "HƯỚNG DẪN IMPORT LỚP HỌC PHẦN",
                    "",
                    "1. Class Name: Mã lớp học phần (bắt buộc, không được trùng)",
                    "   Ví dụ: SE18B02-PRN211",
                    "",
                    "2. Course Code: Mã môn học (bắt buộc, phải tồn tại trong hệ thống)",
                    "   Ví dụ: PRN211",
                    "",
                    "3. Lecturer Code: Username của giảng viên (không bắt buộc)",
                    "   Ví dụ: sonnt5",
                    "",
                    "4. Max Students: Số lượng sinh viên tối đa (mặc định 30 nếu để trống)",
                    "",
                    "LƯU Ý:",
                    "- Không được xóa dòng tiêu đề",
                    "- Mã lớp học phần không được trùng trong file và trong hệ thống"
            };
            for (int i = 0; i < instructions.length; i++) {
                Row row = instructionSheet.createRow(i);
                row.createCell(0).setCellValue(instructions[i]);
            }
            instructionSheet.setColumnWidth(0, 60 * 256);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Error creating import template", e);
            throw new RuntimeException("Lỗi khi tạo file template: " + e.getMessage());
        }
    }

    // Helper methods
    private String getCellValueAsString(Cell cell) {
        if (cell == null)
            return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((int) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null)
            return null;
        return switch (cell.getCellType()) {
            case NUMERIC -> (int) cell.getNumericCellValue();
            case STRING -> {
                try {
                    yield Integer.parseInt(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    yield null;
                }
            }
            default -> null;
        };
    }

    // ==================== IMPORT ENROLLMENT METHODS (Multi-class support)
    // ====================

    @Override
    public List<EnrollmentImportDTO> previewImportEnrollments(String semesterCode, MultipartFile file) {
        List<EnrollmentImportDTO> previewList = new ArrayList<>();

        // Validate semester exists
        Optional<Semester> semesterOpt = semesterRepository.findByCode(semesterCode);
        if (semesterOpt.isEmpty()) {
            throw new RuntimeException("Không tìm thấy học kỳ: " + semesterCode);
        }

        // Cache for class sections info: className -> {classSection, currentEnrollment,
        // pendingCount}
        Map<String, ClassSection> classCache = new HashMap<>();
        Map<String, Long> currentEnrollmentCache = new HashMap<>();
        Map<String, Integer> pendingCountCache = new HashMap<>(); // Count of valid enrollments in file

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            // Track duplicates: key = className + studentCode (lowercase)
            Set<String> seenEnrollments = new HashSet<>();

            while (rows.hasNext()) {
                Row currentRow = rows.next();
                int currentRowNum = rowNumber + 1;

                // Skip header row
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                // Read cells: A=StudentCode (MSSV), B=ClassName (Mã lớp + Mã môn)
                String studentCode = getCellValueAsString(currentRow.getCell(0));
                String className = getCellValueAsString(currentRow.getCell(1));

                // Skip completely empty rows
                boolean isEmptyRow = (studentCode == null || studentCode.trim().isEmpty())
                        && (className == null || className.trim().isEmpty());
                if (isEmptyRow) {
                    rowNumber++;
                    continue;
                }

                EnrollmentImportDTO dto = EnrollmentImportDTO.builder()
                        .rowNumber(currentRowNum)
                        .studentCode(studentCode != null ? studentCode.trim().toUpperCase() : "")
                        .className(className != null ? className.trim() : "")
                        .status("VALID")
                        .build();

                // Validate
                List<String> errors = new ArrayList<>();
                List<String> warnings = new ArrayList<>();

                // Check className is not empty
                if (dto.getClassName() == null || dto.getClassName().isEmpty()) {
                    errors.add("Mã lớp học phần không được để trống");
                } else {
                    // Check class section exists and belongs to semester (use eager fetch to avoid
                    // LazyInitializationException)
                    ClassSection classSection = classCache.get(dto.getClassName());
                    if (classSection == null) {
                        Optional<ClassSection> classSectionOpt = classSectionRepository
                                .findByClassNameWithDetails(dto.getClassName());
                        if (classSectionOpt.isEmpty()) {
                            errors.add("Không tìm thấy lớp học phần: " + dto.getClassName());
                        } else {
                            classSection = classSectionOpt.get();
                            classCache.put(dto.getClassName(), classSection);
                            // Cache current enrollment count
                            long currentCount = enrollmentRepository.countByClassSectionClassName(dto.getClassName());
                            currentEnrollmentCache.put(dto.getClassName(), currentCount);
                            pendingCountCache.put(dto.getClassName(), 0);
                        }
                    }

                    if (classSection != null) {
                        if (!classSection.getSemester().getCode().equals(semesterCode)) {
                            errors.add("Lớp học phần " + dto.getClassName() + " không thuộc học kỳ " + semesterCode);
                        } else {
                            dto.setCourseName(classSection.getCourse().getName());
                        }
                    }
                }

                // Check studentCode is not empty
                if (dto.getStudentCode() == null || dto.getStudentCode().isEmpty()) {
                    errors.add("Mã sinh viên không được để trống");
                } else {
                    // Check student exists
                    Optional<User> studentOpt = userRepository.findByCodeIgnoreCase(dto.getStudentCode());
                    if (studentOpt.isEmpty()) {
                        errors.add("Không tìm thấy sinh viên: " + dto.getStudentCode());
                    } else {
                        User student = studentOpt.get();
                        if (student.getRole() != User.UserRole.STUDENT) {
                            errors.add("User " + dto.getStudentCode() + " không phải là sinh viên");
                        } else {
                            dto.setStudentName(student.getFullName());
                        }
                    }
                }

                // Check duplicate in file
                if (dto.getStudentCode() != null && !dto.getStudentCode().isEmpty()
                        && dto.getClassName() != null && !dto.getClassName().isEmpty()) {
                    String enrollmentKey = dto.getClassName().toLowerCase() + "_" + dto.getStudentCode().toLowerCase();
                    if (seenEnrollments.contains(enrollmentKey)) {
                        errors.add("Bản ghi bị trùng trong file (cùng sinh viên, cùng lớp)");
                    } else {
                        seenEnrollments.add(enrollmentKey);
                    }

                    // Check if enrollment exists in database
                    if (enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(dto.getClassName(),
                            dto.getStudentCode())) {
                        errors.add("Sinh viên đã đăng ký lớp học phần này");
                    }
                }

                // Check max students limit (only if no errors so far for this row)
                if (errors.isEmpty() && dto.getClassName() != null && !dto.getClassName().isEmpty()) {
                    ClassSection classSection = classCache.get(dto.getClassName());
                    if (classSection != null) {
                        long currentCount = currentEnrollmentCache.getOrDefault(dto.getClassName(), 0L);
                        int pendingCount = pendingCountCache.getOrDefault(dto.getClassName(), 0);
                        int maxStudents = classSection.getMaxStudents();

                        if (currentCount + pendingCount >= maxStudents) {
                            errors.add("Lớp " + dto.getClassName() + " đã đạt số lượng sinh viên tối đa (" + maxStudents
                                    + ")");
                        } else {
                            // Increment pending count for this class
                            pendingCountCache.put(dto.getClassName(), pendingCount + 1);
                        }
                    }
                }

                // Set status and messages
                if (!errors.isEmpty()) {
                    dto.setStatus("ERROR");
                    dto.setErrorMessage(String.join("; ", errors));
                } else if (!warnings.isEmpty()) {
                    dto.setStatus("WARNING");
                    dto.setWarningMessage(String.join("; ", warnings));
                }

                previewList.add(dto);
                rowNumber++;
            }

        } catch (Exception e) {
            log.error("Error previewing enrollment import file", e);
            throw new RuntimeException("Lỗi khi đọc file Excel: " + e.getMessage());
        }

        return previewList;
    }

    @Override
    @Transactional
    public Map<String, Object> saveImportedEnrollments(List<EnrollmentImportDTO> dtos) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();

        // Check if there are any ERROR rows
        List<EnrollmentImportDTO> errorRows = dtos.stream()
                .filter(dto -> "ERROR".equals(dto.getStatus()))
                .toList();

        if (!errorRows.isEmpty()) {
            for (EnrollmentImportDTO errorDto : errorRows) {
                errors.add("Dòng " + errorDto.getRowNumber() + ": " + errorDto.getErrorMessage());
            }
            result.put("created", 0);
            result.put("failed", errorRows.size());
            result.put("errors", errors);
            result.put("message", "Không thể import vì có " + errorRows.size() + " dòng lỗi.");
            return result;
        }

        // Phase 1: Validate all rows first (before any insert)
        List<Enrollment> enrollmentsToSave = new ArrayList<>();
        Map<String, ClassSection> classCache = new HashMap<>();

        for (EnrollmentImportDTO dto : dtos) {
            String className = dto.getClassName();

            // Get or cache class section
            ClassSection classSection = classCache.get(className);
            if (classSection == null) {
                Optional<ClassSection> classSectionOpt = classSectionRepository.findById(className);
                if (classSectionOpt.isEmpty()) {
                    errors.add("Dòng " + dto.getRowNumber() + ": Không tìm thấy lớp học phần " + className);
                    continue;
                }
                classSection = classSectionOpt.get();
                classCache.put(className, classSection);
            }

            // Double check - enrollment should not exist
            if (enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(className, dto.getStudentCode())) {
                errors.add("Dòng " + dto.getRowNumber() + ": Sinh viên đã đăng ký lớp học phần này");
                continue;
            }

            // Get student
            Optional<User> studentOpt = userRepository.findByCodeIgnoreCase(dto.getStudentCode());
            if (studentOpt.isEmpty()) {
                errors.add("Dòng " + dto.getRowNumber() + ": Không tìm thấy sinh viên " + dto.getStudentCode());
                continue;
            }
            User student = studentOpt.get();

            // Check max students for this class
            long currentEnrollment = enrollmentRepository.countByClassSectionClassName(className);
            long pendingForClass = enrollmentsToSave.stream()
                    .filter(e -> e.getClassSection().getClassName().equals(className))
                    .count();
            if (currentEnrollment + pendingForClass >= classSection.getMaxStudents()) {
                errors.add("Dòng " + dto.getRowNumber() + ": Lớp " + className + " đã đạt số lượng sinh viên tối đa");
                continue;
            }

            // Build Enrollment entity
            Enrollment enrollment = Enrollment.builder()
                    .classSection(classSection)
                    .student(student)
                    .studentCode(student.getCode())
                    .status(Enrollment.EnrollmentStatus.ENROLLED)
                    .build();

            enrollmentsToSave.add(enrollment);
        }

        // If all validations passed, save all
        if (errors.isEmpty() && !enrollmentsToSave.isEmpty()) {
            enrollmentRepository.saveAll(enrollmentsToSave);

            // Update current enrollment count for each affected class section
            for (String className : classCache.keySet()) {
                ClassSection classSection = classCache.get(className);
                classSection.setCurrentEnrollment((int) enrollmentRepository.countByClassSectionClassName(className));
                classSectionRepository.save(classSection);
            }

            result.put("created", enrollmentsToSave.size());
            result.put("failed", 0);
            result.put("errors", List.of());
            result.put("message", "Import thành công " + enrollmentsToSave.size() + " sinh viên vào "
                    + classCache.size() + " lớp học phần.");
        } else {
            result.put("created", 0);
            result.put("failed", errors.size());
            result.put("errors", errors);
            result.put("message", "Import thất bại do có lỗi.");
        }

        return result;
    }

    @Override
    public byte[] getEnrollmentImportTemplate(String semesterCode) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Danh sách đăng ký");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            // Create header row
            Row headerRow = sheet.createRow(0);
            String[] headers = { "MSSV", "Mã lớp + Mã môn" };

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Get some class sections in this semester to use as sample data
            List<ClassSection> allClassSectionsForSample = classSectionRepository.findBySemesterCode(semesterCode);
            List<ClassSection> classSections = allClassSectionsForSample.stream()
                    .limit(3)
                    .toList();

            // Add sample data rows
            int rowNum = 1;
            if (!classSections.isEmpty()) {
                for (ClassSection cs : classSections) {
                    Row sampleRow = sheet.createRow(rowNum++);
                    sampleRow.createCell(0).setCellValue("SE" + (100000 + rowNum));
                    sampleRow.createCell(1).setCellValue(cs.getClassName());
                }
            } else {
                Row sampleRow = sheet.createRow(1);
                sampleRow.createCell(0).setCellValue("SE123456");
                sampleRow.createCell(1).setCellValue("SE18B02-PRN211");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Create instructions sheet
            Sheet instructionSheet = workbook.createSheet("Hướng dẫn");
            String[] instructions = {
                    "HƯỚNG DẪN IMPORT DANH SÁCH ĐĂNG KÝ",
                    "",
                    "1. Sheet 'Danh sách đăng ký' chứa dữ liệu cần import",
                    "2. Cột A - MSSV: Mã số sinh viên (bắt buộc)",
                    "3. Cột B - Mã lớp + Mã môn: Mã lớp học phần (bắt buộc)",
                    "",
                    "HỖ TRỢ IMPORT NHIỀU LỚP:",
                    "- Có thể import danh sách đăng ký cho nhiều lớp học phần cùng lúc",
                    "- Mỗi dòng chỉ định một sinh viên và lớp học phần tương ứng",
                    "",
                    "LƯU Ý:",
                    "- Không được xóa dòng tiêu đề (dòng 1)",
                    "- Sinh viên phải tồn tại trong hệ thống",
                    "- Lớp học phần phải thuộc học kỳ: " + semesterCode,
                    "- Sinh viên chưa đăng ký lớp học phần đó"
            };

            for (int i = 0; i < instructions.length; i++) {
                Row row = instructionSheet.createRow(i);
                row.createCell(0).setCellValue(instructions[i]);
            }
            instructionSheet.setColumnWidth(0, 60 * 256);

            // Create class list sheet for reference
            Sheet classListSheet = workbook.createSheet("Danh sách lớp học phần");
            Row classHeaderRow = classListSheet.createRow(0);
            Cell classCell0 = classHeaderRow.createCell(0);
            classCell0.setCellValue("Mã lớp");
            classCell0.setCellStyle(headerStyle);
            Cell classCell1 = classHeaderRow.createCell(1);
            classCell1.setCellValue("Môn học");
            classCell1.setCellStyle(headerStyle);
            Cell classCell2 = classHeaderRow.createCell(2);
            classCell2.setCellValue("Số SV hiện tại / Tối đa");
            classCell2.setCellStyle(headerStyle);

            List<ClassSection> allClassSections = classSectionRepository.findBySemesterCode(semesterCode);

            int classRowNum = 1;
            for (ClassSection cs : allClassSections) {
                Row classRow = classListSheet.createRow(classRowNum++);
                classRow.createCell(0).setCellValue(cs.getClassName());
                classRow.createCell(1).setCellValue(cs.getCourse().getName());
                classRow.createCell(2).setCellValue(cs.getCurrentEnrollment() + " / " + cs.getMaxStudents());
            }
            for (int i = 0; i < 3; i++) {
                classListSheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Error creating enrollment import template", e);
            throw new RuntimeException("Lỗi khi tạo file template: " + e.getMessage());
        }
    }
}
