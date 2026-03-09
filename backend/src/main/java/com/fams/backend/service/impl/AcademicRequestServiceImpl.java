package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CreateAcademicRequestDTO;
import com.fams.backend.dto.response.AcademicRequestResponse;
import com.fams.backend.entity.*;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.AcademicRequest.DeadlineRule;
import com.fams.backend.entity.AcademicRequest.RequestStatus;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.*;
import com.fams.backend.service.AcademicRequestService;
import com.fams.backend.service.NotificationService;
import com.fams.backend.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AcademicRequestServiceImpl implements AcademicRequestService {

    private final AcademicRequestRepository academicRequestRepository;
    private final UserRepository userRepository;
    private final SemesterRepository semesterRepository;
    private final CourseRepository courseRepository;
    private final ClassSectionRepository classSectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final MajorRepository majorRepository;
    private final SpecializationRepository specializationRepository;
    private final SubSpecializationRepository subSpecializationRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UploadService uploadService;
    private final NotificationService notificationService;

    @Override
    public AcademicRequestResponse createRequest(CreateAcademicRequestDTO request, MultipartFile file, Long studentId) {
        log.info("Creating academic request for student {}, type: {}", studentId, request.getRequestType());

        // 1. Validate student
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new BadRequestException("Student not found"));

        if (student.getRole() != com.fams.backend.entity.User.UserRole.STUDENT) {
            throw new BadRequestException("Only students can create academic requests");
        }

        // 2. Validate request type
        if (request.getRequestType() == null) {
            throw new BadRequestException("Request type is required");
        }

        // 3. Resolve related entities
        Semester semester = null;
        Course course = null;
        ClassSection classSection = null;

        if (request.getSemesterId() != null) {
            semester = semesterRepository.findById(request.getSemesterId())
                    .orElseThrow(() -> new BadRequestException("Semester not found"));
        }

        if (request.getCourseId() != null) {
            course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new BadRequestException("Course not found"));
        }

        if (request.getClassSectionId() != null) {
            classSection = classSectionRepository.findByClassName(request.getClassSectionId())
                    .orElseThrow(() -> new BadRequestException("Class section not found"));
        }

        // 4. Calculate deadline based on type
        LocalDate startDate = null;
        LocalDate dueDate = null;

        DeadlineRule rule = request.getRequestType().getDeadlineRule();

        if (rule != DeadlineRule.CUSTOM) {
            Map<String, LocalDate> deadlines = calculateDeadline(rule, classSection);
            startDate = deadlines.get("startDate");
            dueDate = deadlines.get("dueDate");

            // Validate if within deadline window
            LocalDate today = LocalDate.now();
            if (startDate != null && today.isBefore(startDate)) {
                throw new BadRequestException(
                        "Request submission period has not started yet. Start date: " + startDate);
            }
            if (dueDate != null && today.isAfter(dueDate)) {
                throw new BadRequestException("Request submission deadline has passed. Due date: " + dueDate);
            }
        }

        // 5. Determine request title
        String requestTitle;
        if (request.getRequestType() == AcademicRequestType.OTHERS) {
            if (request.getRequestTitle() == null || request.getRequestTitle().isBlank()) {
                throw new BadRequestException("Request title is required for 'Others' type");
            }
            requestTitle = request.getRequestTitle();
        } else {
            requestTitle = request.getRequestType().getDefaultTitle();
        }

        // 6. Validate required fields based on type
        validateRequestFields(request);

        // 7. Upload file if provided
        String fileUrl = null;
        if (file != null && !file.isEmpty()) {
            fileUrl = uploadService.uploadFile(file);
        }

        // 8. Check for duplicate pending requests
        if (semester != null) {
            boolean hasPending = academicRequestRepository.existsPendingRequest(
                    studentId, request.getRequestType(), semester.getId());
            if (hasPending) {
                throw new BadRequestException("You already have a pending request of this type for this semester");
            }
        }

        // 9. Build and save entity
        AcademicRequest academicRequest = AcademicRequest.builder()
                .student(student)
                .requestType(request.getRequestType())
                .requestTitle(requestTitle)
                .semester(semester)
                .course(course)
                .classSection(classSection)
                .toClassName(request.getToClassName())
                .toMajor(request.getToMajor())
                .toSpecialization(request.getToSpecialization())
                .toSubSpecialization(request.getToSubSpecialization())
                .reason(request.getReason())
                .note(request.getNote())
                .fileUrl(fileUrl)
                .status(RequestStatus.PENDING)
                .startDate(startDate)
                .dueDate(dueDate)
                .build();

        academicRequest = academicRequestRepository.save(academicRequest);
        log.info("Academic request created with ID: {}", academicRequest.getId());

        // 10. Send notification to academic staff
        try {
            notificationService.notifyAcademicStaffNewRequest(academicRequest);
        } catch (Exception e) {
            log.warn("Failed to send notification for academic request: {}", e.getMessage());
        }

        return mapToResponse(academicRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AcademicRequestResponse> getRequestsByStudent(Long studentId, Pageable pageable) {
        return academicRequestRepository.findByStudentId(studentId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AcademicRequestResponse> getRequestsByStudent(Long studentId, RequestStatus status,
            AcademicRequestType requestType, Pageable pageable) {
        return academicRequestRepository.findByStudentWithFilters(studentId, status,
                requestType, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AcademicRequestResponse> getRequests(String search, RequestStatus status,
            AcademicRequestType requestType, Pageable pageable) {
        return academicRequestRepository.findWithFilters(status, requestType, search, pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AcademicRequestResponse getRequestById(Long id) {
        AcademicRequest request = academicRequestRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Request not found"));
        return mapToResponse(request);
    }

    @Override
    public AcademicRequestResponse updateRequestStatus(Long id, RequestStatus status, String note, Long approverId) {
        log.info("Updating request {} status to {} by approver {}", id, status, approverId);

        AcademicRequest request = academicRequestRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Request not found"));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Only pending requests can be approved/rejected");
        }

        User approver = userRepository.findById(approverId)
                .orElseThrow(() -> new BadRequestException("Approver not found"));

        if (status == RequestStatus.APPROVED) {
            if (request.getRequestType() == AcademicRequestType.CHANGE_CLASS) {
                processClassTransfer(request);
            } else if (request.getRequestType() == AcademicRequestType.CHANGE_MAJOR) {
                processMajorChange(request);
            } else if (request.getRequestType() == AcademicRequestType.CHANGE_SPECIALIZATION) {
                processSpecializationChange(request);
            }
        }

        request.setStatus(status);
        request.setApprover(approver);
        request.setApprovedAt(LocalDateTime.now());
        request.setApproverNote(note);

        request = academicRequestRepository.save(request);

        // Notify student
        try {
            notificationService.notifyStudentRequestStatusChange(request);
        } catch (Exception e) {
            log.warn("Failed to send notification for request status change: {}", e.getMessage());
        }

        return mapToResponse(request);
    }

    /**
     * Perform class transfer for approved CHANGE_CLASS request
     */
    private void processClassTransfer(AcademicRequest request) {
        String toClassName = request.getToClassName();
        if (toClassName == null || toClassName.isBlank()) {
            throw new BadRequestException("Target class name is missing");
        }

        ClassSection targetClass = classSectionRepository.findById(toClassName)
                .orElseThrow(() -> new BadRequestException("Target class not found"));

        // Final validation before transfer
        if (targetClass.getCurrentEnrollment() >= targetClass.getMaxStudents()) {
            throw new BadRequestException("Lớp đã đầy sinh viên không thể chuyển.");
        }

        // Re-check conflict just in case
        AcademicRequestResponse.AcademicRequestResponseBuilder validationBuilder = AcademicRequestResponse.builder();
        validateTransferPossibility(request, validationBuilder);
        AcademicRequestResponse validationResult = validationBuilder.build();
        if (Boolean.FALSE.equals(validationResult.getIsTransferPossible())) {
            throw new BadRequestException(validationResult.getTransferError());
        }

        User student = request.getStudent();
        ClassSection sourceClass = request.getClassSection();

        // 1. Remove from source class
        if (sourceClass != null) {
            Optional<Enrollment> sourceEnrollment = enrollmentRepository.findByClassSection_ClassNameAndStudent_Id(
                    sourceClass.getClassName(), student.getId());

            if (sourceEnrollment.isPresent()) {
                enrollmentRepository.delete(sourceEnrollment.get());
                sourceClass.setCurrentEnrollment(sourceClass.getCurrentEnrollment() - 1);
                classSectionRepository.save(sourceClass);
            }
        }

        // 2. Add to target class
        Enrollment newEnrollment = Enrollment.builder()
                .student(student)
                .classSection(targetClass)
                .status(Enrollment.EnrollmentStatus.ENROLLED)
                .build();

        enrollmentRepository.save(newEnrollment);
        targetClass.setCurrentEnrollment(targetClass.getCurrentEnrollment() + 1);
        classSectionRepository.save(targetClass);

        log.info("Student {} transferred from {} to {}", student.getCode(),
                sourceClass != null ? sourceClass.getClassName() : "N/A", toClassName);
    }

    /**
     * Update student profile when CHANGE_MAJOR is approved
     */
    private void processMajorChange(AcademicRequest request) {
        User student = request.getStudent();
        StudentProfile profile = student.getStudentProfile();
        if (profile == null) {
            log.warn("Student {} has no profile to update major", student.getCode());
            return;
        }

        log.info("Processing major change for student {}. ToMajor: {}, ToSpec: {}",
                student.getCode(), request.getToMajor(), request.getToSpecialization());

        // 1. Resolve new Major
        Major newMajor = null;
        if (request.getToMajor() != null && !request.getToMajor().isBlank()) {
            newMajor = majorRepository.findByNameIgnoreCase(request.getToMajor())
                    .orElseGet(() -> majorRepository.findByCode(request.getToMajor()).orElse(null));
        }

        if (newMajor != null) {
            profile.setMajor(newMajor);
            log.info("Updated Major for student {} to {} (ID: {})", student.getCode(), newMajor.getName(),
                    newMajor.getId());

            // 2. Resolve new Specialization if provided
            boolean hasToSpec = request.getToSpecialization() != null && !request.getToSpecialization().isBlank();
            if (hasToSpec) {
                Specialization newSpec = specializationRepository.findByNameIgnoreCase(request.getToSpecialization())
                        .orElseGet(
                                () -> specializationRepository.findByCode(request.getToSpecialization()).orElse(null));

                if (newSpec != null) {
                    profile.setSpecialization(newSpec);
                    log.info("Updated Specialization for student {} to {} (ID: {})", student.getCode(),
                            newSpec.getName(), newSpec.getId());
                } else {
                    log.warn("Could not find Specialization matching '{}' for student {}",
                            request.getToSpecialization(), student.getCode());
                    profile.setSpecialization(null); // Clear old spec as it doesn't match the new major/intent
                }
                // When changing both Major and Specialization, clear Sub-specialization
                profile.setSubSpecialization(null);
                log.info("Cleared SubSpecialization for student {} due to Major & Specialization change",
                        student.getCode());
            } else {
                // When ONLY changing Major, clear both Specialization and Sub-specialization
                profile.setSpecialization(null);
                profile.setSubSpecialization(null);
                log.info("Cleared Specialization and SubSpecialization for student {} due to ONLY Major change",
                        student.getCode());
            }
        } else {
            log.error("CRITICAL: Approved Major Change for student {} but target major '{}' not found!",
                    student.getCode(), request.getToMajor());
        }

        studentProfileRepository.saveAndFlush(profile);
    }

    /**
     * Update student profile when CHANGE_SPECIALIZATION (Sub-specialization/Combo)
     * is
     * approved
     */
    private void processSpecializationChange(AcademicRequest request) {
        User student = request.getStudent();
        StudentProfile profile = student.getStudentProfile();
        if (profile == null) {
            log.warn("Student {} has no profile to update sub-specialization", student.getCode());
            return;
        }

        if (request.getToSubSpecialization() != null && !request.getToSubSpecialization().isBlank()) {
            SubSpecialization newSubSpec = subSpecializationRepository.findByName(request.getToSubSpecialization())
                    .orElseGet(() -> subSpecializationRepository.findByCode(request.getToSubSpecialization())
                            .orElse(null));

            if (newSubSpec != null) {
                profile.setSubSpecialization(newSubSpec);
                log.info("Updated SubSpecialization for student {} to {}", student.getCode(), newSubSpec.getName());
            }
        }

        studentProfileRepository.save(profile);
    }

    @Override
    public AcademicRequestResponse cancelRequest(Long id, Long studentId) {
        log.info("Student {} cancelling request {}", studentId, id);

        AcademicRequest request = academicRequestRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("Request not found"));

        if (!request.getStudent().getId().equals(studentId)) {
            throw new BadRequestException("You can only cancel your own requests");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Only pending requests can be cancelled");
        }

        request.setStatus(RequestStatus.CANCELLED);
        request = academicRequestRepository.save(request);

        return mapToResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getRequestStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("pending", academicRequestRepository.countByStatus(RequestStatus.PENDING));
        stats.put("approved", academicRequestRepository.countByStatus(RequestStatus.APPROVED));
        stats.put("rejected", academicRequestRepository.countByStatus(RequestStatus.REJECTED));
        stats.put("cancelled", academicRequestRepository.countByStatus(RequestStatus.CANCELLED));
        return stats;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRequestTypes(Long studentId) {
        List<Map<String, Object>> types = new ArrayList<>();

        for (AcademicRequestType type : AcademicRequestType.values()) {
            Map<String, Object> typeInfo = new HashMap<>();
            typeInfo.put("value", type.name());
            typeInfo.put("label", type.getDefaultTitle());
            typeInfo.put("description", type.getDescription());
            typeInfo.put("deadlineRule", type.getDeadlineRule().name());

            // Calculate deadline info
            if (type.getDeadlineRule() != DeadlineRule.CUSTOM
                    && type.getDeadlineRule() != DeadlineRule.THREE_DAYS_AFTER) {
                Map<String, LocalDate> deadlines = calculateDeadline(type.getDeadlineRule(), null);
                typeInfo.put("startDate", deadlines.get("startDate"));
                typeInfo.put("dueDate", deadlines.get("dueDate"));

                LocalDate today = LocalDate.now();
                boolean canSubmit = true;
                if (deadlines.get("startDate") != null && today.isBefore(deadlines.get("startDate"))) {
                    canSubmit = false;
                }
                if (deadlines.get("dueDate") != null && today.isAfter(deadlines.get("dueDate"))) {
                    canSubmit = false;
                }
                typeInfo.put("canSubmit", canSubmit);
            } else if (type.getDeadlineRule() == DeadlineRule.THREE_DAYS_AFTER) {
                // For 3DA, deadline depends on class section (will be calculated when class is
                // selected)
                typeInfo.put("requiresClassSection", true);
                typeInfo.put("canSubmit", true); // Will be validated on submission
            } else {
                typeInfo.put("canSubmit", true); // CUSTOM has no deadline
            }

            types.add(typeInfo);
        }

        return types;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> checkDeadline(AcademicRequestType requestType, String classSectionId) {
        Map<String, Object> result = new HashMap<>();

        ClassSection classSection = null;
        if (classSectionId != null) {
            classSection = classSectionRepository.findByClassName(classSectionId).orElse(null);
        }

        DeadlineRule rule = requestType.getDeadlineRule();

        if (rule == DeadlineRule.CUSTOM) {
            result.put("canSubmit", true);
            result.put("message", "No deadline for this request type");
            return result;
        }

        Map<String, LocalDate> deadlines = calculateDeadline(rule, classSection);
        LocalDate startDate = deadlines.get("startDate");
        LocalDate dueDate = deadlines.get("dueDate");

        result.put("startDate", startDate);
        result.put("dueDate", dueDate);

        LocalDate today = LocalDate.now();
        boolean canSubmit = true;
        String message = "You can submit this request";

        if (startDate != null && today.isBefore(startDate)) {
            canSubmit = false;
            message = "Request submission period has not started. Start date: " + startDate;
        } else if (dueDate != null && today.isAfter(dueDate)) {
            canSubmit = false;
            message = "Request submission deadline has passed. Due date: " + dueDate;
        }

        result.put("canSubmit", canSubmit);
        result.put("message", message);

        return result;
    }

    /**
     * Calculate start date and due date based on deadline rule
     */
    private Map<String, LocalDate> calculateDeadline(DeadlineRule rule, ClassSection classSection) {
        Map<String, LocalDate> result = new HashMap<>();
        LocalDate dueDate = null;
        LocalDate startDate = null;

        switch (rule) {
            case ONE_WEEK_BEFORE:
                // 1TB: 1 week before the nearest upcoming semester starts
                Semester upcomingSemester1TB = getUpcomingSemester();
                if (upcomingSemester1TB != null) {
                    dueDate = upcomingSemester1TB.getStartDate().minusWeeks(1);
                    startDate = dueDate.minusWeeks(2);
                }
                break;

            case BEFORE_SEMESTER:
                // B: Before the nearest upcoming semester starts
                Semester upcomingSemesterB = getUpcomingSemester();
                if (upcomingSemesterB != null) {
                    dueDate = upcomingSemesterB.getStartDate().minusDays(1);
                    startDate = dueDate.minusWeeks(2);
                }
                break;

            case THREE_DAYS_AFTER:
                // 3DA: 3 days after grade announcement (PE/FE)
                if (classSection != null && classSection.getGradesPublishedAt() != null) {
                    LocalDate publishDate = classSection.getGradesPublishedAt().toLocalDate();
                    startDate = publishDate;
                    dueDate = publishDate.plusDays(3);
                }
                break;

            case FIVE_WEEKS_BEFORE:
                // 5TB: 5 weeks before the nearest upcoming semester starts
                Semester upcomingSemester5TB = getUpcomingSemester();
                if (upcomingSemester5TB != null) {
                    dueDate = upcomingSemester5TB.getStartDate().minusWeeks(5);
                    startDate = dueDate.minusWeeks(2);
                }
                break;

            case CUSTOM:
            default:
                // No deadline
                break;
        }

        result.put("startDate", startDate);
        result.put("dueDate", dueDate);
        return result;
    }

    /**
     * Get the nearest upcoming semester
     */
    private Semester getUpcomingSemester() {
        List<Semester> upcomingSemesters = semesterRepository.findUpcomingSemesters();
        if (!upcomingSemesters.isEmpty()) {
            return upcomingSemesters.get(0);
        }
        // Fallback: if no upcoming, get active semester
        List<Semester> activeSemesters = semesterRepository.findActiveSemesters();
        if (!activeSemesters.isEmpty()) {
            return activeSemesters.get(0);
        }
        return null;
    }

    /**
     * Validate required fields based on request type
     */
    private void validateRequestFields(CreateAcademicRequestDTO request) {
        AcademicRequestType type = request.getRequestType();

        if (request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Reason is required");
        }

        switch (type) {
            case CHANGE_CLASS:
                if (request.getClassSectionId() == null || request.getClassSectionId().isBlank()) {
                    throw new BadRequestException("Current class section is required for class change request");
                }
                if (request.getToClassName() == null || request.getToClassName().isBlank()) {
                    throw new BadRequestException("Target class name is required for class change request");
                }
                break;

            case RETAKE_COURSE:
            case OVERLOAD_STUDY:
                if (request.getCourseId() == null) {
                    throw new BadRequestException("Course is required for this request type");
                }
                break;

            case GRADE_APPEAL:
                if (request.getClassSectionId() == null || request.getClassSectionId().isBlank()) {
                    throw new BadRequestException("Class section is required for grade appeal");
                }
                break;

            case CHANGE_MAJOR:
                if (request.getToMajor() == null || request.getToMajor().isBlank()) {
                    throw new BadRequestException("Target major is required for major change request");
                }
                break;

            case CHANGE_SPECIALIZATION:
                if (request.getToSubSpecialization() == null || request.getToSubSpecialization().isBlank()) {
                    throw new BadRequestException("Target sub-specialization is required");
                }
                break;

            default:
                // No additional validation for other types
                break;
        }
    }

    /**
     * Map entity to response DTO
     */
    private AcademicRequestResponse mapToResponse(AcademicRequest request) {
        User student = request.getStudent();
        StudentProfile studentProfile = student.getStudentProfile();

        AcademicRequestResponse.AcademicRequestResponseBuilder builder = AcademicRequestResponse.builder()
                .id(request.getId())
                .studentId(student.getId())
                .studentCode(student.getCode())
                .studentName(student.getFullName())
                .studentEmail(student.getEmail())
                .studentAvatar(student.getAvatar())
                .requestType(request.getRequestType().name())
                .requestTypeLabel(request.getRequestType().getDefaultTitle())
                .requestTitle(request.getRequestTitle())
                .reason(request.getReason())
                .note(request.getNote())
                .fileUrl(request.getFileUrl())
                .status(request.getStatus().name())
                .statusLabel(getStatusLabel(request.getStatus()))
                .startDate(request.getStartDate())
                .dueDate(request.getDueDate())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt());

        // Student profile info
        if (studentProfile != null) {
            if (studentProfile.getMajor() != null) {
                builder.studentMajor(studentProfile.getMajor().getName());
            }
            if (studentProfile.getSpecialization() != null) {
                builder.studentSpecialization(studentProfile.getSpecialization().getName());
            }
            if (studentProfile.getSubSpecialization() != null) {
                builder.studentSubSpecialization(studentProfile.getSubSpecialization().getName());
            }
        }

        // Semester info
        if (request.getSemester() != null) {
            builder.semesterId(request.getSemester().getId())
                    .semesterCode(request.getSemester().getCode())
                    .semesterName(request.getSemester().getName());
        }

        // Course info
        if (request.getCourse() != null) {
            builder.courseId(request.getCourse().getId())
                    .courseCode(request.getCourse().getCode())
                    .courseName(request.getCourse().getName());
        }

        // Class section info
        if (request.getClassSection() != null) {
            builder.classSectionId(request.getClassSection().getClassName())
                    .className(request.getClassSection().getClassName());
        }

        // Target fields
        builder.toClassName(request.getToClassName())
                .toMajor(request.getToMajor())
                .toSpecialization(request.getToSpecialization())
                .toSubSpecialization(request.getToSubSpecialization());

        // Approver info
        if (request.getApprover() != null) {
            builder.approverId(request.getApprover().getId())
                    .approverName(request.getApprover().getFullName())
                    .approverAvatar(request.getApprover().getAvatar())
                    .approvedAt(request.getApprovedAt())
                    .approverNote(request.getApproverNote());
        }

        // Check if within deadline
        LocalDate today = LocalDate.now();
        boolean isWithinDeadline = true;
        if (request.getStartDate() != null && today.isBefore(request.getStartDate())) {
            isWithinDeadline = false;
        }
        if (request.getDueDate() != null && today.isAfter(request.getDueDate())) {
            isWithinDeadline = false;
        }
        builder.isWithinDeadline(isWithinDeadline);

        // Add transfer possibility info for CHANGE_CLASS
        if (request.getRequestType() == AcademicRequestType.CHANGE_CLASS
                && request.getStatus() == RequestStatus.PENDING) {
            validateTransferPossibility(request, builder);
        } else if (request.getRequestType() == AcademicRequestType.CHANGE_SPECIALIZATION
                && request.getStatus() == RequestStatus.PENDING) {
            if (studentProfile == null || studentProfile.getSubSpecialization() == null) {
                builder.isApprovable(false);
                builder.validationMessage("Sinh viên chưa đến kỳ đăng ký chuyên ngành hẹp");
            } else {
                builder.isApprovable(true);
            }
        } else {
            builder.isApprovable(true);
        }

        return builder.build();
    }

    /**
     * Validate if a class transfer is possible (capacity + schedule conflict)
     */
    private void validateTransferPossibility(AcademicRequest request,
            AcademicRequestResponse.AcademicRequestResponseBuilder builder) {
        if (request.getToClassName() == null || request.getToClassName().isBlank()) {
            builder.isTransferPossible(false);
            builder.isApprovable(false);
            builder.validationMessage("Chưa xác định lớp muốn chuyển đến.");
            builder.transferError("Chưa xác định lớp muốn chuyển đến.");
            return;
        }

        ClassSection targetClass = classSectionRepository.findById(request.getToClassName()).orElse(null);
        if (targetClass == null) {
            builder.isTransferPossible(false);
            builder.isApprovable(false);
            builder.validationMessage("Không tìm thấy lớp học phần mục tiêu.");
            builder.transferError("Không tìm thấy lớp học phần mục tiêu.");
            return;
        }

        // 1. Check Capacity
        if (targetClass.getCurrentEnrollment() >= targetClass.getMaxStudents()) {
            builder.isTransferPossible(false);
            builder.isApprovable(false);
            builder.validationMessage("Lớp đã đầy sinh viên không thể chuyển.");
            builder.transferError("Lớp đã đầy sinh viên không thể chuyển.");
            return;
        }

        // 2. Check Schedule Conflict
        User student = request.getStudent();
        List<TimetableSlot> targetSlots = timetableSlotRepository.findByClassName(targetClass.getClassName());

        // Get student's other classes in the same semester (excluding current class of
        // this request)
        List<Enrollment> currentEnrollments = enrollmentRepository.findByStudentIdAndSemesterId(
                student.getId(), targetClass.getSemester().getId());

        for (TimetableSlot targetSlot : targetSlots) {
            if (targetSlot.getStatus() == TimetableSlot.TimetableSlotStatus.CANCELLED)
                continue;

            for (Enrollment enrollment : currentEnrollments) {
                // Skip the class the student is trying to move FROM
                if (request.getClassSection() != null &&
                        enrollment.getClassSection().getClassName().equals(request.getClassSection().getClassName())) {
                    continue;
                }

                // Check for conflicts in other classes
                boolean conflict = timetableSlotRepository.existsByClassNameAndDateAndSlotNumberExcludingSlot(
                        enrollment.getClassSection().getClassName(),
                        targetSlot.getDate(),
                        targetSlot.getSlotNumber(),
                        TimetableSlot.TimetableSlotStatus.CANCELLED,
                        -1L // No slot to exclude
                );

                if (conflict) {
                    builder.isTransferPossible(false);
                    builder.isApprovable(false);
                    builder.validationMessage(
                            "Lớp không phù hợp để chuyển qua vì có xung đột với các lớp khác của sinh viên.");
                    builder.transferError(
                            "Lớp không phù hợp để chuyển qua vì có xung đột với các lớp khác của sinh viên.");
                    return;
                }
            }
        }

        builder.isTransferPossible(true);
        builder.isApprovable(true);
    }

    /**
     * Get Vietnamese label for status
     */
    private String getStatusLabel(RequestStatus status) {
        return switch (status) {
            case PENDING -> "Chờ xử lý";
            case APPROVED -> "Đã duyệt";
            case REJECTED -> "Từ chối";
            case CANCELLED -> "Đã hủy";
        };
    }
}
