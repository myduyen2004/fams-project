package com.fams.backend.service.impl;

import com.fams.backend.dto.request.ClassSectionRequest;
import com.fams.backend.dto.request.EnrollmentRequest;
import com.fams.backend.dto.response.*;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.ClassSectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing class sections.
 * 
 * Note: Import functionality has been moved to StagingImportService
 * for better performance with large files (streaming + staging tables).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClassSectionServiceImpl implements ClassSectionService {

    private final ClassSectionRepository classSectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final SpecializationCourseRepository specializationCourseRepository;
    private final SubSpecializationCourseRepository subSpecializationCourseRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final SystemLogService systemLogService;

    @Override
    @Transactional(readOnly = true)
    public Page<ClassSectionResponse> getClassSectionsBySemester(
            String semesterCode,
            String search,
            String status,
            Long lecturerId,
            Pageable pageable) {

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
        List<ClassSection> classSections = classSectionRepository.findAll();

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

    // ==================== CRUD OPERATIONS ====================

    @Override
    @Transactional
    public ClassSectionResponse createClassSection(ClassSectionRequest request) {
        log.info("Creating class section: {}", request.getClassName());

        Semester semester = semesterRepository.findByCode(request.getSemesterCode())
                .orElseThrow(() -> new RuntimeException("Học kỳ không tồn tại: " + request.getSemesterCode()));

        // Remove restriction to allow creation for historical semesters
        /*
        if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể tạo lớp học phần khi học kỳ chưa bắt đầu");
        }
        */

        if (classSectionRepository.existsByClassNameIgnoreCase(request.getClassName())) {
            throw new RuntimeException("Mã lớp học phần đã tồn tại: " + request.getClassName());
        }

        Course course = courseRepository.findByCode(request.getCourseCode())
                .orElseThrow(() -> new RuntimeException("Môn học không tồn tại: " + request.getCourseCode()));

        User lecturer = null;
        if (request.getLecturerUsername() != null && !request.getLecturerUsername().isEmpty()) {
            lecturer = userRepository.findByUsernameIgnoreCase(request.getLecturerUsername())
                    .orElseThrow(
                            () -> new RuntimeException("Giảng viên không tồn tại: " + request.getLecturerUsername()));
            if (lecturer.getRole() != User.UserRole.LECTURER) {
                throw new RuntimeException("Người dùng không phải là giảng viên: " + request.getLecturerUsername());
            }
        }

        ClassSection classSection = ClassSection.builder()
                .className(request.getClassName())
                .course(course)
                .semester(semester)
                .lecturer(lecturer)
                .numberOfSlots(
                        request.getNumberOfSlots() != null ? request.getNumberOfSlots() : course.getNumberOfSlots())
                .maxStudents(request.getMaxStudents() != null ? request.getMaxStudents() : 30)
                .currentEnrollment(0)
                .status(ClassSection.ClassStatus.UPCOMING)
                .build();

        classSection = classSectionRepository.save(classSection);
        log.info("Created class section: {}", classSection.getClassName());
        systemLogService.logClassCreated(classSection.getClassName());

        return convertToResponse(classSection);
    }

    @Override
    @Transactional
    public ClassSectionResponse updateClassSection(String className, ClassSectionRequest request) {
        log.info("Updating class section: {}", className);

        ClassSection classSection = classSectionRepository.findByClassNameWithDetails(className)
                .orElseThrow(() -> new RuntimeException("Lớp học phần không tồn tại: " + className));

        // Remove restriction to allow updates for historical semesters
        /*
        if (classSection.getSemester().getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể cập nhật lớp học phần khi học kỳ chưa bắt đầu");
        }
        */

        if (request.getCourseCode() != null && !request.getCourseCode().equals(classSection.getCourse().getCode())) {
            Course course = courseRepository.findByCode(request.getCourseCode())
                    .orElseThrow(() -> new RuntimeException("Môn học không tồn tại: " + request.getCourseCode()));
            classSection.setCourse(course);
        }

        if (request.getLecturerUsername() != null) {
            if (request.getLecturerUsername().isEmpty()) {
                classSection.setLecturer(null);
            } else {
                User lecturer = userRepository.findByUsernameIgnoreCase(request.getLecturerUsername())
                        .orElseThrow(() -> new RuntimeException(
                                "Giảng viên không tồn tại: " + request.getLecturerUsername()));
                if (lecturer.getRole() != User.UserRole.LECTURER) {
                    throw new RuntimeException("Người dùng không phải là giảng viên: " + request.getLecturerUsername());
                }
                classSection.setLecturer(lecturer);
            }
        }

        if (request.getNumberOfSlots() != null) {
            classSection.setNumberOfSlots(request.getNumberOfSlots());
        }
        if (request.getMaxStudents() != null) {
            classSection.setMaxStudents(request.getMaxStudents());
        }

        classSection = classSectionRepository.save(classSection);
        log.info("Updated class section: {}", classSection.getClassName());
        systemLogService.logClassUpdated(classSection.getClassName());

        return convertToResponse(classSection);
    }

    @Override
    @Transactional
    public void deleteClassSection(String className) {
        log.info("Deleting class section: {}", className);

        ClassSection classSection = classSectionRepository.findByClassNameWithDetails(className)
                .orElseThrow(() -> new RuntimeException("Lớp học phần không tồn tại: " + className));

        // Remove restriction to allow deletion for historical semesters
        /*
        if (classSection.getSemester().getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể xóa lớp học phần khi học kỳ chưa bắt đầu");
        }
        */

        classSectionRepository.delete(classSection);
        log.info("Deleted class section: {}", className);
        systemLogService.logClassDeleted(className);
    }

    @Override
    @Transactional
    public void deleteClassSections(List<String> classNames) {
        log.info("Deleting {} class sections", classNames.size());
        for (String className : classNames) {
            deleteClassSection(className);
        }
        systemLogService.logClassesDeleted(classNames.size());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LecturerOptionResponse> getAllLecturers() {
        return userRepository.findByRole(User.UserRole.LECTURER)
                .orElse(Collections.emptyList())
                .stream()
                .map(user -> LecturerOptionResponse.builder()
                        .id(user.getId())
                        .fullName(user.getFullName())
                        .username(user.getUsername())
                        .build())
                .collect(Collectors.toList());
    }

    // ==================== ENROLLMENT CRUD ====================

    @Override
    @Transactional
    public EnrollmentResponse createEnrollment(EnrollmentRequest request) {
        log.info("Creating enrollment for student {} in class {}", request.getStudentCode(), request.getClassName());

        // Use pessimistic lock to prevent race condition when multiple requests try to
        // add students simultaneously
        ClassSection classSection = classSectionRepository.findByClassNameWithLock(request.getClassName())
                .orElseThrow(() -> new RuntimeException("Lớp học phần không tồn tại: " + request.getClassName()));

        // Remove restriction to allow enrollment for historical semesters
        /*
        if (classSection.getSemester().getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể thêm đăng ký khi học kỳ chưa bắt đầu");
        }
        */

        // Count actual enrollments from database (more reliable than currentEnrollment
        // field)
        long actualEnrollmentCount = enrollmentRepository.countByClassSectionClassName(request.getClassName());
        if (actualEnrollmentCount >= classSection.getMaxStudents()) {
            throw new RuntimeException(String.format(
                    "Lớp học phần đã đủ sinh viên (%d/%d). Không thể thêm sinh viên mới.",
                    actualEnrollmentCount, classSection.getMaxStudents()));
        }

        User student = userRepository.findByCodeIgnoreCase(request.getStudentCode())
                .orElseThrow(() -> new RuntimeException("Sinh viên không tồn tại: " + request.getStudentCode()));

        if (student.getRole() != User.UserRole.STUDENT) {
            throw new RuntimeException("Người dùng không phải là sinh viên: " + request.getStudentCode());
        }

        // Validate student profile and specialized info
        StudentProfile studentProfile = student.getStudentProfile();
        if (studentProfile == null) {
            throw new RuntimeException("Sinh viên chưa có hồ sơ (student profile)");
        }
        if (studentProfile.getMajor() == null || studentProfile.getSpecialization() == null) {
            throw new RuntimeException("Sinh viên chưa được gán ngành hoặc chuyên ngành");
        }

        Long courseId = classSection.getCourse().getId();
        boolean courseInSpecialization = false;

        if (studentProfile != null) {
            // Check sub-specialization first (more specific)
            if (studentProfile.getSubSpecialization() != null) {
                courseInSpecialization = subSpecializationCourseRepository
                        .existsBySubSpecializationIdAndCourseId(
                                studentProfile.getSubSpecialization().getId(), courseId);
            }

            // If not found in sub-specialization, check main specialization
            if (!courseInSpecialization && studentProfile.getSpecialization() != null) {
                courseInSpecialization = specializationCourseRepository
                        .existsBySpecializationIdAndCourseId(
                                studentProfile.getSpecialization().getId(), courseId);
            }
        }

        if (!courseInSpecialization) {
            String specializationName = studentProfile != null && studentProfile.getSpecialization() != null
                    ? studentProfile.getSpecialization().getName()
                    : "không xác định";
            throw new RuntimeException(String.format(
                    "Môn học '%s' không nằm trong chuyên ngành '%s' của sinh viên %s",
                    classSection.getCourse().getName(), specializationName, request.getStudentCode()));
        }

        if (enrollmentRepository.existsByClassNameAndStudentCodeIgnoreCase(request.getClassName(),
                request.getStudentCode())) {
            throw new RuntimeException("Sinh viên đã đăng ký lớp học phần này");
        }

        Enrollment enrollment = Enrollment.builder()
                .classSection(classSection)
                .student(student)
                .studentCode(student.getCode())
                .status(Enrollment.EnrollmentStatus.ENROLLED)
                .build();

        enrollment = enrollmentRepository.save(enrollment);

        classSection.setCurrentEnrollment(classSection.getCurrentEnrollment() + 1);
        classSectionRepository.save(classSection);

        log.info("Created enrollment for student {} in class {}", request.getStudentCode(), request.getClassName());
        systemLogService.logEnrollmentCreated(request.getStudentCode(), request.getClassName());

        return convertToEnrollmentResponse(enrollment);
    }

    @Override
    @Transactional
    public EnrollmentResponse updateEnrollment(Long enrollmentId, EnrollmentRequest request) {
        log.info("Updating enrollment: {}", enrollmentId);

        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Đăng ký không tồn tại: " + enrollmentId));

        ClassSection classSection = enrollment.getClassSection();
        /*
        Semester semester = semesterRepository.findByCode(classSection.getSemester().getCode())
                .orElseThrow(() -> new RuntimeException("Học kỳ không tồn tại"));
        */

        // Remove restriction to allow enrollment updates for historical semesters
        /*
        if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể cập nhật đăng ký khi học kỳ chưa bắt đầu");
        }
        */

        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            try {
                Enrollment.EnrollmentStatus newStatus = Enrollment.EnrollmentStatus
                        .valueOf(request.getStatus().toUpperCase());
                Enrollment.EnrollmentStatus oldStatus = enrollment.getStatus();

                enrollment.setStatus(newStatus);

                if (oldStatus == Enrollment.EnrollmentStatus.ENROLLED
                        && newStatus != Enrollment.EnrollmentStatus.ENROLLED) {
                    classSection.setCurrentEnrollment(Math.max(0, classSection.getCurrentEnrollment() - 1));
                    classSectionRepository.save(classSection);
                } else if (oldStatus != Enrollment.EnrollmentStatus.ENROLLED
                        && newStatus == Enrollment.EnrollmentStatus.ENROLLED) {
                    classSection.setCurrentEnrollment(classSection.getCurrentEnrollment() + 1);
                    classSectionRepository.save(classSection);
                }
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Trạng thái không hợp lệ: " + request.getStatus());
            }
        }

        enrollment = enrollmentRepository.save(enrollment);
        log.info("Updated enrollment: {}", enrollmentId);

        return convertToEnrollmentResponse(enrollment);
    }

    @Override
    @Transactional
    public void deleteEnrollment(Long enrollmentId) {
        log.info("Deleting enrollment: {}", enrollmentId);

        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Đăng ký không tồn tại: " + enrollmentId));

        ClassSection classSection = enrollment.getClassSection();
        /*
        Semester semester = semesterRepository.findByCode(classSection.getSemester().getCode())
                .orElseThrow(() -> new RuntimeException("Học kỳ không tồn tại"));
        */

        // Remove restriction to allow enrollment deletion for historical semesters
        /*
        if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể xóa đăng ký khi học kỳ chưa bắt đầu");
        }
        */

        if (enrollment.getStatus() == Enrollment.EnrollmentStatus.ENROLLED) {
            classSection.setCurrentEnrollment(Math.max(0, classSection.getCurrentEnrollment() - 1));
            classSectionRepository.save(classSection);
        }

        enrollmentRepository.delete(enrollment);
        log.info("Deleted enrollment: {}", enrollmentId);
        systemLogService.logEnrollmentDeleted(enrollment.getStudentCode(), classSection.getClassName());
    }

    @Override
    @Transactional
    public void deleteEnrollments(List<Long> enrollmentIds) {
        log.info("Deleting {} enrollments", enrollmentIds.size());
        for (Long enrollmentId : enrollmentIds) {
            deleteEnrollment(enrollmentId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<StudentOptionResponse> getAvailableStudentsForClassSection(String className) {
        // First get IDs of eligible students (filtered by specialization)
        List<Long> studentIds = userRepository.findStudentIdsNotEnrolledInClassSection(className);

        if (studentIds.isEmpty()) {
            return Collections.emptyList();
        }

        // Then load users with their profiles
        return userRepository.findStudentsWithProfilesByIds(studentIds)
                .stream()
                .map(user -> {
                    StudentProfile profile = user.getStudentProfile();
                    return StudentOptionResponse.builder()
                            .id(user.getId())
                            .code(user.getCode())
                            .fullName(user.getFullName())
                            .email(user.getEmail())
                            .major(profile != null && profile.getMajor() != null ? profile.getMajor().getName() : "")
                            .specialization(profile != null && profile.getSpecialization() != null
                                    ? profile.getSpecialization().getName()
                                    : "")
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSectionResponse> getAvailableClassSectionsForTransfer(String currentClassName) {
        log.info("Checking transfer targets from class: {}", currentClassName);

        ClassSection currentClass = classSectionRepository.findByClassNameWithDetails(currentClassName)
                .orElseThrow(() -> new RuntimeException("Lớp học phần không tồn tại: " + currentClassName));

        String courseCode = currentClass.getCourse().getCode();
        String semesterCode = currentClass.getSemester().getCode();

        return classSectionRepository.findBySemesterCode(semesterCode).stream()
                .filter(cs -> cs.getCourse().getCode().equals(courseCode))
                .filter(cs -> !cs.getClassName().equals(currentClassName))
                .filter(cs -> cs.getCurrentEnrollment() < cs.getMaxStudents())
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClassSectionTransferResponse> getAvailableClassSectionsForTransferWithConflict(String currentClassName,
            Long studentId) {
        log.info("Checking transfer targets with conflicts for student {} from class: {}", studentId, currentClassName);

        ClassSection currentClass = classSectionRepository.findByClassNameWithDetails(currentClassName)
                .orElseThrow(() -> new RuntimeException("Lớp học phần không tồn tại: " + currentClassName));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Sinh viên không tồn tại: " + studentId));

        String courseCode = currentClass.getCourse().getCode();
        String semesterCode = currentClass.getSemester().getCode();

        // Get all potential class sections
        List<ClassSection> potentialClasses = classSectionRepository.findBySemesterCode(semesterCode).stream()
                .filter(cs -> cs.getCourse().getCode().equals(courseCode))
                .filter(cs -> !cs.getClassName().equals(currentClassName))
                .filter(cs -> cs.getCurrentEnrollment() < cs.getMaxStudents())
                .collect(Collectors.toList());

        // Get student's current slots in this semester (excluding the class they are
        // leaving)
        List<TimetableSlot> studentSlots = timetableSlotRepository.findByStudentIdAndDateBetween(
                student.getId(),
                currentClass.getSemester().getStartDate(),
                currentClass.getSemester().getEndDate());

        // Filter out slots of the current class
        List<TimetableSlot> otherSlots = studentSlots.stream()
                .filter(s -> !s.getClassSection().getClassName().equals(currentClassName))
                .collect(Collectors.toList());

        return potentialClasses.stream().map(targetCS -> {
            List<TimetableSlot> targetSlots = timetableSlotRepository.findByClassName(targetCS.getClassName());
            List<String> conflicts = new ArrayList<>();

            for (TimetableSlot targetSlot : targetSlots) {
                for (TimetableSlot otherSlot : otherSlots) {
                    if (targetSlot.getDate().equals(otherSlot.getDate()) &&
                            targetSlot.getSlotNumber().equals(otherSlot.getSlotNumber()) &&
                            targetSlot.getStatus() == TimetableSlot.TimetableSlotStatus.SCHEDULED &&
                            otherSlot.getStatus() == TimetableSlot.TimetableSlotStatus.SCHEDULED) {
                        conflicts.add(String.format("Xung đột với %s (%s) vào %s Slot %d",
                                otherSlot.getClassSection().getCourse().getCode(),
                                otherSlot.getClassSection().getClassName(),
                                targetSlot.getDate().toString(),
                                targetSlot.getSlotNumber()));
                    }
                }
            }

            return ClassSectionTransferResponse.builder()
                    .classSection(convertToResponse(targetCS))
                    .hasConflict(!conflicts.isEmpty())
                    .conflictDetails(conflicts)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void transferEnrollments(List<Long> enrollmentIds, String targetClassName) {
        log.info("Transferring {} enrollments to class: {}", enrollmentIds.size(), targetClassName);

        if (enrollmentIds.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất một sinh viên để chuyển");
        }

        // Get target class section with lock
        ClassSection targetClassSection = classSectionRepository.findByClassNameWithLock(targetClassName)
                .orElseThrow(() -> new RuntimeException("Lớp học phần đích không tồn tại: " + targetClassName));

        // Remove restriction to allow transfers for historical semesters
        /*
        if (targetClassSection.getSemester().getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể chuyển sinh viên khi học kỳ chưa bắt đầu");
        }
        */

        // Check available slots
        long currentEnrollment = enrollmentRepository.countByClassSectionClassName(targetClassName);
        long availableSlots = targetClassSection.getMaxStudents() - currentEnrollment;

        if (enrollmentIds.size() > availableSlots) {
            throw new RuntimeException(String.format(
                    "Lớp đích chỉ còn %d chỗ trống, không thể chuyển %d sinh viên",
                    availableSlots, enrollmentIds.size()));
        }

        // Get enrollments and validate
        List<Enrollment> enrollments = enrollmentRepository.findAllById(enrollmentIds);
        if (enrollments.size() != enrollmentIds.size()) {
            throw new RuntimeException("Một số đăng ký không tồn tại");
        }

        // Validate all enrollments are from classes with same course
        String targetCourseId = targetClassSection.getCourse().getId().toString();
        for (Enrollment enrollment : enrollments) {
            if (!enrollment.getClassSection().getCourse().getId().toString().equals(targetCourseId)) {
                throw new RuntimeException(
                        "Sinh viên " + enrollment.getStudentCode() + " không thể chuyển vì môn học không khớp");
            }
        }

        // Transfer enrollments
        for (Enrollment enrollment : enrollments) {
            ClassSection oldClassSection = enrollment.getClassSection();

            // Update old class section enrollment count
            oldClassSection.setCurrentEnrollment(Math.max(0, oldClassSection.getCurrentEnrollment() - 1));
            classSectionRepository.save(oldClassSection);

            // Update enrollment - only need to update classSection reference
            enrollment.setClassSection(targetClassSection);
            enrollmentRepository.save(enrollment);
        }

        // Update target class section enrollment count
        targetClassSection.setCurrentEnrollment((int) (currentEnrollment + enrollmentIds.size()));
        classSectionRepository.save(targetClassSection);

        log.info("Successfully transferred {} enrollments to {}", enrollmentIds.size(), targetClassName);
        systemLogService.logEnrollmentsTransferred(enrollmentIds.size(), targetClassName);
    }

    // ==================== TEMPLATE METHODS ====================

    @Override
    public byte[] getImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet dataSheet = workbook.createSheet("Template Import Lớp học phần");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            Row headerRow = dataSheet.createRow(0);
            String[] headers = { "Class Name", "Course Code", "Lecturer Code", "Max Students" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row sampleRow = dataSheet.createRow(1);
            sampleRow.createCell(0).setCellValue("SE18B02-PRN211");
            sampleRow.createCell(1).setCellValue("PRN211");
            sampleRow.createCell(2).setCellValue("sonnt5");
            sampleRow.createCell(3).setCellValue(30);

            for (int i = 0; i < headers.length; i++) {
                dataSheet.autoSizeColumn(i);
            }

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

    @Override
    public byte[] getEnrollmentImportTemplate(String semesterCode) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Danh sách đăng ký");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            String[] headers = { "MSSV", "Mã lớp + Mã môn" };
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            Row sampleRow1 = sheet.createRow(1);
            sampleRow1.createCell(0).setCellValue("SE180001");
            sampleRow1.createCell(1).setCellValue("SE18B02-PRN211");

            Row sampleRow2 = sheet.createRow(2);
            sampleRow2.createCell(0).setCellValue("SE180002");
            sampleRow2.createCell(1).setCellValue("SE18B02-PRN211");

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            Sheet instructionSheet = workbook.createSheet("Hướng dẫn");
            String[] instructions = {
                    "HƯỚNG DẪN IMPORT ĐĂNG KÝ HỌC",
                    "",
                    "1. MSSV: Mã số sinh viên (bắt buộc, phải tồn tại trong hệ thống)",
                    "   Ví dụ: SE180001",
                    "",
                    "2. Mã lớp: Mã lớp học phần (bắt buộc, phải tồn tại trong học kỳ này)",
                    "   Ví dụ: SE18B02-PRN211",
                    "",
                    "LƯU Ý:",
                    "- Không được xóa dòng tiêu đề",
                    "- Một sinh viên không thể đăng ký cùng một lớp học phần hai lần",
                    "- Kiểm tra danh sách lớp học phần ở sheet 'Danh sách lớp học phần'"
            };
            for (int i = 0; i < instructions.length; i++) {
                Row row = instructionSheet.createRow(i);
                row.createCell(0).setCellValue(instructions[i]);
            }
            instructionSheet.setColumnWidth(0, 60 * 256);

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

    // ==================== PRIVATE HELPER METHODS ====================

    private EnrollmentResponse convertToEnrollmentResponse(Enrollment enrollment) {
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .className(enrollment.getClassSection().getClassName())
                .studentCode(enrollment.getStudentCode())
                .studentName(enrollment.getStudent().getFullName())
                .avatar(enrollment.getStudent().getAvatar())
                .email(enrollment.getStudent().getEmail())
                .phone(enrollment.getStudent().getPhone())
                .dob(enrollment.getStudent().getDob() != null ? enrollment.getStudent().getDob().toString() : null)
                .major(enrollment.getStudent().getStudentProfile() != null
                        && enrollment.getStudent().getStudentProfile().getMajor() != null
                                ? enrollment.getStudent().getStudentProfile().getMajor().getName()
                                : "")
                .specialization(enrollment.getStudent().getStudentProfile() != null
                        && enrollment.getStudent().getStudentProfile().getSpecialization() != null
                                ? enrollment.getStudent().getStudentProfile().getSpecialization().getName()
                                : "")
                .status(enrollment.getStatus().name())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ClassDetailResponse getClassDetail(String className) {
        ClassSection classSection = classSectionRepository.findByClassNameWithDetails(className)
                .orElseThrow(() -> new RuntimeException("Lớp học không tồn tại: " + className));

        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);

        List<StudentEnrollmentDTO> studentEnrollments = enrollments.stream()
                .map(enrollment -> {
                    User student = enrollment.getStudent();
                    StudentProfile profile = student.getStudentProfile();
                    String studentSpecialization = profile != null && profile.getMajor() != null
                            ? profile.getMajor().getName()
                            : "";
                    if (profile != null && profile.getSpecialization() != null) {
                        studentSpecialization = profile.getSpecialization().getName();
                    }

                    return StudentEnrollmentDTO.builder()
                            .studentName(student.getFullName())
                            .email(student.getEmail())
                            .phone(student.getPhone())
                            .idCard("")
                            .majorName(studentSpecialization)
                            .studentCode(student.getCode())
                            .avatar(student.getAvatar())
                            .status(enrollment.getStatus().name())
                            .build();
                })
                .collect(Collectors.toList());

        String specializationName = classSection.getCourse().getName();
        if (!classSection.getCourse().getSpecializationCourses().isEmpty()) {
            specializationName = classSection.getCourse().getSpecializationCourses().get(0)
                    .getSpecialization().getName();
        }

        // Check if chat group exists for this class
        Optional<ChatGroup> chatGroupOpt = chatGroupRepository.findByClassSectionClassName(className);
        Boolean hasChatGroup = chatGroupOpt.isPresent();
        Long chatGroupId = chatGroupOpt.map(ChatGroup::getId).orElse(null);

        return ClassDetailResponse.builder()
                .className(classSection.getClassName())
                .courseCode(classSection.getCourse().getCode())
                .courseName(classSection.getCourse().getName())
                .semesterName(classSection.getSemester().getName())
                .semesterCode(classSection.getSemester().getCode())
                .majorName(specializationName)
                .courseYear("k19")
                .studentCount(classSection.getCurrentEnrollment())
                .academicYear("2019 - 2023")
                .status(classSection.getStatus().name())
                .hasChatGroup(hasChatGroup)
                .chatGroupId(chatGroupId)
                .enrollments(studentEnrollments)
                .build();
    }

    private ClassSectionResponse convertToResponse(ClassSection classSection) {
        return ClassSectionResponse.builder()
                .className(classSection.getClassName())
                .courseCode(classSection.getCourse().getCode())
                .courseName(classSection.getCourse().getName())
                .semesterName(classSection.getSemester().getName())
                .semesterCode(classSection.getSemester().getCode())
                .lecturerName(classSection.getLecturer() != null ? classSection.getLecturer().getFullName() : null)
                .lecturerUsername(classSection.getLecturer() != null ? classSection.getLecturer().getUsername() : null)
                .enrollmentInfo(classSection.getCurrentEnrollment() + " / " + classSection.getMaxStudents())
                .slots(classSection.getNumberOfSlots())
                .maxStudents(classSection.getMaxStudents())
                .status(classSection.getStatus().name())
                .semesterStatus(classSection.getSemester().getStatus().name())
                .build();
    }

    @Override
    public List<com.fams.backend.dto.response.CourseOptionResponse> getCourseOptionsByLecturerAndSemester(
            String semesterCode, Long lecturerId) {
        return classSectionRepository.findDistinctCoursesByLecturerAndSemester(semesterCode, lecturerId)
                .stream()
                .map(course -> com.fams.backend.dto.response.CourseOptionResponse.builder()
                        .id(course.getId())
                        .code(course.getCode())
                        .name(course.getName())
                        .build())
                .collect(Collectors.toList());
    }
}
