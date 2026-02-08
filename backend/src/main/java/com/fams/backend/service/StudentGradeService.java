package com.fams.backend.service;

import com.fams.backend.dto.request.UpdateGradeRequest;
import com.fams.backend.dto.response.GradeOverviewResponse;
import com.fams.backend.dto.response.StudentGradeRowDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentGradeService {

    private final StudentGradeRepository studentGradeRepository;
    private final ClassSectionRepository classSectionRepository;
    private final GradeComponentRepository gradeComponentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    /**
     * Get grade overview for a class section
     */
    @Transactional(readOnly = true)
    public GradeOverviewResponse getGradeOverview(String className) {
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        Course course = classSection.getCourse();
        Semester semester = classSection.getSemester();

        // Get all grade components - sorted by weight ascending, then by numeric suffix
        List<GradeComponent> gradeComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .sorted(gradeComponentComparator())
                .collect(Collectors.toList());
        List<GradeOverviewResponse.GradeComponentInfo> componentInfos = gradeComponents.stream()
                .map(gc -> GradeOverviewResponse.GradeComponentInfo.builder()
                        .id(gc.getId())
                        .name(gc.getName())
                        .type(gc.getType().name())
                        .weight(gc.getWeight())
                        .isRequired(gc.getIsRequired())
                        .isResit(gc.getIsResit())
                        .build())
                .collect(Collectors.toList());

        // Get all enrollments
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);

        // Get all grades for these enrollments
        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<StudentGrade> grades = studentGradeRepository.findByEnrollmentIdIn(enrollmentIds);

        // Map grades by enrollment and component
        Map<Long, Map<Long, Double>> gradesMap = new HashMap<>(); // enrollmentId -> componentId -> score
        for (StudentGrade grade : grades) {
            gradesMap.computeIfAbsent(grade.getEnrollment().getId(), k -> new HashMap<>())
                    .put(grade.getGradeComponent().getId(), grade.getScore());
        }

        // Build student rows
        List<StudentGradeRowDTO> studentRows = enrollments.stream().map(enrollment -> {
            Map<Long, Double> studentGrades = gradesMap.getOrDefault(enrollment.getId(), new HashMap<>());
            Map<Long, Double> gradesForDto = new HashMap<>();

            // Calculate final grade (Average)
            // This logic depends on university rules. For now simple weighted average
            // without Resit
            double totalWeight = 0;
            double weightedSum = 0;
            boolean hasAllRequired = true;

            for (GradeComponent gc : gradeComponents) {
                if (gc.getIsResit())
                    continue; // Skip Resit for main calculation (unless logic changes)

                Double score = studentGrades.get(gc.getId());
                gradesForDto.put(gc.getId(), score);

                if (score != null) {
                    weightedSum += score * gc.getWeight();
                    totalWeight += gc.getWeight();
                } else if (gc.getIsRequired()) {
                    hasAllRequired = false;
                }
            }

            Double finalGrade = null;
            if (totalWeight > 0) {
                // Average based on total 100%? Or total present? Usually total 100%.
                // If some grades missing, final grade might be incomplete.
                // Let's assume final grade is only ready if all required present?
                // Or just show current average.
                finalGrade = weightedSum / 100.0;
            }

            // Simple pass logic (>= 5.0)
            boolean isPassing = finalGrade != null && finalGrade >= 5.0;

            return StudentGradeRowDTO.builder()
                    .enrollmentId(enrollment.getId())
                    .studentCode(enrollment.getStudent().getCode())
                    .studentName(enrollment.getStudent().getFullName())
                    .studentEmail(enrollment.getStudent().getEmail())
                    .enrollmentStatus(enrollment.getStatus().name())
                    .grades(gradesForDto)
                    .finalGrade(finalGrade)
                    .isPassing(isPassing)
                    .build();
        }).collect(Collectors.toList());

        // Sort by student name
        studentRows.sort(Comparator.comparing(StudentGradeRowDTO::getStudentName));

        // Calculate stats
        double averageGrade = studentRows.stream()
                .map(StudentGradeRowDTO::getFinalGrade)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average().orElse(0.0);

        long passedCount = studentRows.stream().filter(row -> Boolean.TRUE.equals(row.getIsPassing())).count();
        double passRate = studentRows.isEmpty() ? 0 : (double) passedCount / studentRows.size() * 100;

        return GradeOverviewResponse.builder()
                .className(className)
                .courseName(course.getName())
                .courseCode(course.getCode())
                .semesterName(semester.getName())
                .status(classSection.getStatus().name())
                .totalStudents(studentRows.size())
                .gradeComponents(componentInfos)
                .studentGrades(studentRows)
                .averageGrade(Math.round(averageGrade * 10.0) / 10.0)
                .passRate(Math.round(passRate * 10.0) / 10.0)
                .lastUpdated(LocalDateTime.now().toString())
                .gradesSubmitted(classSection.getGradesSubmitted())
                .gradesSubmittedAt(classSection.getGradesSubmittedAt() != null
                        ? classSection.getGradesSubmittedAt().toString()
                        : null)
                .gradesSubmittedByName(classSection.getGradesSubmittedBy() != null
                        ? classSection.getGradesSubmittedBy().getFullName()
                        : null)
                .build();
    }

    /**
     * Update a single grade
     */
    @Transactional
    public void updateGrade(UpdateGradeRequest request, Long updatedById) {
        Enrollment enrollment = enrollmentRepository.findById(request.getEnrollmentId())
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        // Check if grades are already submitted
        ClassSection classSection = enrollment.getClassSection();
        if (Boolean.TRUE.equals(classSection.getGradesSubmitted())) {
            throw new RuntimeException("Không thể chỉnh sửa điểm. Điểm đã được gửi cho phòng đào tạo.");
        }

        GradeComponent gradeComponent = gradeComponentRepository.findById(request.getGradeComponentId())
                .orElseThrow(() -> new RuntimeException("Grade component not found"));

        User updatedBy = userRepository.findById(updatedById)
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudentGrade grade = studentGradeRepository
                .findByEnrollmentIdAndGradeComponentId(enrollment.getId(), gradeComponent.getId())
                .orElse(StudentGrade.builder()
                        .enrollment(enrollment)
                        .gradeComponent(gradeComponent)
                        .attempt(1)
                        .build());

        grade.setScore(request.getScore());
        grade.setNote(request.getNote());
        grade.setGradedAt(LocalDateTime.now());
        grade.setGradedBy(updatedBy);

        studentGradeRepository.save(grade);
    }

    /**
     * Batch update grades
     */
    @Transactional
    public void updateGradesBatch(List<UpdateGradeRequest> requests, Long updatedById) {
        for (UpdateGradeRequest req : requests) {
            updateGrade(req, updatedById);
        }
    }

    /**
     * Submit grades to academic office
     * This will lock the grades from further editing by the lecturer
     */
    @Transactional
    public void submitGrades(String className, Long submittedById) {
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        if (Boolean.TRUE.equals(classSection.getGradesSubmitted())) {
            throw new RuntimeException("Điểm đã được gửi trước đó.");
        }

        User submittedBy = userRepository.findById(submittedById)
                .orElseThrow(() -> new RuntimeException("User not found"));

        classSection.setGradesSubmitted(true);
        classSection.setGradesSubmittedAt(LocalDateTime.now());
        classSection.setGradesSubmittedBy(submittedBy);

        classSectionRepository.save(classSection);
        log.info("Grades submitted for class {} by user {}", className, submittedById);
    }

    /**
     * Export grades to Excel - only editable components, sorted by weight ascending
     */
    @Transactional(readOnly = true)
    public void exportGradesToExcel(String className, jakarta.servlet.http.HttpServletResponse response)
            throws java.io.IOException {
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        Course course = classSection.getCourse();
        Semester semester = classSection.getSemester();

        // Get only editable components (exclude PE, MidTerm, Final, Resit)
        // Sort by weight ascending (lowest first), then by name for same weight
        List<GradeComponent> editableComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .filter(gc -> !gc.getIsResit())
                .filter(gc -> gc.getType() != GradeComponent.GradeType.FINAL_EXAM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.RESIT)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.MID_TERM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.PRACTICAL_EXAM)
                .sorted(gradeComponentComparator())
                .collect(Collectors.toList());

        // Get enrollments and grades
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<StudentGrade> grades = studentGradeRepository.findByEnrollmentIdIn(enrollmentIds);

        // Map grades by enrollment and component
        Map<Long, Map<Long, Double>> gradesMap = new HashMap<>();
        for (StudentGrade grade : grades) {
            gradesMap.computeIfAbsent(grade.getEnrollment().getId(), k -> new HashMap<>())
                    .put(grade.getGradeComponent().getId(), grade.getScore());
        }

        try (org.apache.poi.xssf.streaming.SXSSFWorkbook workbook = new org.apache.poi.xssf.streaming.SXSSFWorkbook(
                100)) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Grades");
            ((org.apache.poi.xssf.streaming.SXSSFSheet) sheet).trackAllColumnsForAutoSizing();

            // Create header style
            org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            // Title rows
            org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BẢNG ĐIỂM LỚP: " + className);

            org.apache.poi.ss.usermodel.Row courseRow = sheet.createRow(1);
            courseRow.createCell(0)
                    .setCellValue("Môn học: " + course.getName() + " (" + course.getCode() + ")");

            org.apache.poi.ss.usermodel.Row semesterRow = sheet.createRow(2);
            semesterRow.createCell(0).setCellValue("Học kỳ: " + semester.getName());

            // Header row - only editable components
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(4);
            int colIdx = 0;
            createHeaderCell(headerRow, colIdx++, "STT", headerStyle);
            createHeaderCell(headerRow, colIdx++, "MSSV", headerStyle);
            createHeaderCell(headerRow, colIdx++, "Họ và tên", headerStyle);

            // Grade component columns (only editable ones, sorted by weight)
            for (GradeComponent gc : editableComponents) {
                createHeaderCell(headerRow, colIdx++, gc.getName() + " (" + gc.getWeight().intValue() + "%)",
                        headerStyle);
            }

            // Data rows
            int rowIdx = 5;
            int stt = 1;
            org.apache.poi.ss.usermodel.CellStyle normalStyle = workbook.createCellStyle();
            normalStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            normalStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            normalStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
            normalStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);

            // Sort enrollments by student name
            enrollments.sort(Comparator.comparing(e -> e.getStudent().getFullName()));

            for (Enrollment enrollment : enrollments) {
                Map<Long, Double> studentGrades = gradesMap.getOrDefault(enrollment.getId(), new HashMap<>());
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                colIdx = 0;
                createCell(row, colIdx++, String.valueOf(stt++), normalStyle);
                createCell(row, colIdx++, enrollment.getStudent().getCode(), normalStyle);
                createCell(row, colIdx++, enrollment.getStudent().getFullName(), normalStyle);

                for (GradeComponent gc : editableComponents) {
                    Double score = studentGrades.get(gc.getId());
                    createCell(row, colIdx++, score != null ? String.format("%.1f", score) : "", normalStyle);
                }
            }

            // Auto-size columns
            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(response.getOutputStream());
        }
    }

    private void createHeaderCell(org.apache.poi.ss.usermodel.Row row, int col, String value,
            org.apache.poi.ss.usermodel.CellStyle style) {
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void createCell(org.apache.poi.ss.usermodel.Row row, int col, String value,
            org.apache.poi.ss.usermodel.CellStyle style) {
        org.apache.poi.ss.usermodel.Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    /**
     * Import grades from Excel
     * - Editable components only (exclude PE, MidTerm, Final, Resit)
     * - Empty cells will DELETE the grade
     * - Components sorted by weight ascending
     */
    @Transactional
    public Map<String, Object> importGradesFromExcel(String className,
            org.springframework.web.multipart.MultipartFile file, Long gradedById) throws java.io.IOException {
        // Validate class exists
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        Course course = classSection.getCourse();
        // Exclude FINAL_EXAM, RESIT, MID_TERM, PRACTICAL_EXAM from import
        // Sort by weight ascending, then by name
        List<GradeComponent> gradeComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .filter(gc -> !gc.getIsResit())
                .filter(gc -> gc.getType() != GradeComponent.GradeType.FINAL_EXAM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.RESIT)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.MID_TERM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.PRACTICAL_EXAM)
                .sorted(gradeComponentComparator())
                .collect(Collectors.toList());

        // Get enrollments map by student code
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        Map<String, Enrollment> enrollmentByCode = enrollments.stream()
                .collect(Collectors.toMap(e -> e.getStudent().getCode().toUpperCase(), e -> e));

        User gradedBy = userRepository.findById(gradedById)
                .orElseThrow(() -> new RuntimeException("User not found"));

        int successCount = 0;
        int deletedCount = 0;
        int failedCount = 0;
        List<String> errors = new ArrayList<>();

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook(
                file.getInputStream())) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);

            // Find header row (looking for MSSV column)
            int headerRowIdx = -1;
            int mssvColIdx = -1;
            for (int i = 0; i <= 10; i++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(i);
                if (row != null) {
                    for (int j = 0; j < 10; j++) {
                        org.apache.poi.ss.usermodel.Cell cell = row.getCell(j);
                        if (cell != null && "MSSV".equalsIgnoreCase(getCellStringValue(cell))) {
                            headerRowIdx = i;
                            mssvColIdx = j;
                            break;
                        }
                    }
                }
                if (headerRowIdx >= 0)
                    break;
            }

            if (headerRowIdx < 0) {
                throw new RuntimeException("Không tìm thấy cột MSSV trong file");
            }

            org.apache.poi.ss.usermodel.Row headerRow = sheet.getRow(headerRowIdx);

            // Map column indices to grade components
            Map<Integer, GradeComponent> colToComponent = new HashMap<>();
            for (int j = mssvColIdx + 2; j < headerRow.getLastCellNum(); j++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.getCell(j);
                if (cell != null) {
                    String headerText = getCellStringValue(cell);
                    for (GradeComponent gc : gradeComponents) {
                        if (headerText.toUpperCase().contains(gc.getName().toUpperCase())) {
                            colToComponent.put(j, gc);
                            break;
                        }
                    }
                }
            }

            // Process data rows
            for (int i = headerRowIdx + 1; i <= sheet.getLastRowNum(); i++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                org.apache.poi.ss.usermodel.Cell mssvCell = row.getCell(mssvColIdx);
                if (mssvCell == null)
                    continue;

                String mssv = getCellStringValue(mssvCell).toUpperCase().trim();
                if (mssv.isEmpty())
                    continue;

                Enrollment enrollment = enrollmentByCode.get(mssv);
                if (enrollment == null) {
                    errors.add("Dòng " + (i + 1) + ": Không tìm thấy sinh viên " + mssv);
                    failedCount++;
                    continue;
                }

                // Process each grade column
                for (Map.Entry<Integer, GradeComponent> entry : colToComponent.entrySet()) {
                    GradeComponent gc = entry.getValue();
                    org.apache.poi.ss.usermodel.Cell gradeCell = row.getCell(entry.getKey());

                    String cellValue = (gradeCell != null) ? getCellStringValueRaw(gradeCell) : null;
                    boolean isEmpty = (cellValue == null || cellValue.trim().isEmpty());

                    // Find existing grade
                    var existingGrade = studentGradeRepository
                            .findByEnrollmentIdAndGradeComponentId(enrollment.getId(), gc.getId());

                    if (isEmpty) {
                        // Empty cell = DELETE the grade
                        if (existingGrade.isPresent()) {
                            studentGradeRepository.delete(existingGrade.get());
                            deletedCount++;
                        }
                        continue;
                    }

                    // Not empty - validate and save
                    Double score = getCellDoubleValue(gradeCell);
                    if (score == null) {
                        errors.add("Dòng " + (i + 1) + ", " + gc.getName() + ": Giá trị không hợp lệ");
                        continue;
                    }

                    // Round to 1 decimal place
                    score = Math.round(score * 10.0) / 10.0;

                    if (score < 0 || score > 10) {
                        errors.add("Dòng " + (i + 1) + ": Điểm phải từ 0-10");
                        continue;
                    }

                    // Save or update grade
                    StudentGrade grade = existingGrade.orElse(StudentGrade.builder()
                            .enrollment(enrollment)
                            .gradeComponent(gc)
                            .attempt(1)
                            .build());

                    grade.setScore(score);
                    grade.setGradedAt(LocalDateTime.now());
                    grade.setGradedBy(gradedBy);
                    studentGradeRepository.save(grade);
                    successCount++;
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", successCount);
        result.put("deleted", deletedCount);
        result.put("failed", failedCount);
        result.put("errors", errors);
        log.info("Imported grades for class {}: {} success, {} deleted, {} failed", className, successCount,
                deletedCount, failedCount);
        return result;
    }

    /**
     * Preview grade import with validation (no database changes)
     * Returns detailed row data for table display like ImportLecturerModal
     */
    public Map<String, Object> previewGradeImport(String className,
            org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        long startTime = System.currentTimeMillis();

        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        Course course = classSection.getCourse();
        // Exclude FINAL_EXAM, RESIT, MID_TERM, PRACTICAL_EXAM from preview
        // Sort by weight ascending (lowest first), then by name
        List<GradeComponent> gradeComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId())
                .stream()
                .filter(gc -> !gc.getIsResit())
                .filter(gc -> gc.getType() != GradeComponent.GradeType.FINAL_EXAM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.RESIT)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.MID_TERM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.PRACTICAL_EXAM)
                .sorted(gradeComponentComparator())
                .collect(Collectors.toList());

        // Build list of component names for frontend column headers
        List<String> componentNames = gradeComponents.stream()
                .map(GradeComponent::getName)
                .collect(Collectors.toList());

        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        Map<String, Enrollment> enrollmentByCode = enrollments.stream()
                .collect(Collectors.toMap(e -> e.getStudent().getCode().toUpperCase(), e -> e));

        int totalRows = 0;
        int validRows = 0;
        int errorRows = 0;
        List<Map<String, Object>> previewRows = new ArrayList<>();

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook(
                file.getInputStream())) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);

            int headerRowIdx = -1;
            int mssvColIdx = -1;
            int nameColIdx = -1;
            for (int i = 0; i <= 10; i++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(i);
                if (row != null) {
                    for (int j = 0; j < 10; j++) {
                        org.apache.poi.ss.usermodel.Cell cell = row.getCell(j);
                        if (cell != null && "MSSV".equalsIgnoreCase(getCellStringValue(cell))) {
                            headerRowIdx = i;
                            mssvColIdx = j;
                            nameColIdx = j + 1; // Typically name is right after MSSV
                            break;
                        }
                    }
                }
                if (headerRowIdx >= 0)
                    break;
            }

            if (headerRowIdx < 0) {
                Map<String, Object> result = new HashMap<>();
                result.put("success", false);
                result.put("totalRows", 0);
                result.put("validRows", 0);
                result.put("errorRows", 1);
                result.put("canImport", false);
                result.put("message", "Không tìm thấy cột MSSV trong file");
                result.put("previewRows", List.of());
                result.put("componentNames", List.of());
                return result;
            }

            org.apache.poi.ss.usermodel.Row headerRow = sheet.getRow(headerRowIdx);
            Map<Integer, GradeComponent> colToComponent = new HashMap<>();
            for (int j = mssvColIdx + 2; j < headerRow.getLastCellNum(); j++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.getCell(j);
                if (cell != null) {
                    String headerText = getCellStringValue(cell).trim();
                    String headerUpper = headerText.toUpperCase();
                    for (GradeComponent gc : gradeComponents) {
                        String componentName = gc.getName().trim();
                        String componentUpper = componentName.toUpperCase();
                        // Bi-directional matching: either header contains component name OR component
                        // name contains header
                        // This handles cases like "Assignment" matching "Assignment (Copy)"
                        if (headerUpper.contains(componentUpper) || componentUpper.contains(headerUpper)) {
                            colToComponent.put(j, gc);
                            break;
                        }
                    }
                }
            }

            for (int i = headerRowIdx + 1; i <= sheet.getLastRowNum(); i++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                org.apache.poi.ss.usermodel.Cell mssvCell = row.getCell(mssvColIdx);
                if (mssvCell == null)
                    continue;

                String mssv = getCellStringValue(mssvCell).toUpperCase().trim();
                if (mssv.isEmpty())
                    continue;

                totalRows++;
                List<String> rowErrors = new ArrayList<>();
                Map<String, Double> rowGrades = new LinkedHashMap<>();

                // Get student name from file or from enrollment
                String studentName = "";
                if (nameColIdx >= 0) {
                    org.apache.poi.ss.usermodel.Cell nameCell = row.getCell(nameColIdx);
                    if (nameCell != null) {
                        studentName = getCellStringValue(nameCell);
                    }
                }

                Enrollment enrollment = enrollmentByCode.get(mssv);
                if (enrollment == null) {
                    rowErrors.add("Sinh viên không tồn tại trong lớp");
                } else if (studentName.isEmpty()) {
                    studentName = enrollment.getStudent().getFullName();
                }

                for (Map.Entry<Integer, GradeComponent> entry : colToComponent.entrySet()) {
                    org.apache.poi.ss.usermodel.Cell gradeCell = row.getCell(entry.getKey());
                    String componentName = entry.getValue().getName();

                    if (gradeCell == null) {
                        rowGrades.put(componentName, null);
                        continue;
                    }

                    String cellValue = getCellStringValueRaw(gradeCell);
                    // Strictly skip empty cells
                    if (cellValue == null || cellValue.trim().isEmpty()) {
                        rowGrades.put(componentName, null);
                        continue;
                    }

                    // Check for non-numeric characters
                    try {
                        double score = Double.parseDouble(cellValue.replace(",", "."));
                        score = Math.round(score * 10.0) / 10.0; // Round to 1 decimal
                        rowGrades.put(componentName, score);

                        if (score < 0) {
                            rowErrors.add(componentName + ": Điểm âm không hợp lệ");
                        } else if (score > 10) {
                            rowErrors.add(componentName + ": Điểm phải từ 0-10");
                        }
                    } catch (NumberFormatException e) {
                        rowGrades.put(componentName, null);
                        rowErrors.add(componentName + ": '" + cellValue + "' không phải số");
                    }
                }

                // Build preview row
                Map<String, Object> previewRow = new LinkedHashMap<>();
                previewRow.put("rowNumber", i + 1);
                previewRow.put("studentCode", mssv);
                previewRow.put("studentName", studentName);
                previewRow.put("grades", rowGrades);
                previewRow.put("status", rowErrors.isEmpty() ? "VALID" : "ERROR");
                previewRow.put("errorMessage", rowErrors.isEmpty() ? null : String.join("; ", rowErrors));
                previewRows.add(previewRow);

                if (rowErrors.isEmpty()) {
                    validRows++;
                } else {
                    errorRows++;
                }
            }
        }

        long durationMs = System.currentTimeMillis() - startTime;

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalRows", totalRows);
        result.put("validRows", validRows);
        result.put("errorRows", errorRows);
        // Allow import if there are rows to process and no errors (even if validRows is
        // 0 - for deleting all grades)
        result.put("canImport", errorRows == 0 && totalRows > 0);
        result.put("previewRows", previewRows);
        result.put("componentNames", componentNames);
        result.put("durationMs", durationMs);
        result.put("message", errorRows == 0
                ? (validRows > 0 ? validRows + " dòng hợp lệ, sẵn sàng import"
                        : "Tất cả điểm sẽ bị xóa, sẵn sàng import")
                : "Có " + errorRows + " dòng lỗi. Vui lòng sửa file và thử lại.");
        return result;
    }

    private String getCellStringValue(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null)
            return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            default:
                return "";
        }
    }

    private String getCellStringValueRaw(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null)
            return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf(cell.getNumericCellValue());
            case BLANK:
                return "";
            default:
                return "";
        }
    }

    private Double getCellDoubleValue(org.apache.poi.ss.usermodel.Cell cell) {
        if (cell == null)
            return null;
        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                try {
                    String val = cell.getStringCellValue().trim().replace(",", ".");
                    return val.isEmpty() ? null : Double.parseDouble(val);
                } catch (NumberFormatException e) {
                    return null;
                }
            default:
                return null;
        }
    }

    /**
     * Extract numeric suffix from component name for sorting
     * e.g., "Progress Test 1" => 1, "Assignment 2" => 2, "Quiz" => 0
     */
    private int extractNumberFromName(String name) {
        if (name == null || name.isEmpty())
            return 0;
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(\\d+)$").matcher(name.trim());
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 0;
    }

    /**
     * Comparator for grade components: sort by weight ascending, then by numeric
     * suffix
     */
    private Comparator<GradeComponent> gradeComponentComparator() {
        return Comparator.comparing(GradeComponent::getWeight)
                .thenComparing(gc -> extractNumberFromName(gc.getName()));
    }
}
