package com.fams.backend.service;

import com.fams.backend.dto.request.UpdateGradeRequest;
import com.fams.backend.dto.response.GradeOverviewResponse;
import com.fams.backend.dto.response.StudentAllGradesSummaryResponse;
import com.fams.backend.dto.response.StudentCourseOptionResponse;
import com.fams.backend.dto.response.StudentGradeRowDTO;
import com.fams.backend.dto.response.StudentMyGradeResponse;
import com.fams.backend.dto.response.StudentResponse;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.util.GradeCalculator;
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
    private final NotificationService notificationService;
    private final SpecializationCourseRepository specializationCourseRepository;
    private final SubSpecializationCourseRepository subSpecializationCourseRepository;
    private final StudentAttendanceRepository studentAttendanceRepository;

    /**
     * Get grade overview for a class section
     */
    @Transactional(readOnly = true)
    public GradeOverviewResponse getGradeOverview(String className, String callerRole) {
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        Course course = classSection.getCourse();
        Semester semester = classSection.getSemester();

        List<GradeComponent> gradeComponents = getSortedGradeComponents(course.getId());
        List<GradeOverviewResponse.GradeComponentInfo> componentInfos = gradeComponents.stream()
                .map(gc -> GradeOverviewResponse.GradeComponentInfo.builder()
                        .id(gc.getId())
                        .name(gc.getName())
                        .type(gc.getType().name())
                        .weight(gc.getWeight())
                        .isResit(gc.getIsResit())
                        .build())
                .collect(Collectors.toList());

        // Academic Staff can only see grades after Lecturer has submitted them
        // Lecturer has full access at all times (to manage & review their own grades)
        boolean gradesSubmitted = Boolean.TRUE.equals(classSection.getGradesSubmitted());
        boolean hideGradesForAcademic = "ACADEMIC_STAFF".equals(callerRole) && !gradesSubmitted;

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
            // If role is ACADEMIC_STAFF and grades not submitted yet → hide all scores
            if (hideGradesForAcademic) {
                return StudentGradeRowDTO.builder()
                        .enrollmentId(enrollment.getId())
                        .studentCode(enrollment.getStudent().getCode())
                        .studentName(enrollment.getStudent().getFullName())
                        .studentEmail(enrollment.getStudent().getEmail())
                        .enrollmentStatus(enrollment.getStatus().name())
                        .grades(new HashMap<>())
                        .finalGrade(null)
                        .isPassing(null)
                        .build();
            }

            Map<Long, Double> studentGrades = gradesMap.getOrDefault(enrollment.getId(), new HashMap<>());
            Map<Long, Double> gradesForDto = new HashMap<>();

            Map<Long, Double> scoresForCalc = new HashMap<>();
            Map<Long, Double> weightsForCalc = new HashMap<>();

            Map<GradeComponent.GradeType, Double> typeTotalScores = new HashMap<>();
            Map<GradeComponent.GradeType, Boolean> typeHasComponent = new HashMap<>();

            boolean hasMissingOrZero = false;
            boolean hasFailedExam = false;

            for (GradeComponent gc : gradeComponents) {
                if (gc.getIsResit())
                    continue; // Skip Resit for main calculation

                Double score = studentGrades.get(gc.getId());
                gradesForDto.put(gc.getId(), score);

                typeHasComponent.put(gc.getType(), true);
                if (score != null) {
                    scoresForCalc.put(gc.getId(), score);
                    typeTotalScores.put(gc.getType(), typeTotalScores.getOrDefault(gc.getType(), 0.0) + score);
                    
                    if (gc.getType() == GradeComponent.GradeType.FINAL_EXAM && score < 4.0) {
                        hasFailedExam = true;
                    }
                } else {
                    typeTotalScores.put(gc.getType(), typeTotalScores.getOrDefault(gc.getType(), 0.0));
                }
                weightsForCalc.put(gc.getId(), gc.getWeight());
            }

            for (Map.Entry<GradeComponent.GradeType, Boolean> typeEntry : typeHasComponent.entrySet()) {
                if (typeEntry.getValue()) {
                    Double total = typeTotalScores.getOrDefault(typeEntry.getKey(), 0.0);
                    if (total <= 0.0) {
                        hasMissingOrZero = true;
                        break;
                    }
                }
            }

            Double finalGrade = GradeCalculator.calculateAverage(scoresForCalc, weightsForCalc);

            // Check attendance failure
            boolean hasFailedAttendance = checkAttendanceFailure(enrollment.getStudent().getId(), className,
                    course.getNumberOfSlots());

            // Updated pass logic using helper
            boolean isPassing = calculatePassStatus(finalGrade, hasMissingOrZero, hasFailedExam, hasFailedAttendance);

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

        // Calculate stats (only for visible data)
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
        User updatedBy = userRepository.findById(updatedById)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Enrollment enrollment = enrollmentRepository.findById(request.getEnrollmentId())
                .orElseThrow(() -> new RuntimeException("Enrollment not found"));

        // Check if grades are already submitted
        ClassSection classSection = enrollment.getClassSection();
        boolean isAcademicStaff = User.UserRole.ACADEMIC_STAFF.equals(updatedBy.getRole());
        
        if (!isAcademicStaff && Boolean.TRUE.equals(classSection.getGradesSubmitted())) {
            throw new RuntimeException("Không thể chỉnh sửa điểm. Điểm đã được gửi cho phòng đào tạo.");
        }

        GradeComponent gradeComponent = gradeComponentRepository.findById(request.getGradeComponentId())
                .orElseThrow(() -> new RuntimeException("Grade component not found"));

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
        if (requests == null || requests.isEmpty())
            return;

        User updatedBy = userRepository.findById(updatedById)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Pre-fetch all needed entities to avoid N+1 problem
        Set<Long> enrollmentIds = requests.stream().map(UpdateGradeRequest::getEnrollmentId)
                .collect(Collectors.toSet());
        Set<Long> gradeComponentIds = requests.stream().map(UpdateGradeRequest::getGradeComponentId)
                .collect(Collectors.toSet());

        Map<Long, Enrollment> enrollmentMap = enrollmentRepository.findAllById(enrollmentIds).stream()
                .collect(Collectors.toMap(Enrollment::getId, e -> e));
        Map<Long, GradeComponent> gradeComponentMap = gradeComponentRepository.findAllById(gradeComponentIds).stream()
                .collect(Collectors.toMap(GradeComponent::getId, gc -> gc));

        // Find existing grades to update
        List<StudentGrade> existingGradesList = studentGradeRepository.findByEnrollmentIdIn(enrollmentIds);
        Map<String, StudentGrade> existingGradesMap = existingGradesList.stream()
                .collect(
                        Collectors.toMap(g -> g.getEnrollment().getId() + "_" + g.getGradeComponent().getId(), g -> g));

        List<StudentGrade> toSave = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        boolean isAcademicStaff = User.UserRole.ACADEMIC_STAFF.equals(updatedBy.getRole());

        for (UpdateGradeRequest req : requests) {
            Enrollment enrollment = enrollmentMap.get(req.getEnrollmentId());
            if (enrollment == null)
                continue;

            // Check if grades are already submitted
            if (!isAcademicStaff && Boolean.TRUE.equals(enrollment.getClassSection().getGradesSubmitted())) {
                throw new RuntimeException("Không thể chỉnh sửa điểm. Điểm đã được gửi cho phòng đào tạo.");
            }

            GradeComponent gradeComponent = gradeComponentMap.get(req.getGradeComponentId());
            if (gradeComponent == null)
                continue;

            String key = enrollment.getId() + "_" + gradeComponent.getId();
            StudentGrade grade = existingGradesMap.getOrDefault(key, StudentGrade.builder()
                    .enrollment(enrollment)
                    .gradeComponent(gradeComponent)
                    .attempt(1)
                    .build());

            grade.setScore(req.getScore());
            grade.setNote(req.getNote());
            grade.setGradedAt(now);
            grade.setGradedBy(updatedBy);

            toSave.add(grade);
        }

        if (!toSave.isEmpty()) {
            studentGradeRepository.saveAll(toSave);
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

        // Check if all students have all required grades before submitting
        Course course = classSection.getCourse();
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        List<GradeComponent> editableComponents = getEditableGradeComponents(course.getId());

        List<Long> enrollmentIds = enrollments.stream().map(Enrollment::getId).collect(Collectors.toList());
        List<StudentGrade> existingGrades = studentGradeRepository.findByEnrollmentIdIn(enrollmentIds);

        // Tạo map: enrollmentId -> componentId -> StudentGrade
        Map<Long, Map<Long, StudentGrade>> gradesMap = new HashMap<>();
        for (StudentGrade grade : existingGrades) {
            gradesMap.computeIfAbsent(grade.getEnrollment().getId(), k -> new HashMap<>())
                    .put(grade.getGradeComponent().getId(), grade);
        }

        List<String> missingGradesMessages = new ArrayList<>();
        for (Enrollment en : enrollments) {
            Map<Long, StudentGrade> studentGrades = gradesMap.getOrDefault(en.getId(), new HashMap<>());
            for (GradeComponent gc : editableComponents) {
                if (!studentGrades.containsKey(gc.getId())) {
                    missingGradesMessages.add(en.getStudent().getCode() + " thiếu " + gc.getName());
                }
            }
        }

        if (!missingGradesMessages.isEmpty()) {
            throw new RuntimeException("Vui lòng nhập đầy đủ điểm thành phần cho tất cả sinh viên trước khi nộp. Còn thiếu " + missingGradesMessages.size() + " trường hợp (ví dụ: " + missingGradesMessages.get(0) + ").");
        }

        classSection.setGradesSubmitted(true);
        classSection.setGradesSubmittedAt(LocalDateTime.now());
        classSection.setGradesSubmittedBy(submittedBy);

        classSectionRepository.save(classSection);
        log.info("Grades submitted for class {} by user {}", className, submittedById);

        // --- ADDED: Send Notification to Students ---
        List<User> studentsToNotify = enrollments.stream()
                .map(Enrollment::getStudent)
                .collect(Collectors.toList());
        notificationService.notifyStudentsGradesPublished(studentsToNotify, course, "COMPONENT", submittedBy);

        // --- ADDED: Send Notification to Academic Staff ---
        notificationService.notifyAcademicStaffGradesSubmitted(classSection, submittedBy);
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

        List<GradeComponent> editableComponents = getEditableGradeComponents(course.getId());

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
        List<GradeComponent> gradeComponents = getEditableGradeComponents(course.getId());

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
        // Sort by specific rules
        List<GradeComponent> gradeComponents = getEditableGradeComponents(course.getId());

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
     * Comparator for grade components:
     * 1. FINAL_EXAM và RESIT luôn ở cuối
     * 2. Sort by TOTAL WEIGHT of Grade Type ascending
     * 3. Sort by type priority
     * 4. Sort by name (numeric-aware)
     */
    private Comparator<GradeComponent> gradeComponentComparator(
            Map<GradeComponent.GradeType, Double> typeTotalWeights) {
        return (a, b) -> {
            // 1. FINAL_EXAM và RESIT luôn xuống cuối
            boolean isABottom = a.getType() == GradeComponent.GradeType.FINAL_EXAM ||
                    a.getType() == GradeComponent.GradeType.RESIT;
            boolean isBBottom = b.getType() == GradeComponent.GradeType.FINAL_EXAM ||
                    b.getType() == GradeComponent.GradeType.RESIT;

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
            double totalWeightA = typeTotalWeights.getOrDefault(a.getType(), 0.0);
            double totalWeightB = typeTotalWeights.getOrDefault(b.getType(), 0.0);
            int totalWeightCompare = Double.compare(totalWeightA, totalWeightB);

            if (totalWeightCompare != 0)
                return totalWeightCompare;

            // Ưu tiên B: Sort by type priority
            int typePriorityCompare = Integer.compare(getGradeTypePriority(a.getType()),
                    getGradeTypePriority(b.getType()));
            if (typePriorityCompare != 0)
                return typePriorityCompare;

            // 3. Finally by name (numeric-aware)
            int numA = extractNumberFromName(a.getName());
            int numB = extractNumberFromName(b.getName());
            if (numA != numB)
                return Integer.compare(numA, numB);

            return a.getName().compareTo(b.getName());
        };
    }

    private int getGradeTypePriority(GradeComponent.GradeType type) {
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
     * Determines the pass/fail status based on standard rules:
     * 1. No missing or zero grades in required components
     * 2. No failed final exam (score < 4.0)
     * 3. Final average >= 5.0
     * 4. Absent < 20%
     */
    private boolean calculatePassStatus(Double finalGrade, boolean hasMissingOrZero, boolean hasFailedExam,
            boolean hasFailedAttendance) {
        return !hasMissingOrZero && !hasFailedExam && !hasFailedAttendance && finalGrade != null && finalGrade >= 5.0;
    }

    /**
     * Checks if a student has failed due to excessive absence (> 20% of total
     * slots).
     */
    private boolean checkAttendanceFailure(Long studentId, String className, Integer totalSlots) {
        if (totalSlots == null || totalSlots <= 0)
            return false;

        List<StudentAttendance> attendances = studentAttendanceRepository.findByStudentIdAndClassName(studentId,
                className);
        if (attendances == null || attendances.isEmpty())
            return false;

        long absentCount = attendances.stream()
                .filter(a -> a.getStatus() == StudentAttendance.AttendanceStatus.ABSENT)
                .count();

        // Failed if absent more than 20%
        return ((double) absentCount / totalSlots) > 0.20;
    }

    /**
     * Gets all grade components for a course, sorted by their appropriate rules.
     */
    private List<GradeComponent> getSortedGradeComponents(Long courseId) {
        List<GradeComponent> rawComponents = gradeComponentRepository.findByCourseIdOrderById(courseId);
        Map<GradeComponent.GradeType, Double> typeTotalWeights = rawComponents.stream()
                .collect(Collectors.groupingBy(GradeComponent::getType,
                        Collectors.summingDouble(GradeComponent::getWeight)));

        return rawComponents.stream()
                .sorted(gradeComponentComparator(typeTotalWeights))
                .collect(Collectors.toList());
    }

    /**
     * Gets only the editable grade components (excludes PE, MidTerm, Final, Resit),
     * sorted by their appropriate rules.
     */
    private List<GradeComponent> getEditableGradeComponents(Long courseId) {
        List<GradeComponent> rawEditableComponents = gradeComponentRepository.findByCourseIdOrderById(courseId)
                .stream()
                .filter(gc -> !gc.getIsResit())
                .filter(gc -> gc.getType() != GradeComponent.GradeType.FINAL_EXAM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.RESIT)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.MID_TERM)
                .filter(gc -> gc.getType() != GradeComponent.GradeType.PRACTICAL_EXAM)
                .collect(Collectors.toList());

        Map<GradeComponent.GradeType, Double> typeTotalWeights = rawEditableComponents.stream()
                .collect(Collectors.groupingBy(GradeComponent::getType,
                        Collectors.summingDouble(GradeComponent::getWeight)));

        return rawEditableComponents.stream()
                .sorted(gradeComponentComparator(typeTotalWeights))
                .collect(Collectors.toList());
    }

    // ==================== STUDENT SELF-VIEW GRADE METHODS ====================

    /**
     * Get all courses a student is enrolled in, optionally filtered by semester
     */
    @Transactional(readOnly = true)
    public List<StudentCourseOptionResponse> getStudentCourses(Long studentId, Long semesterId) {
        List<Enrollment> enrollments;
        if (semesterId != null) {
            enrollments = enrollmentRepository.findByStudentIdAndSemesterId(studentId, semesterId);
        } else {
            enrollments = enrollmentRepository.findByStudentId(studentId);
        }

        return enrollments.stream()
                .map(e -> StudentCourseOptionResponse.builder()
                        .courseId(e.getClassSection().getCourse().getId())
                        .courseCode(e.getClassSection().getCourse().getCode())
                        .courseName(e.getClassSection().getCourse().getName())
                        .className(e.getClassSection().getClassName())
                        .semesterCode(e.getClassSection().getSemester().getCode())
                        .semesterName(e.getClassSection().getSemester().getName())
                        .semesterId(e.getClassSection().getSemester().getId().intValue())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get detailed grades for a student in a specific class section
     * Returns grades grouped by category (type)
     */
    @Transactional(readOnly = true)
    public StudentMyGradeResponse getStudentGrades(Long studentId, String className) {
        ClassSection classSection = classSectionRepository.findByClassName(className)
                .orElseThrow(() -> new RuntimeException("Class section not found: " + className));

        // Find the enrollment for this student
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        Enrollment studentEnrollment = enrollments.stream()
                .filter(e -> e.getStudent().getId().equals(studentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Student is not enrolled in this class"));

        Course course = classSection.getCourse();
        Semester semester = classSection.getSemester();

        // Get all grade components - sorted by specific rules
        List<GradeComponent> gradeComponents = getSortedGradeComponents(course.getId());

        // Get student's grades
        List<StudentGrade> studentGrades = studentGradeRepository.findByEnrollmentIdIn(
                List.of(studentEnrollment.getId()));
        Map<Long, StudentGrade> gradesMap = studentGrades.stream()
                .collect(Collectors.toMap(g -> g.getGradeComponent().getId(), g -> g));

        // Group components by type
        Map<GradeComponent.GradeType, List<GradeComponent>> componentsByType = gradeComponents.stream()
                .collect(Collectors.groupingBy(GradeComponent::getType, LinkedHashMap::new, Collectors.toList()));

        // Build grade categories
        // First, collect Resit components and their reference component IDs (when
        // published)
        Set<Long> replacedByResitIds = new HashSet<>();
        if (Boolean.TRUE.equals(classSection.getResitGradesPublished())) {
            for (GradeComponent gc : gradeComponents) {
                if (Boolean.TRUE.equals(gc.getIsResit()) || gc.getType() == GradeComponent.GradeType.RESIT) {
                    if (gc.getReferenceComponent() != null) {
                        replacedByResitIds.add(gc.getReferenceComponent().getId());
                    }
                }
            }
        }

        // Populate categories grouped by GradeType
        List<StudentMyGradeResponse.GradeCategoryDTO> categories = new ArrayList<>();

        for (Map.Entry<GradeComponent.GradeType, List<GradeComponent>> entry : componentsByType.entrySet()) {
            GradeComponent.GradeType type = entry.getKey();
            List<GradeComponent> components = entry.getValue();

            String categoryName = formatCategoryName(type);
            List<StudentMyGradeResponse.GradeItemDTO> items = new ArrayList<>();
            double categoryWeight = 0;
            double categoryWeightedSum = 0;
            int categoryGradeCount = 0;

            for (GradeComponent gc : components) {
                StudentGrade grade = gradesMap.get(gc.getId());
                Double score = grade != null ? grade.getScore() : null;
                String comment = grade != null ? grade.getNote() : null;

                // Determine visibility based on type and status
                boolean isPublished;
                if (gc.getIsResit() || gc.getType() == GradeComponent.GradeType.RESIT) {
                    isPublished = Boolean.TRUE.equals(classSection.getResitGradesPublished());
                } else if (gc.getType() == GradeComponent.GradeType.FINAL_EXAM ||
                        gc.getType() == GradeComponent.GradeType.MID_TERM ||
                        gc.getType() == GradeComponent.GradeType.PRACTICAL_EXAM) {
                    isPublished = Boolean.TRUE.equals(classSection.getGradesPublished());
                } else {
                    // Regular components are visible if submitted
                    isPublished = Boolean.TRUE.equals(classSection.getGradesSubmitted());
                }

                items.add(StudentMyGradeResponse.GradeItemDTO.builder()
                        .itemName(gc.getName())
                        .weight(gc.getWeight())
                        .value(isPublished ? score : null)
                        .comment(isPublished ? comment : null)
                        .isPublished(isPublished)
                        .build());

                categoryWeight += gc.getWeight();

                // Only include in average if published.
                // If this component is a "RESIT" → it replaces its referenceComponent.
                // If this component was replaced by a Resit → skip it in average calculation.
                boolean isReplacedByResit = replacedByResitIds.contains(gc.getId());
                if (isPublished && score != null && !isReplacedByResit) {
                    categoryWeightedSum += score * gc.getWeight();
                    categoryGradeCount++;
                }
            }

            // Add total row for category
            Double categoryAverage = categoryGradeCount > 0
                    ? Math.round(categoryWeightedSum / categoryWeight * 10.0) / 10.0
                    : null;

            items.add(StudentMyGradeResponse.GradeItemDTO.builder()
                    .itemName("Total")
                    .weight(categoryWeight)
                    .value(categoryAverage)
                    .comment(null)
                    .isPublished(Boolean.TRUE.equals(classSection.getGradesPublished()))
                    .build());

            categories.add(StudentMyGradeResponse.GradeCategoryDTO.builder()
                    .categoryName(categoryName)
                    .items(items)
                    .totalWeight(categoryWeight)
                    .totalValue(categoryAverage)
                    .build());
        }

        // Calculate course average using GradeCalculator
        Map<Long, Double> finalScoresMap = new HashMap<>();
        Map<Long, Double> finalWeightsMap = new HashMap<>();

        boolean hasFailedExam = false;

        boolean resitPublishedForCalc = Boolean.TRUE.equals(classSection.getResitGradesPublished());

        for (Map.Entry<GradeComponent.GradeType, List<GradeComponent>> entry : componentsByType.entrySet()) {
            boolean isExamType = (entry.getKey() == GradeComponent.GradeType.FINAL_EXAM
                    || entry.getKey() == GradeComponent.GradeType.RESIT);
            for (GradeComponent gc : entry.getValue()) {
                if (replacedByResitIds.contains(gc.getId())) {
                    continue;
                }

                // If Resit is NOT published, skip Resit components from the average calculation
                // so that FE is used for the average instead of being doubled with Resit
                boolean isResitGc = Boolean.TRUE.equals(gc.getIsResit())
                        || gc.getType() == GradeComponent.GradeType.RESIT;
                if (isResitGc && !resitPublishedForCalc) {
                    continue;
                }

                StudentGrade grade = gradesMap.get(gc.getId());
                Double score = grade != null ? grade.getScore() : null;
                if (score != null) {
                    finalScoresMap.put(gc.getId(), score);
                    if (isExamType && score < 4.0) {
                        hasFailedExam = true;
                    }
                }
                finalWeightsMap.put(gc.getId(), gc.getWeight());
            }
        }

        Double courseAverage = GradeCalculator.calculateAverage(finalScoresMap, finalWeightsMap);

        // Determine status
        String status = "PENDING";
        boolean isPublished = Boolean.TRUE.equals(classSection.getGradesPublished());

        if (isPublished) {
            boolean hasMissingOrZero = false;
            for (Map.Entry<GradeComponent.GradeType, List<GradeComponent>> typeEntry : componentsByType.entrySet()) {
                double typeTotalScore = 0.0;
                boolean hasIncludedComponent = false;
                for (GradeComponent gc : typeEntry.getValue()) {
                    if (finalWeightsMap.containsKey(gc.getId())) {
                        hasIncludedComponent = true;
                        Double score = finalScoresMap.get(gc.getId());
                        if (score != null) {
                            typeTotalScore += score;
                        }
                    }
                }
                if (hasIncludedComponent && typeTotalScore <= 0.0) {
                    hasMissingOrZero = true;
                    break;
                }
            }

            boolean hasFailedAttendance = checkAttendanceFailure(studentId, className, course.getNumberOfSlots());

            if (hasMissingOrZero || hasFailedExam || hasFailedAttendance
                    || (courseAverage != null && courseAverage < 5.0)) {
                status = "FAILED";
            } else if (courseAverage != null && courseAverage >= 5.0) {
                status = "PASSED";
            }
        }

        return StudentMyGradeResponse.builder()
                .className(className)
                .courseName(course.getName())
                .courseCode(course.getCode())
                .semesterName(semester.getName())
                .semesterCode(semester.getCode())
                .gradeCategories(categories)
                .courseAverage(courseAverage)
                .courseStatus(status)
                .gradesPublished(classSection.getGradesPublished())
                .gradesPublishedAt(
                        classSection.getGradesPublishedAt() != null ? classSection.getGradesPublishedAt().toString()
                                : null)
                .lastUpdatedAt(LocalDateTime.now().toString())
                .build();
    }

    /**
     * Format grade type to display name
     */
    private String formatCategoryName(GradeComponent.GradeType type) {
        if (type == null)
            return "N/A";
        switch (type) {
            case PARTICIPATION:
                return "Participation";
            case ASSIGNMENT:
                return "Assignment";
            case QUIZ:
                return "Quiz";
            case WORKSHOP:
                return "Workshop";
            case PROJECT:
                return "Project";
            case PRESENTATION:
                return "Presentation";
            case PROGRESS_TEST:
                return "Progress Test";
            case MID_TERM:
                return "Midterm Test";
            case PRACTICAL_EXAM:
                return "Practical Exam";
            case FINAL_EXAM:
                return "Final Exam";
            case RESIT:
                return "Resit";
            case OTHER:
                return "Other";
            default:
                return type.name();
        }
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentInfo(String studentCode) {
        User user = userRepository.findByCode(studentCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sinh viên với mã: " + studentCode));

        if (user.getRole() != User.UserRole.STUDENT) {
            throw new RuntimeException("Người dùng không phải là sinh viên");
        }

        return StudentResponse.fromUserAndProfile(user, user.getStudentProfile());
    }

    /**
     * Get a comprehensive summary of all grades for a student across all semesters.
     * Shows ALL courses in the student's specialization curriculum (not just
     * enrolled ones).
     * Courses not yet enrolled show PENDING status with no grade.
     */
    @Transactional(readOnly = true)
    public StudentAllGradesSummaryResponse getAllGradesSummary(Long studentId) {
        // Load student profile to get specialization
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
        StudentProfile profile = student.getStudentProfile();
        Specialization specialization = profile != null ? profile.getSpecialization() : null;
        SubSpecialization subSpecialization = profile != null ? profile.getSubSpecialization() : null;

        String specializationName = specialization != null ? specialization.getName() : null;
        String majorName = (specialization != null && specialization.getMajor() != null)
                ? specialization.getMajor().getName()
                : null;

        // Load all enrollments of the student (for looking up grades)
        List<Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        // Map from courseId -> enrollment (latest enrollment if multiple, keyed by
        // courseId)
        Map<Long, Enrollment> enrollmentByCourseId = new LinkedHashMap<>();
        for (Enrollment e : enrollments) {
            Long cid = e.getClassSection().getCourse().getId();
            // If student retook the course, keep the enrollment with the later semester
            Enrollment existing = enrollmentByCourseId.get(cid);
            if (existing == null) {
                enrollmentByCourseId.put(cid, e);
            } else {
                // Keep the one with the newer semester start date
                java.time.LocalDate newDate = e.getClassSection().getSemester().getStartDate() != null
                        ? e.getClassSection().getSemester().getStartDate()
                        : java.time.LocalDate.MIN;
                java.time.LocalDate oldDate = existing.getClassSection().getSemester().getStartDate() != null
                        ? existing.getClassSection().getSemester().getStartDate()
                        : java.time.LocalDate.MIN;
                if (newDate.isAfter(oldDate)) {
                    enrollmentByCourseId.put(cid, e);
                }
            }
        }

        // --- Build curriculum course list ---
        // Structure: each entry has (term=semester in specialization, orderIndex,
        // course)
        // Use a helper class to hold the structured list
        record CurriculumEntry(int term, int orderIndex, Course course) {
        }
        List<CurriculumEntry> curriculum = new ArrayList<>();

        if (specialization != null) {
            // Get all courses in the student's specialization, ordered by semester then
            // orderIndex
            List<SpecializationCourse> specCourses = specializationCourseRepository
                    .findBySpecializationIdOrderByOrderIndexAsc(specialization.getId());
            // Sort by semester (term) first, then by orderIndex
            specCourses.sort(Comparator
                    .comparingInt((SpecializationCourse sc) -> sc.getSemester() != null ? sc.getSemester() : 0)
                    .thenComparingInt(sc -> sc.getOrderIndex() != null ? sc.getOrderIndex() : 0));

            // Track which courses are already added (to avoid duplicates)
            Set<Long> addedCourseIds = new LinkedHashSet<>();
            for (SpecializationCourse sc : specCourses) {
                if (!addedCourseIds.contains(sc.getCourse().getId())) {
                    curriculum.add(new CurriculumEntry(
                            sc.getSemester() != null ? sc.getSemester() : 0,
                            sc.getOrderIndex() != null ? sc.getOrderIndex() : 0,
                            sc.getCourse()));
                    addedCourseIds.add(sc.getCourse().getId());
                }
            }

            // If student has a sub-specialization, append its courses (that aren't already
            // in spec)
            if (subSpecialization != null) {
                List<SubSpecializationCourse> subSpecCourses = subSpecializationCourseRepository
                        .findBySubSpecializationIdOrderByOrderIndexAsc(subSpecialization.getId());
                subSpecCourses.sort(Comparator
                        .comparingInt(
                                (SubSpecializationCourse ssc) -> ssc.getSemester() != null ? ssc.getSemester() : 0)
                        .thenComparingInt(ssc -> ssc.getOrderIndex() != null ? ssc.getOrderIndex() : 0));
                for (SubSpecializationCourse ssc : subSpecCourses) {
                    if (!addedCourseIds.contains(ssc.getCourse().getId())) {
                        curriculum.add(new CurriculumEntry(
                                ssc.getSemester() != null ? ssc.getSemester() : 0,
                                ssc.getOrderIndex() != null ? ssc.getOrderIndex() : 0,
                                ssc.getCourse()));
                        addedCourseIds.add(ssc.getCourse().getId());
                    }
                }
            }
        } else {
            // Fallback: student has no specialization assigned → use enrolled courses only
            // (old behavior)
            enrollments.sort(Comparator.comparing(
                    e -> e.getClassSection().getSemester().getStartDate() != null
                            ? e.getClassSection().getSemester().getStartDate()
                            : java.time.LocalDate.now()));
            int termFallback = 1;
            Map<Long, Integer> semesterToTermFallback = new LinkedHashMap<>();
            for (Enrollment e : enrollments) {
                Long semId = e.getClassSection().getSemester().getId();
                if (!semesterToTermFallback.containsKey(semId)) {
                    semesterToTermFallback.put(semId, termFallback++);
                }
            }
            for (Enrollment e : enrollments) {
                Long semId = e.getClassSection().getSemester().getId();
                int term = semesterToTermFallback.getOrDefault(semId, 1);
                curriculum.add(new CurriculumEntry(term, 0, e.getClassSection().getCourse()));
            }
        }

        // --- Build grade summary for each curriculum course ---
        List<StudentAllGradesSummaryResponse.CourseGradeSummary> courses = new ArrayList<>();
        int no = 1;
        int passed = 0, failed = 0, pending = 0;

        for (CurriculumEntry entry : curriculum) {
            Course course = entry.course();
            int term = entry.term();

            // Prerequisite codes
            String prerequisiteCodes = course.getPrerequisites() != null && !course.getPrerequisites().isEmpty()
                    ? course.getPrerequisites().stream()
                            .map(Course::getCode)
                            .collect(Collectors.joining(", "))
                    : "";

            Enrollment enrollment = enrollmentByCourseId.get(course.getId());

            if (enrollment == null) {
                // Student hasn't enrolled in this course yet
                courses.add(StudentAllGradesSummaryResponse.CourseGradeSummary.builder()
                        .no(no++)
                        .term(term)
                        .semesterCode(null)
                        .semesterName(null)
                        .courseCode(course.getCode())
                        .courseName(course.getName())
                        .credits(course.getCredits())
                        .prerequisiteCodes(prerequisiteCodes)
                        .className(null)
                        .grade(null)
                        .status("PENDING")
                        .gradesPublished(false)
                        .isCalculatedInGpa(course.getIsCalculatedInGpa())
                        .build());
                pending++;
                continue;
            }

            // Student enrolled → calculate grade
            ClassSection cs = enrollment.getClassSection();
            Semester semester = cs.getSemester();

            List<StudentGrade> grades = studentGradeRepository.findByEnrollmentIdIn(
                    Collections.singletonList(enrollment.getId()));
            List<GradeComponent> allComponents = gradeComponentRepository.findByCourseIdOrderById(course.getId());

            Map<Long, Double> scoresMap = grades.stream()
                    .collect(Collectors.toMap(g -> g.getGradeComponent().getId(), StudentGrade::getScore, (a, b) -> a));

            boolean resitPublished = Boolean.TRUE.equals(cs.getResitGradesPublished());
            Set<Long> replacedByResitIds = new HashSet<>();
            if (resitPublished) {
                for (GradeComponent gc : allComponents) {
                    if ((Boolean.TRUE.equals(gc.getIsResit()) || gc.getType() == GradeComponent.GradeType.RESIT)
                            && gc.getReferenceComponent() != null) {
                        replacedByResitIds.add(gc.getReferenceComponent().getId());
                    }
                }
            }

            Map<Long, Double> weightsMap = new HashMap<>();
            boolean hasFailedExam = false;
            for (GradeComponent gc : allComponents) {
                if (replacedByResitIds.contains(gc.getId()))
                    continue;
                boolean isResitGc = Boolean.TRUE.equals(gc.getIsResit())
                        || gc.getType() == GradeComponent.GradeType.RESIT;
                if (isResitGc && !resitPublished)
                    continue;
                weightsMap.put(gc.getId(), gc.getWeight());
                Double score = scoresMap.get(gc.getId());
                if (score != null) {
                    boolean isExamType = gc.getType() == GradeComponent.GradeType.FINAL_EXAM
                            || gc.getType() == GradeComponent.GradeType.RESIT;
                    if (isExamType && score < 4.0)
                        hasFailedExam = true;
                }
            }

            Double courseAverage = GradeCalculator.calculateAverage(scoresMap, weightsMap);
            String status = "STUDYING"; // Changed from PENDING to STUDYING for enrolled courses
            boolean isPublished = Boolean.TRUE.equals(cs.getGradesPublished());

            if (isPublished) {
                Map<GradeComponent.GradeType, Double> typeTotalScores = new HashMap<>();
                Map<GradeComponent.GradeType, Boolean> typeHasComponent = new HashMap<>();

                for (GradeComponent gc : allComponents) {
                    if (weightsMap.containsKey(gc.getId())) {
                        typeHasComponent.put(gc.getType(), true);
                        Double score = scoresMap.get(gc.getId());
                        if (score != null) {
                            typeTotalScores.put(gc.getType(), typeTotalScores.getOrDefault(gc.getType(), 0.0) + score);
                        } else {
                            typeTotalScores.put(gc.getType(), typeTotalScores.getOrDefault(gc.getType(), 0.0));
                        }
                    }
                }

                boolean hasMissingOrZero = false;
                for (Map.Entry<GradeComponent.GradeType, Boolean> typeEntry : typeHasComponent.entrySet()) {
                    if (typeEntry.getValue()) {
                        Double total = typeTotalScores.getOrDefault(typeEntry.getKey(), 0.0);
                        if (total <= 0.0) {
                            hasMissingOrZero = true;
                            break;
                        }
                    }
                }

                boolean hasFailedAttendance = checkAttendanceFailure(enrollment.getStudent().getId(), cs.getClassName(),
                        course.getNumberOfSlots());
                boolean isPassing = calculatePassStatus(courseAverage, hasMissingOrZero, hasFailedExam,
                        hasFailedAttendance);
                if (isPassing) {
                    status = "PASSED";
                } else {
                    status = "FAILED";
                }
            }

            courses.add(StudentAllGradesSummaryResponse.CourseGradeSummary.builder()
                    .no(no++)
                    .term(term)
                    .semesterCode(semester.getCode())
                    .semesterName(semester.getName())
                    .courseCode(course.getCode())
                    .courseName(course.getName())
                    .credits(course.getCredits())
                    .prerequisiteCodes(prerequisiteCodes)
                    .className(cs.getClassName())
                    .grade(isPublished ? courseAverage : null)
                    .status(status)
                    .gradesPublished(isPublished)
                    .isCalculatedInGpa(course.getIsCalculatedInGpa())
                    .build());

            if ("PASSED".equals(status)) {
                passed++;
            } else if ("FAILED".equals(status)) {
                failed++;
            } else {
                pending++;
            }
        }

        double[] gpaResult = calculateStudentGPA(courses);
        Double gpa10 = gpaResult[0] < 0 ? null : gpaResult[0];
        Double gpa4 = gpaResult[1] < 0 ? null : gpaResult[1];

        return StudentAllGradesSummaryResponse.builder()
                .courses(courses)
                .totalCourses(courses.size())
                .passedCourses(passed)
                .failedCourses(failed)
                .pendingCourses(pending)
                .gpa(gpa10)
                .gpa4(gpa4)
                .specializationName(specializationName)
                .majorName(majorName)
                .build();
    }

    /**
     * Tính GPA tích lũy theo đúng quy chế FPT:
     * - Chỉ tính các môn đã PASSED (các môn rớt không tính vào CGPA tích lũy)
     * - Điểm phải được công bố (gradesPublished = true)
     * - Môn phải được đánh dấu tính GPA (isCalculatedInGpa = true)
     * 
     * Trả về mảng double 2 phần tử: [0] = GPA hệ 10, [1] = GPA hệ 4
     * Giá trị -1 biểu thị không có dữ liệu (null)
     */
    private double[] calculateStudentGPA(List<StudentAllGradesSummaryResponse.CourseGradeSummary> courses) {
        if (courses == null || courses.isEmpty()) {
            return new double[] { -1, -1 };
        }

        double totalWeightedScore10 = 0;
        double totalWeightedScore4 = 0;
        int totalCredits = 0;

        for (StudentAllGradesSummaryResponse.CourseGradeSummary course : courses) {
            boolean isIncluded = "PASSED".equalsIgnoreCase(course.getStatus());
            boolean isCalculated = Boolean.TRUE.equals(course.getIsCalculatedInGpa());
            boolean isPublished = Boolean.TRUE.equals(course.getGradesPublished());
            boolean hasValidData = course.getGrade() != null && course.getCredits() != null;

            if (isIncluded && isCalculated && isPublished && hasValidData) {
                int credits = course.getCredits();
                double grade10 = course.getGrade();
                double grade4 = convertTo4PointScale(grade10);

                totalWeightedScore10 += grade10 * credits;
                totalWeightedScore4 += grade4 * credits;
                totalCredits += credits;
            }
        }

        if (totalCredits == 0) {
            return new double[] { -1, -1 };
        }

        double gpa10 = Math.round((totalWeightedScore10 / totalCredits) * 100.0) / 100.0;
        double gpa4 = Math.round((totalWeightedScore4 / totalCredits) * 100.0) / 100.0;
        return new double[] { gpa10, gpa4 };
    }

    /**
     * Quy đổi điểm hệ 10 sang hệ 4 theo thang điểm chữ của FPT University.
     * Chỉ áp dụng cho các môn đã PASSED (>= 5.0).
     * A : 9.0+ → 4.0
     * B+ : 8.5+ → 3.5
     * B : 8.0+ → 3.0
     * C+ : 7.5+ → 2.5
     * C : 7.0+ → 2.0
     * D+ : 6.5+ → 1.5
     * D : 6.0+ → 1.0
     * F : < 5.0 → 0.0 (không gặp vì đã lọc PASSED)
     */
    private double convertTo4PointScale(double grade10) {
        if (grade10 >= 9.0)
            return 4.0;
        if (grade10 >= 8.5)
            return 3.75;
        if (grade10 >= 8.0)
            return 3.5;
        if (grade10 >= 7.5)
            return 3.25;
        if (grade10 >= 7.0)
            return 3.0;
        if (grade10 >= 6.5)
            return 2.75;
        if (grade10 >= 6.0)
            return 2.5;
        if (grade10 >= 5.5)
            return 2.25;
        if (grade10 >= 5.0)
            return 2.0;
        return 0.0;
    }
}
