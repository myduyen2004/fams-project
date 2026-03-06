package com.fams.backend.service;

import com.fams.backend.dto.response.ExamGradeOverviewResponse;
import com.fams.backend.dto.response.ExamGradeOverviewResponse.ExamGradeComponentInfo;
import com.fams.backend.dto.response.ExamGradeOverviewResponse.ExamStudentGradeRow;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.util.GradeCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing exam grades (ME, FE, PE) and resit grades by course
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExamGradeService {

    private final StudentGradeRepository studentGradeRepository;
    private final GradeComponentRepository gradeComponentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final UserRepository userRepository;
    private final ClassSectionRepository classSectionRepository;

    // Grade types for exam page (ME, FE, PE)
    private static final List<GradeComponent.GradeType> EXAM_TYPES = Arrays.asList(
            GradeComponent.GradeType.MID_TERM,
            GradeComponent.GradeType.FINAL_EXAM,
            GradeComponent.GradeType.PRACTICAL_EXAM);

    // Grade types for resit page
    private static final List<GradeComponent.GradeType> RESIT_TYPES = Arrays.asList(
            GradeComponent.GradeType.RESIT);

    /**
     * Get exam grade overview for a course in a semester
     * 
     * @param courseCode   Course code
     * @param semesterCode Semester code
     * @param type         "EXAM" for ME/FE/PE, "RESIT" for resit grades
     */
    @Transactional(readOnly = true)
    public ExamGradeOverviewResponse getExamGradeOverview(String courseCode, String semesterCode, String type,
            String callerRole) {
        Course course = courseRepository.findByCode(courseCode)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseCode));

        Semester semester = semesterRepository.findByCode(semesterCode)
                .orElseThrow(() -> new RuntimeException("Semester not found: " + semesterCode));

        // Get editable grade types based on request type
        List<GradeComponent.GradeType> editableTypes = "RESIT".equalsIgnoreCase(type) ? RESIT_TYPES : EXAM_TYPES;

        // Get ALL grade components for display (not just editable ones)
        // Sắp xếp: FINAL_EXAM và RESIT luôn ở cuối, sau đó theo TỔNG trọng số của loại,
        // type priority, name
        List<GradeComponent> rawComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId());

        // 1. Tính tổng trọng số cho từng loại (Grade Type)
        Map<GradeComponent.GradeType, Double> typeTotalWeight = rawComponents.stream()
                .collect(Collectors.groupingBy(GradeComponent::getType,
                        Collectors.summingDouble(GradeComponent::getWeight)));

        List<GradeComponent> allComponents = rawComponents.stream()
                .sorted((a, b) -> {
                    // 1. FINAL_EXAM và RESIT luôn xuống cuối
                    boolean isABottom = isBottomType(a.getType());
                    boolean isBBottom = isBottomType(b.getType());

                    if (isABottom && !isBBottom)
                        return 1;
                    if (!isABottom && isBBottom)
                        return -1;

                    if (isABottom && isBBottom) {
                        // FINAL_EXAM trước RESIT
                        int priorityA = a.getType() == GradeComponent.GradeType.FINAL_EXAM ? 1 : 2;
                        int priorityB = b.getType() == GradeComponent.GradeType.FINAL_EXAM ? 1 : 2;
                        return Integer.compare(priorityA, priorityB);
                    }

                    // 2. Nhóm thường:

                    // Ưu tiên A: Sort by TOTAL WEIGHT of Grade Type ascending
                    double totalWeightA = typeTotalWeight.getOrDefault(a.getType(), 0.0);
                    double totalWeightB = typeTotalWeight.getOrDefault(b.getType(), 0.0);
                    int totalWeightCompare = Double.compare(totalWeightA, totalWeightB);

                    if (totalWeightCompare != 0)
                        return totalWeightCompare;

                    // Ưu tiên B: Sort by type priority (if total weights are equal)
                    int typePriorityCompare = Integer.compare(getGradeTypePriority(a.getType()),
                            getGradeTypePriority(b.getType()));
                    if (typePriorityCompare != 0)
                        return typePriorityCompare;

                    // 3. Finally by name
                    return a.getName().compareTo(b.getName());
                })
                .collect(Collectors.toList());

        // Get all enrollments for this course in this semester
        List<Enrollment> enrollments = enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode);

        // Get grades for these enrollments
        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<StudentGrade> allGrades = studentGradeRepository.findByEnrollmentIdIn(enrollmentIds);

        // Map all grades (not just exam types)
        Set<Long> componentIds = allComponents.stream().map(GradeComponent::getId).collect(Collectors.toSet());
        Map<Long, Map<Long, Double>> gradesMap = new HashMap<>(); // enrollmentId -> componentId -> score

        for (StudentGrade grade : allGrades) {
            if (componentIds.contains(grade.getGradeComponent().getId())) {
                gradesMap.computeIfAbsent(grade.getEnrollment().getId(), k -> new HashMap<>())
                        .put(grade.getGradeComponent().getId(), grade.getScore());
            }
        }

        // Build component info list with editable flag
        List<ExamGradeComponentInfo> componentInfos = allComponents.stream()
                .map(gc -> ExamGradeComponentInfo.builder()
                        .id(gc.getId())
                        .name(gc.getName())
                        .type(gc.getType().name())
                        .weight(gc.getWeight())
                        .isResit(gc.getIsResit())
                        .referenceComponentId(
                                gc.getReferenceComponent() != null ? gc.getReferenceComponent().getId() : null)
                        .isEditable(editableTypes.contains(gc.getType())) // Mark if this component can be imported
                        .build())
                .collect(Collectors.toList());

        // Determine if grades are published
        Set<ClassSection> classSections = enrollments.stream()
                .map(Enrollment::getClassSection)
                .collect(Collectors.toSet());

        boolean isPublished;
        if ("RESIT".equalsIgnoreCase(type)) {
            isPublished = classSections.stream().anyMatch(ClassSection::getResitGradesPublished);
        } else {
            isPublished = classSections.stream().anyMatch(ClassSection::getGradesPublished);
        }

        // LECTURER and STUDENT can only see exam grades after Academic Staff publishes
        // them
        boolean hideGradesForNonAcademic = !"ACADEMIC_STAFF".equals(callerRole) && !isPublished;

        // Build student rows
        List<ExamStudentGradeRow> studentRows = enrollments.stream().map(enrollment -> {
            Map<Long, Double> studentGrades = gradesMap.getOrDefault(enrollment.getId(), new HashMap<>());

            // If Lecturer/Student and grades not published yet → hide all scores
            if (hideGradesForNonAcademic) {
                return ExamStudentGradeRow.builder()
                        .enrollmentId(enrollment.getId())
                        .studentCode(enrollment.getStudentCode())
                        .studentName(enrollment.getStudent().getFullName())
                        .className(enrollment.getClassSection().getClassName())
                        .grades(new HashMap<>())
                        .finalGrade(null)
                        .status("PENDING")
                        .build();
            }

            // Identify components that are replaced by a published Resit
            // (only applies if Resit grades have been published for this
            // enrollment's class section)
            Set<Long> replacedByResitIds = new HashSet<>();
            boolean resitPublished = Boolean.TRUE.equals(enrollment.getClassSection().getResitGradesPublished());
            if (resitPublished) {
                for (GradeComponent gc : allComponents) {
                    if ((Boolean.TRUE.equals(gc.getIsResit()) || gc.getType() == GradeComponent.GradeType.RESIT)
                            && gc.getReferenceComponent() != null
                            && studentGrades.containsKey(gc.getId())) {
                        // Student has a RESIT record (any score, including 0) → RESIT replaces FE
                        replacedByResitIds.add(gc.getReferenceComponent().getId());
                    }
                }
            }

            // Calculate weighted sum for final grade using ALL components.
            // If a Resit exists and is published, it replaces the reference component.
            Map<Long, Double> scoresForCalc = new HashMap<>();
            Map<Long, Double> weightsForCalc = new HashMap<>();

            boolean hasFailedExam = false;

            for (GradeComponent gc : allComponents) {
                // Skip components that are replaced by a Resit
                if (replacedByResitIds.contains(gc.getId())) {
                    continue;
                }

                boolean isResitComponent = Boolean.TRUE.equals(gc.getIsResit())
                        || gc.getType() == GradeComponent.GradeType.RESIT;

                // If Resit is NOT published, skip Resit components entirely from calculation
                // so that FE is used for the average instead
                if (isResitComponent && !resitPublished) {
                    continue;
                }

                Double score = studentGrades.get(gc.getId());
                if (score != null) {
                    scoresForCalc.put(gc.getId(), score);
                    if ((gc.getType() == GradeComponent.GradeType.FINAL_EXAM
                            || gc.getType() == GradeComponent.GradeType.RESIT) && score < 4.0) {
                        hasFailedExam = true;
                    }
                }

                // Only add to weightsForCalc if it's NOT a RESIT, OR if the student HAS a score
                // for this RESIT (this branch is now only reached when resitPublished=true AND
                // resitScore > 0)
                if (!isResitComponent || score != null) {
                    weightsForCalc.put(gc.getId(), gc.getWeight());
                }
            }

            Double finalGrade = GradeCalculator.calculateAverage(scoresForCalc, weightsForCalc);

            String status = "PENDING";
            boolean isCoursePublished = Boolean.TRUE.equals(enrollment.getClassSection().getGradesPublished());

            if (isCoursePublished) {
                boolean hasMissingOrZero = false;
                for (Map.Entry<Long, Double> entry : weightsForCalc.entrySet()) {
                    Double score = scoresForCalc.get(entry.getKey());
                    if (score == null || score <= 0.0) {
                        hasMissingOrZero = true;
                        break;
                    }
                }

                if (hasMissingOrZero || hasFailedExam || (finalGrade != null && finalGrade < 5.0)) {
                    status = "FAILED";
                } else if (finalGrade != null && finalGrade >= 5.0) {
                    status = "PASSED";
                }
            }

            return ExamStudentGradeRow.builder()
                    .enrollmentId(enrollment.getId())
                    .studentCode(enrollment.getStudentCode())
                    .studentName(enrollment.getStudent().getFullName())
                    .className(enrollment.getClassSection().getClassName())
                    .grades(studentGrades)
                    .finalGrade(finalGrade)
                    .status(status)
                    .build();
        }).collect(Collectors.toList());

        // Sort by student code
        studentRows.sort(Comparator.comparing(ExamStudentGradeRow::getStudentCode));

        // Filter student rows for RESIT type
        List<ExamStudentGradeRow> finalStudentRows = studentRows;
        if ("RESIT".equalsIgnoreCase(type)) {
            // Đã công bố điểm thi FE chưa?
            boolean examGradesPublishedGlobal = classSections.stream()
                    .anyMatch(cs -> Boolean.TRUE.equals(cs.getGradesPublished()));

            if (!examGradesPublishedGlobal) {
                // Nếu chưa công bố điểm FE, danh sách thi lại phải rỗng
                finalStudentRows = new ArrayList<>();
            } else {
                finalStudentRows = studentRows.stream().filter(row -> {
                    // Điều kiện lọc danh sách thi lại:
                    // 1. Điểm TB < 5 (FAILED)
                    // 2. Thiếu điểm thi cuối kỳ (finalGrade null hoặc logic check FE)
                    // 3. Status PENDING (chưa đủ cột điểm để tính)
                    // 4. MỚI: Đã có điểm thi lại thực sự (>0) -> giữ lại trong danh sách ngay cả
                    // khi đã
                    // pass
                    boolean isFailed = "FAILED".equals(row.getStatus());

                    // Kiểm tra xem sinh viên đã được thêm vào danh sách thi lại chưa
                    // (có record RESIT trong DB, bất kể điểm bao nhiêu kể cả 0)
                    boolean hasResitGrade = allComponents.stream()
                            .filter(gc -> gc.getType() == GradeComponent.GradeType.RESIT)
                            .anyMatch(gc -> row.getGrades().get(gc.getId()) != null);

                    return isFailed || hasResitGrade;
                }).collect(Collectors.toList());
            }
        }

        // Calculate statistics based on the final (potentially filtered) list
        double averageGrade = finalStudentRows.stream()
                .map(ExamStudentGradeRow::getFinalGrade)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average().orElse(0.0);

        long passedCount = finalStudentRows.stream()
                .filter(row -> "PASSED".equals(row.getStatus()))
                .count();
        double passRate = finalStudentRows.isEmpty() ? 0 : (double) passedCount / finalStudentRows.size() * 100;

        // Re-evaluate isPublished based on loaded class sections (now we have them from
        // above)
        Set<ClassSection> classSectionsForPublished = classSections;
        String publishedAt = null;
        String publishedBy = null;

        if ("RESIT".equalsIgnoreCase(type)) {
            Optional<ClassSection> publishedClass = classSectionsForPublished.stream()
                    .filter(cs -> cs.getResitGradesPublished() && cs.getResitGradesPublishedAt() != null)
                    .findFirst();

            if (publishedClass.isPresent()) {
                ClassSection cs = publishedClass.get();
                publishedAt = cs.getResitGradesPublishedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                if (cs.getResitGradesPublishedBy() != null) {
                    publishedBy = cs.getResitGradesPublishedBy().getFullName();
                }
            }
        } else {
            Optional<ClassSection> publishedClass = classSectionsForPublished.stream()
                    .filter(cs -> cs.getGradesPublished() && cs.getGradesPublishedAt() != null)
                    .findFirst();

            if (publishedClass.isPresent()) {
                ClassSection cs = publishedClass.get();
                publishedAt = cs.getGradesPublishedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                if (cs.getGradesPublishedBy() != null) {
                    publishedBy = cs.getGradesPublishedBy().getFullName();
                }
            }
        }

        // Check explicit statuses
        boolean examPublishedFlag = classSections.stream()
                .anyMatch(cs -> Boolean.TRUE.equals(cs.getGradesPublished()));
        boolean resitPublishedFlag = classSections.stream()
                .anyMatch(cs -> Boolean.TRUE.equals(cs.getResitGradesPublished()));

        return ExamGradeOverviewResponse.builder()
                .courseCode(courseCode)
                .courseName(course.getName())
                .semesterCode(semesterCode)
                .semesterName(semester.getName())
                .totalStudents(finalStudentRows.size())
                .averageGrade(Math.round(averageGrade * 10.0) / 10.0)
                .passRate(Math.round(passRate * 10.0) / 10.0)
                .lastUpdated(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .gradeComponents(componentInfos)
                .studentGrades(finalStudentRows)
                .gradesPublished(isPublished)
                .gradesPublishedAt(publishedAt)
                .gradesPublishedBy(publishedBy)
                .examGradesPublished(examPublishedFlag)
                .resitGradesPublished(resitPublishedFlag)
                .build();
    }

    /**
     * Export exam grades to Excel
     */
    @Transactional(readOnly = true)
    public void exportExamGradesToExcel(String courseCode, String semesterCode, String type,
            String callerRole, HttpServletResponse response) throws IOException {
        ExamGradeOverviewResponse overview = getExamGradeOverview(courseCode, semesterCode, type, callerRole);

        try (Workbook workbook = new XSSFWorkbook()) {
            String sheetName = "RESIT".equalsIgnoreCase(type) ? "Điểm Thi Lại" : "Điểm Thi";
            Sheet sheet = workbook.createSheet(sheetName);

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Data style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Create header row
            Row headerRow = sheet.createRow(0);
            int colIdx = 0;
            createCell(headerRow, colIdx++, "STT", headerStyle);
            createCell(headerRow, colIdx++, "MSSV", headerStyle);
            createCell(headerRow, colIdx++, "Họ tên", headerStyle);
            createCell(headerRow, colIdx++, "Lớp", headerStyle);

            // Grade component headers
            for (ExamGradeComponentInfo comp : overview.getGradeComponents()) {
                createCell(headerRow, colIdx++, comp.getName(), headerStyle);
            }

            // Data rows
            int rowIdx = 1;
            for (ExamStudentGradeRow student : overview.getStudentGrades()) {
                Row row = sheet.createRow(rowIdx);
                colIdx = 0;
                createCell(row, colIdx++, String.valueOf(rowIdx), dataStyle);
                createCell(row, colIdx++, student.getStudentCode(), dataStyle);
                createCell(row, colIdx++, student.getStudentName(), dataStyle);
                createCell(row, colIdx++, student.getClassName(), dataStyle);

                for (ExamGradeComponentInfo comp : overview.getGradeComponents()) {
                    Double score = student.getGrades().get(comp.getId());
                    createCell(row, colIdx++, score != null ? String.format("%.1f", score) : "", dataStyle);
                }
                rowIdx++;
            }

            // Auto-size columns
            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to response
            String filename = String.format("diem_%s_%s_%s.xlsx",
                    "RESIT".equalsIgnoreCase(type) ? "thi_lai" : "thi",
                    courseCode, semesterCode);
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            workbook.write(response.getOutputStream());
        }
    }

    /**
     * Preview exam grade import from Excel
     */
    @Transactional(readOnly = true)
    public Map<String, Object> previewExamGradeImport(String courseCode, String semesterCode, String type,
            MultipartFile file) throws IOException {
        Course course = courseRepository.findByCode(courseCode)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseCode));

        // Get target grade components
        List<GradeComponent.GradeType> targetTypes = "RESIT".equalsIgnoreCase(type) ? RESIT_TYPES : EXAM_TYPES;
        List<GradeComponent> components = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .filter(gc -> targetTypes.contains(gc.getType()))
                .sorted(Comparator.comparing(GradeComponent::getWeight))
                .collect(Collectors.toList());

        // Get existing enrollments
        List<Enrollment> enrollments = enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode);
        Map<String, Enrollment> enrollmentMap = enrollments.stream()
                .collect(Collectors.toMap(e -> e.getStudentCode().toLowerCase(), e -> e));

        // Parse Excel file
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // Find header row (usually row 0)
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new RuntimeException("Format file không hợp lệ: Không tìm thấy dòng tiêu đề");
            }

            // Map column indices to grade components
            Map<Integer, GradeComponent> colToComponent = new HashMap<>();

            // We only care about components that match our target types (ME, FE, PE)
            // But we need to look through ALL columns to find them
            for (int cellIdx = 0; cellIdx < headerRow.getLastCellNum(); cellIdx++) {
                Cell cell = headerRow.getCell(cellIdx);
                if (cell != null) {
                    String headerText = getCellStringValue(cell).toUpperCase();

                    // Try to match with our target components
                    for (GradeComponent gc : components) {
                        // Check if header contains component name (case insensitive)
                        if (headerText.contains(gc.getName().toUpperCase())) {
                            colToComponent.put(cellIdx, gc);
                            break;
                        }
                    }
                }
            }

            if (colToComponent.isEmpty()) {
                throw new RuntimeException(
                        "Không tìm thấy cột điểm nào phù hợp (Midterm, Final, Practical) trong file");
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            List<String> errors = new ArrayList<>();
            int validCount = 0;
            int errorCount = 0;

            // Find data rows (skip first row which is header)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                // Check if row matches expected format (column indices might vary, but assuming
                // MSSV is always col 1)
                // Actually, let's look for MSSV column too if we want to be super robust, but
                // for now assuming std format
                // Export format: STT(0), MSSV(1), Name(2), Class(3)

                Cell mssvCell = row.getCell(1);
                String studentCode = getCellStringValue(mssvCell);
                if (studentCode.isEmpty())
                    continue; // Skip empty rows

                String studentName = getCellStringValue(row.getCell(2)); // Column C = Họ tên
                String className = getCellStringValue(row.getCell(3)); // Column D = Lớp

                Map<String, Object> rowData = new HashMap<>();
                rowData.put("rowNumber", i + 1);
                rowData.put("studentCode", studentCode);
                rowData.put("studentName", studentName);
                rowData.put("className", className);

                // Validate student exists
                Enrollment enrollment = enrollmentMap.get(studentCode.toLowerCase());
                boolean hasError = false;
                String errorMsg = null;

                if (enrollment == null) {
                    errorMsg = "Không tìm thấy sinh viên";
                    hasError = true;
                }

                // Parse grades using the column map
                Map<Long, Double> grades = new HashMap<>();

                for (Map.Entry<Integer, GradeComponent> entry : colToComponent.entrySet()) {
                    int colIdx = entry.getKey();
                    GradeComponent component = entry.getValue();

                    Cell cell = row.getCell(colIdx);
                    Double score = getCellDoubleValue(cell);

                    if (score != null) {
                        if (score < 0 || score > 10) {
                            errorMsg = "Điểm " + component.getName() + " phải từ 0-10";
                            hasError = true;
                        } else {
                            grades.put(component.getId(), score);
                        }
                    }
                }
                rowData.put("grades", grades);

                if (errorMsg != null) {
                    rowData.put("error", errorMsg);
                }

                if (hasError) {
                    errorCount++;
                    rowData.put("status", "ERROR");
                } else if (grades.isEmpty()) {
                    rowData.put("status", "SKIP");
                } else {
                    validCount++;
                    rowData.put("status", "VALID");
                }

                rows.add(rowData);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("rows", rows);
            result.put("totalRows", rows.size());
            result.put("validRows", validCount);
            result.put("errorRows", errorCount);
            // Return only the components we found in the file or allow all target
            // components?
            // Returning target components so UI knows what could be imported
            result.put("components", components.stream()
                    .map(gc -> Map.of(
                            "id", gc.getId(),
                            "name", gc.getName(),
                            "type", gc.getType().name(),
                            "isEditable", true))
                    .collect(Collectors.toList()));

            return result;
        }
    }

    /**
     * Import exam grades from Excel
     */
    @Transactional
    public Map<String, Object> importExamGradesFromExcel(String courseCode, String semesterCode, String type,
            MultipartFile file, Long gradedById) throws IOException {

        Course course = courseRepository.findByCode(courseCode)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseCode));

        User grader = userRepository.findById(gradedById)
                .orElseThrow(() -> new RuntimeException("User not found: " + gradedById));

        // Get target grade components
        List<GradeComponent.GradeType> targetTypes = "RESIT".equalsIgnoreCase(type) ? RESIT_TYPES : EXAM_TYPES;
        List<GradeComponent> components = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .filter(gc -> targetTypes.contains(gc.getType()))
                .sorted(Comparator.comparing(GradeComponent::getWeight))
                .collect(Collectors.toList());

        // Get existing enrollments
        List<Enrollment> enrollments = enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode);
        Map<String, Enrollment> enrollmentMap = enrollments.stream()
                .collect(Collectors.toMap(e -> e.getStudentCode().toLowerCase(), e -> e));

        // Parse and import
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // Find header row
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new RuntimeException("Format file không hợp lệ");
            }

            // Map column indices to grade components
            Map<Integer, GradeComponent> colToComponent = new HashMap<>();

            for (int cellIdx = 0; cellIdx < headerRow.getLastCellNum(); cellIdx++) {
                Cell cell = headerRow.getCell(cellIdx);
                if (cell != null) {
                    String headerText = getCellStringValue(cell).toUpperCase();
                    for (GradeComponent gc : components) {
                        if (headerText.contains(gc.getName().toUpperCase())) {
                            colToComponent.put(cellIdx, gc);
                            break;
                        }
                    }
                }
            }

            int imported = 0;
            int updated = 0;
            int skipped = 0;

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                String studentCode = getCellStringValue(row.getCell(1));
                if (studentCode.isEmpty())
                    continue;

                Enrollment enrollment = enrollmentMap.get(studentCode.toLowerCase());
                if (enrollment == null) {
                    skipped++;
                    continue;
                }

                // ---- Check visibility/editability guards ----
                if ("RESIT".equalsIgnoreCase(type)) {
                    // Guard 1: Exam grades (EXAM type) must be published before allowing Resit
                    // entry
                    if (!Boolean.TRUE.equals(enrollment.getClassSection().getGradesPublished())) {
                        skipped++;
                        continue; // Cannot enter resit grades if exam grades are not published yet
                    }
                    // Guard 2: Resit grades already published – no more editing allowed
                    if (Boolean.TRUE.equals(enrollment.getClassSection().getResitGradesPublished())) {
                        skipped++;
                        continue;
                    }
                    // Guard 3: Only allow resit for students whose current average is < 5.0
                    // Calculate current average using ALL grade components for this enrollment
                    List<StudentGrade> studentAllGrades = studentGradeRepository
                            .findByEnrollmentIdIn(java.util.Collections.singletonList(enrollment.getId()));
                    List<GradeComponent> allGradeComponents = gradeComponentRepository
                            .findByCourseIdOrderById(courseRepository.findByCode(courseCode)
                                    .orElseThrow(() -> new RuntimeException("Course not found")).getId());
                    Map<Long, Double> currentScoresMap = studentAllGrades.stream()
                            .collect(Collectors.toMap(sg -> sg.getGradeComponent().getId(), StudentGrade::getScore,
                                    (a, b) -> a));
                    Map<Long, Double> currentWeightsMap = allGradeComponents.stream()
                            .filter(gc -> !gc.getIsResit())
                            .collect(Collectors.toMap(GradeComponent::getId, GradeComponent::getWeight));

                    Double currentAverage = GradeCalculator.calculateAverage(currentScoresMap, currentWeightsMap);
                    if (currentAverage != null && currentAverage >= 5.0) {
                        skipped++; // Student already passed – no resit allowed
                        continue;
                    }
                } else {
                    // For EXAM type: skip if grades already published
                    if (Boolean.TRUE.equals(enrollment.getClassSection().getGradesPublished())) {
                        skipped++;
                        continue; // Skip if published
                    }
                }

                // Parse and save grades using map
                for (Map.Entry<Integer, GradeComponent> entry : colToComponent.entrySet()) {
                    int colIdx = entry.getKey();
                    GradeComponent component = entry.getValue();

                    Cell cell = row.getCell(colIdx);
                    Double score = getCellDoubleValue(cell);

                    if (score != null && score >= 0 && score <= 10) {
                        Optional<StudentGrade> existingGrade = studentGradeRepository
                                .findByEnrollmentIdAndGradeComponentId(enrollment.getId(), component.getId());

                        // Rounding logic for consistency
                        score = Math.round(score * 10.0) / 10.0;

                        if (existingGrade.isPresent()) {
                            StudentGrade grade = existingGrade.get();
                            // Check if score actually changed
                            if (Math.abs(grade.getScore() - score) > 0.01) {
                                grade.setScore(score);
                                grade.setGradedBy(grader);
                                grade.setGradedAt(LocalDateTime.now());
                                studentGradeRepository.save(grade);
                                updated++;
                            }
                        } else {
                            StudentGrade newGrade = StudentGrade.builder()
                                    .enrollment(enrollment)
                                    .gradeComponent(component)
                                    .score(score)
                                    .gradedBy(grader)
                                    .gradedAt(LocalDateTime.now())
                                    .attempt(1)
                                    .build();
                            studentGradeRepository.save(newGrade);
                            imported++;
                        }
                    }
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("imported", imported);
            result.put("updated", updated);
            result.put("skipped", skipped);
            result.put("success", true);
            result.put("message", String.format("Đã nhập %d điểm mới, cập nhật %d điểm", imported, updated));

            log.info("Imported exam grades for course {} semester {}: {} new, {} updated, {} skipped",
                    courseCode, semesterCode, imported, updated, skipped);

            return result;
        }
    }

    // Helper methods
    private void createCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null)
            return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            default:
                return "";
        }
    }

    private Double getCellDoubleValue(Cell cell) {
        if (cell == null)
            return null;
        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    return cell.getNumericCellValue();
                case STRING:
                    String value = cell.getStringCellValue().trim();
                    if (value.isEmpty())
                        return null;
                    return Double.parseDouble(value);
                default:
                    return null;
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean isBottomType(GradeComponent.GradeType type) {
        return type == GradeComponent.GradeType.FINAL_EXAM || type == GradeComponent.GradeType.RESIT;
    }

    private int getGradeTypePriority(GradeComponent.GradeType type) {
        // Các loại thường (không phải FINAL_EXAM/RESIT)
        switch (type) {
            case PARTICIPATION:
                return 1;
            case QUIZ:
                return 2;
            case PROGRESS_TEST:
                return 3;
            case WORKSHOP:
                return 4;
            case PROJECT:
                return 5;
            case PRESENTATION:
                return 6;
            case ASSIGNMENT:
                return 7;
            case MID_TERM:
                return 8;
            case PRACTICAL_EXAM:
                return 9;
            case OTHER:
                return 10;
            default:
                return 99;
        }
    }

    /**
     * Publish grades for a course in a semester
     * This makes grades visible to students
     */
    @Transactional
    public Map<String, Object> publishGrades(String courseCode, String semesterCode, String type, Long publishedById) {
        Course course = courseRepository.findByCode(courseCode)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseCode));

        User publisher = userRepository.findById(publishedById)
                .orElseThrow(() -> new RuntimeException("User not found: " + publishedById));

        // Get all class sections for this course in this semester
        List<Enrollment> enrollments = enrollmentRepository.findByCourseAndSemester(courseCode, semesterCode);

        // Get unique class sections
        Set<ClassSection> classSections = enrollments.stream()
                .map(Enrollment::getClassSection)
                .collect(Collectors.toSet());

        int publishedCount = 0;
        boolean isResit = "RESIT".equalsIgnoreCase(type);

        // Fetch components relevant to this publish type
        List<GradeComponent> gradeComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .filter(gc -> isResit ? gc.getType() == GradeComponent.GradeType.RESIT
                        : gc.getType() == GradeComponent.GradeType.FINAL_EXAM)
                .collect(Collectors.toList());

        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<StudentGrade> existingGrades = studentGradeRepository.findByEnrollmentIdIn(enrollmentIds);

        // Create map enrollmentId -> componentId -> StudentGrade
        Map<Long, Map<Long, StudentGrade>> gradesMap = new HashMap<>();
        for (StudentGrade grade : existingGrades) {
            gradesMap.computeIfAbsent(grade.getEnrollment().getId(), k -> new HashMap<>())
                    .put(grade.getGradeComponent().getId(), grade);
        }

        List<StudentGrade> newGrades = new ArrayList<>();

        for (ClassSection classSection : classSections) {
            boolean shouldPublish = false;
            if (isResit) {
                if (!classSection.getResitGradesPublished()) {
                    classSection.setResitGradesPublished(true);
                    classSection.setResitGradesPublishedAt(LocalDateTime.now());
                    classSection.setResitGradesPublishedBy(publisher);
                    shouldPublish = true;
                }
            } else {
                if (!classSection.getGradesPublished()) {
                    classSection.setGradesPublished(true);
                    classSection.setGradesPublishedAt(LocalDateTime.now());
                    classSection.setGradesPublishedBy(publisher);
                    shouldPublish = true;
                }
            }

            if (shouldPublish) {
                // Determine enrolled students for this class
                List<Enrollment> classEnrollments = enrollments.stream()
                        .filter(e -> e.getClassSection().getClassName().equals(classSection.getClassName()))
                        .collect(Collectors.toList());

                // Get all grade components for eligibility check
                List<GradeComponent> allCourseComponents = gradeComponentRepository
                        .findByCourseIdOrderById(course.getId());

                // Create missing grades (0.0)
                for (Enrollment en : classEnrollments) {
                    Map<Long, StudentGrade> studentGrades = gradesMap.getOrDefault(en.getId(), new HashMap<>());
                    for (GradeComponent gc : gradeComponents) {
                        if (!studentGrades.containsKey(gc.getId())) {
                            if (isResit) {
                                // For RESIT publish: only auto-fill 0 for students who are actually
                                // eligible for resit (average < 5.0). Students who already passed
                                // should NOT get a 0 RESIT score, otherwise they will show up in the
                                // resit list after publishing.
                                List<StudentGrade> studentAllGrades = existingGrades.stream()
                                        .filter(sg -> sg.getEnrollment().getId().equals(en.getId()))
                                        .collect(Collectors.toList());
                                Map<Long, Double> studentScoresMap = studentAllGrades.stream()
                                        .collect(Collectors.toMap(
                                                sg -> sg.getGradeComponent().getId(),
                                                StudentGrade::getScore,
                                                (a, b) -> a));
                                Map<Long, Double> studentWeightsMap = allCourseComponents.stream()
                                        .filter(comp -> !Boolean.TRUE.equals(comp.getIsResit())
                                                && comp.getType() != GradeComponent.GradeType.RESIT)
                                        .collect(Collectors.toMap(GradeComponent::getId, GradeComponent::getWeight));
                                Double currentAverage = GradeCalculator.calculateAverage(studentScoresMap,
                                        studentWeightsMap);
                                // Only add a 0 resit score if the student was failing (eligible for resit)
                                if (currentAverage == null || currentAverage < 5.0) {
                                    StudentGrade newGrade = new StudentGrade();
                                    newGrade.setEnrollment(en);
                                    newGrade.setGradeComponent(gc);
                                    newGrade.setScore(0.0);
                                    newGrade.setNote("Tự động gán 0 điểm do vắng thi lại khi công bố điểm Thi Lại");
                                    newGrade.setGradedBy(publisher);
                                    newGrade.setGradedAt(LocalDateTime.now());
                                    newGrades.add(newGrade);
                                }
                                // If student already passed → do NOT create a 0 resit score
                            } else {
                                StudentGrade newGrade = new StudentGrade();
                                newGrade.setEnrollment(en);
                                newGrade.setGradeComponent(gc);
                                newGrade.setScore(0.0);
                                newGrade.setNote(
                                        "Tự động gán 0 điểm do báo vắng (hoặc không tham gia) khi công bố điểm Cuối Kỳ");
                                newGrade.setGradedBy(publisher);
                                newGrade.setGradedAt(LocalDateTime.now());
                                newGrades.add(newGrade);
                            }
                        }
                    }
                }

                classSectionRepository.save(classSection);
                publishedCount++;
            }
        }

        if (!newGrades.isEmpty()) {
            studentGradeRepository.saveAll(newGrades);
            log.info("Auto-filled {} zero grades for course {} when publishing {}", newGrades.size(), courseCode, type);
        }

        log.info("Published {} grades for course {} semester {} by user {}: {} classes updated",
                type, courseCode, semesterCode, publishedById, publishedCount);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("publishedClasses", publishedCount);
        result.put("message", "Đã công bố điểm cho " + publishedCount + " lớp học");
        return result;
    }

    /**
     * Checks if a student is eligible for Resit grade entry.
     * 1. Official exam grades must be published.
     * 2. Resit grades must NOT be published yet.
     * 3. Student's current average must be < 5.0.
     */
    public boolean isEligibleForResit(Enrollment enrollment, String courseCode) {
        // Guard 1: Exam grades (EXAM type) must be published before allowing Resit
        // entry
        if (!Boolean.TRUE.equals(enrollment.getClassSection().getGradesPublished())) {
            return false;
        }

        // Guard 2: Resit grades already published – no more editing allowed
        if (Boolean.TRUE.equals(enrollment.getClassSection().getResitGradesPublished())) {
            return false;
        }

        // Guard 3: Only allow resit for students whose current average is < 5.0
        List<StudentGrade> studentAllGrades = studentGradeRepository
                .findByEnrollmentIdIn(java.util.Collections.singletonList(enrollment.getId()));

        Course course = courseRepository.findByCode(courseCode)
                .orElseThrow(() -> new RuntimeException("Course not found: " + courseCode));

        List<GradeComponent> allGradeComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId());

        Map<Long, Double> scoresForCalc = studentAllGrades.stream()
                .collect(java.util.stream.Collectors.toMap(sg -> sg.getGradeComponent().getId(), StudentGrade::getScore,
                        (a, b) -> a));
        Map<Long, Double> weightsForCalc = allGradeComponents.stream()
                .filter(gc -> !Boolean.TRUE.equals(gc.getIsResit()) && gc.getType() != GradeComponent.GradeType.RESIT)
                .collect(java.util.stream.Collectors.toMap(GradeComponent::getId, GradeComponent::getWeight));

        Double currentAverage = GradeCalculator.calculateAverage(scoresForCalc, weightsForCalc);

        return currentAverage != null && currentAverage < 5.0;
    }
}
