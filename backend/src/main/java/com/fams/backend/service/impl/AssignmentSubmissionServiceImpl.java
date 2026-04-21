package com.fams.backend.service.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fams.backend.dto.request.CreateAssignmentRequest;
import com.fams.backend.dto.request.SubmitAssignmentRequest;
import com.fams.backend.dto.response.AssignmentPlagiarismMatchResponse;
import com.fams.backend.dto.response.AssignmentPlagiarismResponse;
import com.fams.backend.dto.response.AssignmentResponse;
import com.fams.backend.dto.response.AssignmentSubmissionResponse;
import com.fams.backend.entity.AssignmentPlagiarismCheck;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.AssignmentSubmissionService;
import com.fams.backend.service.UserNotificationService;
import com.fams.backend.service.plagiarism.AssignmentVectorIndexingService;
import com.fams.backend.service.plagiarism.AssignmentVectorPlagiarismService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AssignmentSubmissionServiceImpl implements AssignmentSubmissionService {

    private static final double DEFAULT_TEXT_THRESHOLD = 0.70d;
    private static final double DEFAULT_IMAGE_THRESHOLD = 0.95d;
    private static final String INTERNAL_PLAGIARISM_MODEL = "logistic-regression-v1";
    private static final String PLAGIARISM_MODEL_RESOURCE = "ml/assignment-plagiarism-model.json";
    private static final int MIN_TEXT_ANALYSIS_LENGTH = 40;
    private static final int IMAGE_HASH_SIZE = 8;

    private final AssignmentRepository assignmentRepository;
    private final AssignmentPlagiarismCheckRepository plagiarismCheckRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final ClassSectionRepository classSectionRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final UserNotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final AssignmentVectorIndexingService assignmentVectorIndexingService;
    private final AssignmentVectorPlagiarismService assignmentVectorPlagiarismService;

    private volatile PlagiarismModelConfig plagiarismModelConfig;

    @PostConstruct
    void loadPlagiarismModelOnStartup() {
        this.plagiarismModelConfig = loadPlagiarismModelConfig();
    }

    @Override
    public AssignmentResponse createAssignment(CreateAssignmentRequest request, Long lecturerId) {
        ClassSection classSection = classSectionRepository.findByClassName(request.getClassName())
                .orElseThrow(() -> new RuntimeException("Lớp không tồn tại: " + request.getClassName()));

        // Verify lecturer owns this class
        if (!classSection.getLecturer().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải giảng viên của lớp này");
        }

        // Validate dueDate is not in the past (precise to minute)
        if (request.getDueDate() != null) {
            if (request.getDueDate().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("Hạn nộp bài phải sau thời điểm hiện tại");
            }
        }

        User lecturer = userRepository.findById(lecturerId)
                .orElseThrow(() -> new RuntimeException("User not found: " + lecturerId));

        TimetableSlot slot = null;
        if (request.getTimetableSlotId() != null) {
            slot = timetableSlotRepository.findById(request.getTimetableSlotId())
                    .orElseThrow(() -> new RuntimeException("Slot không tồn tại: " + request.getTimetableSlotId()));

            // Verify slot belongs to this class
            if (!slot.getClassSection().getClassName().equals(request.getClassName())) {
                throw new RuntimeException("Slot không thuộc lớp học này");
            }
        }

        // Join reference URLs/names with ||| delimiter
        String joinedRefUrl = null;
        String joinedRefName = null;
        if (request.getReferenceUrls() != null && !request.getReferenceUrls().isEmpty()) {
            joinedRefUrl = String.join("|||", request.getReferenceUrls());
            joinedRefName = request.getReferenceNames() != null
                    ? String.join("|||", request.getReferenceNames())
                    : String.join("|||", request.getReferenceUrls());
        }

        Assignment assignment = Assignment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .classSection(classSection)
                .createdBy(lecturer)
                .dueDate(request.getDueDate())
                .referenceUrl(joinedRefUrl)
                .referenceName(joinedRefName)
                .status(Assignment.AssignmentStatus.OPEN)
                .timetableSlot(slot)
                .build();

        assignment = assignmentRepository.save(assignment);
        log.info("Assignment created: id={}, class={}, lecturer={}, slot={}", assignment.getId(),
                request.getClassName(),
                lecturerId, slot != null ? slot.getId() : "null");

        // Gửi thông báo cho sinh viên trong lớp
        sendNewAssignmentNotifications(assignment, classSection, lecturer);

        return toAssignmentResponse(assignment);
    }

    @Override
    public void closeAssignment(Long assignmentId, Long lecturerId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại: " + assignmentId));

        if (!assignment.getCreatedBy().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải người tạo bài tập này");
        }

        assignment.setStatus(Assignment.AssignmentStatus.CLOSED);
        assignmentRepository.save(assignment);
        log.info("Assignment closed: id={}, lecturer={}", assignmentId, lecturerId);
    }

    @Override
    public AssignmentResponse updateDueDate(Long assignmentId, Long lecturerId, LocalDateTime newDueDate) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại: " + assignmentId));

        if (!assignment.getCreatedBy().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải người tạo bài tập này");
        }

        if (newDueDate.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Hạn nộp bài phải sau thời điểm hiện tại");
        }

        assignment.setDueDate(newDueDate);
        // Auto-reopen if new due date is in the future
        if (assignment.getStatus() == Assignment.AssignmentStatus.CLOSED && newDueDate.isAfter(LocalDateTime.now())) {
            assignment.setStatus(Assignment.AssignmentStatus.OPEN);
            log.info("Assignment auto-reopened: id={}", assignmentId);
        }
        assignmentRepository.save(assignment);
        log.info("Assignment due date updated: id={}, newDueDate={}, lecturer={}", assignmentId, newDueDate,
                lecturerId);

        return toAssignmentResponse(assignment);
    }

    @Override
    public List<AssignmentResponse> getAssignmentsByClass(String className) {
        List<Assignment> assignments = assignmentRepository
                .findByClassSection_ClassNameOrderByCreatedAtDesc(className);
        // Auto-close expired assignments
        autoCloseExpiredAssignments(assignments);
        return assignments.stream().map(this::toAssignmentResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentSubmissionResponse> getAssignmentSubmissions(Long assignmentId) {
        List<AssignmentSubmission> submissions = submissionRepository.findByAssignment_Id(assignmentId);
        return submissions.stream().map(this::toSubmissionResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentSubmissionResponse> getAllStudentSubmissionStatus(Long assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại: " + assignmentId));

        String className = assignment.getClassSection().getClassName();
        List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);
        List<AssignmentSubmission> submissions = submissionRepository.findByAssignment_Id(assignmentId);

        // Build a map: studentId -> submission
        java.util.Map<Long, AssignmentSubmission> submissionMap = new java.util.HashMap<>();
        for (AssignmentSubmission sub : submissions) {
            submissionMap.put(sub.getStudent().getId(), sub);
        }

        List<AssignmentSubmissionResponse> result = new ArrayList<>();
        for (Enrollment enrollment : enrollments) {
            User student = enrollment.getStudent();
            AssignmentSubmission sub = submissionMap.get(student.getId());

            if (sub != null) {
                result.add(toSubmissionResponse(sub));
            } else {
                result.add(AssignmentSubmissionResponse.builder()
                        .assignmentId(assignmentId)
                        .assignmentTitle(assignment.getTitle())
                        .className(className)
                        .courseCode(assignment.getClassSection().getCourse().getCode())
                        .courseName(assignment.getClassSection().getCourse().getName())
                        .studentCode(enrollment.getStudentCode())
                        .studentName(student.getFullName())
                        .status(AssignmentSubmission.SubmissionStatus.NOT_SUBMITTED)
                        .assignmentDueDate(assignment.getDueDate())
                        .build());
            }
        }

        return result;
    }

    @Override
    public AssignmentSubmissionResponse submitAssignment(SubmitAssignmentRequest request, Long studentId) {
        Long assignmentId = request.getAssignmentId();

        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại: " + assignmentId));

        // Check assignment is open
        if (assignment.getStatus() != Assignment.AssignmentStatus.OPEN) {
            throw new RuntimeException("Bài tập đã đóng, không thể nộp bài");
        }

        // Check if deadline has passed
        if (assignment.getDueDate() != null && assignment.getDueDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Bài tập đã quá hạn nộp");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("User not found: " + studentId));

        // Check student is enrolled in this class section
        String className = assignment.getClassSection().getClassName();
        Enrollment enrollment = enrollmentRepository
                .findByClassSection_ClassNameAndStudent_Id(className, studentId)
                .orElseThrow(() -> new RuntimeException("Bạn không đăng ký lớp học phần này"));

        // Check if already submitted — if yes, update the existing one
        Optional<AssignmentSubmission> existing = submissionRepository
                .findByAssignment_IdAndStudent_Id(assignmentId, studentId);

        // Join multiple file URLs/names with ||| delimiter
        String joinedFileUrl = null;
        String joinedFileName = null;
        if (request.getFileUrls() != null && !request.getFileUrls().isEmpty()) {
            joinedFileUrl = String.join("|||", request.getFileUrls());
            joinedFileName = request.getFileNames() != null
                    ? String.join("|||", request.getFileNames())
                    : String.join("|||", request.getFileUrls());
        }

        AssignmentSubmission submission;
        if (existing.isPresent()) {
            // Update existing submission
            submission = existing.get();
            submission.setFileUrl(joinedFileUrl);
            submission.setFileName(joinedFileName);
            submission.setNote(request.getNote());
            submission.setStatus(AssignmentSubmission.SubmissionStatus.SUBMITTED);
        } else {
            // Create new submission
            submission = AssignmentSubmission.builder()
                    .assignment(assignment)
                    .enrollment(enrollment)
                    .student(student)
                    .fileUrl(joinedFileUrl)
                    .fileName(joinedFileName)
                    .note(request.getNote())
                    .status(AssignmentSubmission.SubmissionStatus.SUBMITTED)
                    .build();
        }

        submission = submissionRepository.save(submission);
        log.info("Assignment submitted: assignment={}, student={}", assignmentId, studentId);

        try {
            assignmentVectorIndexingService.enqueueSubmissionIndexing(submission.getId());
        } catch (Exception e) {
            log.warn("Failed to enqueue vector indexing for submission {}: {}", submission.getId(), e.getMessage());
        }

        User lecturer = assignment.getCreatedBy();
        if (lecturer != null) {
            String title = "Sinh viên đã nộp bài: " + assignment.getTitle();
            String content = student.getFullName() + " đã nộp bài cho bài tập \""
                    + assignment.getTitle() + "\" (lớp " + className + ").";
            notificationService.createNotification(
                    lecturer,
                    title,
                    content,
                    Notification.NotificationType.SUBMISSION,
                    "/lecturer/assignments",
                    student);
        }

        return toSubmissionResponse(submission);
    }

    @Override
    public List<AssignmentSubmissionResponse> getStudentAssignments(Long studentId) {
        // Get all enrollments for this student
        List<Enrollment> enrollments = enrollmentRepository.findByStudent_Id(studentId);
        List<AssignmentSubmissionResponse> result = new ArrayList<>();

        for (Enrollment enrollment : enrollments) {
            String className = enrollment.getClassSection().getClassName();

            // Get ALL assignments for this class (both OPEN and CLOSED)
            List<Assignment> assignments = assignmentRepository
                    .findByClassSection_ClassNameOrderByCreatedAtDesc(className);
            autoCloseExpiredAssignments(assignments);

            for (Assignment assignment : assignments) {
                Optional<AssignmentSubmission> submission = submissionRepository
                        .findByAssignment_IdAndStudent_Id(assignment.getId(), studentId);

                if (submission.isPresent()) {
                    result.add(toSubmissionResponse(submission.get()));
                } else {
                    // Determine status: OVERDUE if assignment is closed/expired, NOT_SUBMITTED if
                    // still open
                    AssignmentSubmission.SubmissionStatus status = assignment
                            .getStatus() == Assignment.AssignmentStatus.CLOSED
                                    ? AssignmentSubmission.SubmissionStatus.OVERDUE
                                    : AssignmentSubmission.SubmissionStatus.NOT_SUBMITTED;

                    result.add(AssignmentSubmissionResponse.builder()
                            .assignmentId(assignment.getId())
                            .assignmentTitle(assignment.getTitle())
                            .className(className)
                            .courseCode(enrollment.getClassSection().getCourse().getCode())
                            .courseName(enrollment.getClassSection().getCourse().getName())
                            .studentCode(enrollment.getStudentCode())
                            .studentName(enrollment.getStudent().getFullName())
                            .status(status)
                            .assignmentDueDate(assignment.getDueDate())
                            .referenceUrl(assignment.getReferenceUrl())
                            .referenceName(assignment.getReferenceName())
                            .referenceUrls(
                                    assignment.getReferenceUrl() != null && !assignment.getReferenceUrl().isEmpty()
                                            ? Arrays.asList(assignment.getReferenceUrl().split("\\|\\|\\|"))
                                            : Collections.emptyList())
                            .referenceNames(
                                    assignment.getReferenceName() != null && !assignment.getReferenceName().isEmpty()
                                            ? Arrays.asList(assignment.getReferenceName().split("\\|\\|\\|"))
                                            : Collections.emptyList())
                            .build());
                }
            }
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public AssignmentSubmissionResponse getMySubmission(Long assignmentId, Long studentId) {
        AssignmentSubmission submission = submissionRepository
                .findByAssignment_IdAndStudent_Id(assignmentId, studentId)
                .orElse(null);

        if (submission != null) {
            return toSubmissionResponse(submission);
        }

        // Return NOT_SUBMITTED placeholder
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại: " + assignmentId));

        return AssignmentSubmissionResponse.builder()
                .assignmentId(assignmentId)
                .assignmentTitle(assignment.getTitle())
                .className(assignment.getClassSection().getClassName())
                .courseCode(assignment.getClassSection().getCourse().getCode())
                .courseName(assignment.getClassSection().getCourse().getName())
                .status(AssignmentSubmission.SubmissionStatus.NOT_SUBMITTED)
                .assignmentDueDate(assignment.getDueDate())
                .timetableSlotId(assignment.getTimetableSlot() != null ? assignment.getTimetableSlot().getId() : null)
                .referenceUrl(assignment.getReferenceUrl())
                .referenceName(assignment.getReferenceName())
                .referenceUrls(assignment.getReferenceUrl() != null && !assignment.getReferenceUrl().isEmpty()
                        ? Arrays.asList(assignment.getReferenceUrl().split("\\|\\|\\|"))
                        : Collections.emptyList())
                .referenceNames(assignment.getReferenceName() != null && !assignment.getReferenceName().isEmpty()
                        ? Arrays.asList(assignment.getReferenceName().split("\\|\\|\\|"))
                        : Collections.emptyList())
                .build();
    }

    // === Notification helper ===

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendNewAssignmentNotifications(Assignment a, ClassSection cs, User lecturer) {
        try {
            String dueNote = a.getDueDate() != null
                    ? " trước " + a.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                    : "";
            String courseCode = cs.getCourse().getCode();
            String title = "Bài tập môn " + courseCode;
            String content = "Giảng viên đã giao cho em một bài tập mới trong môn "
                    + courseCode + "."
                    + " Em vui lòng vào hệ thống để xem chi tiết yêu cầu"
                    + " và hoàn thành bài tập" + dueNote + " nhé.</br>\n\n"
                    + "Chúc em học tốt!";

            // Chi lay sinh vien dang ky dung lop nay
            List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(cs.getClassName());

            List<User> recipients = enrollments.stream()
                    .map(Enrollment::getStudent)
                    .filter(java.util.Objects::nonNull)
                    .toList();

            notificationService.createBatchNotification(
                    recipients,
                    title,
                    content,
                    Notification.NotificationType.NEW_ASSIGNMENT,
                    "/student/assignments");
            log.info("Sent assignment notification to {} students in class {}",
                    enrollments.size(), cs.getClassName());
        } catch (Exception ex) {
            log.warn("Failed to send assignment notifications for class {}: {}",
                    cs.getClassName(), ex.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendDueDateReminderNotifications(Assignment a) {
        try {
            ClassSection cs = a.getClassSection();
            String courseCode = cs.getCourse().getCode();
            String due = a.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

            String title = "Nhắc nhở: Bài tập môn " + courseCode + " sắp đến hạn";
            String content = "Bài tập môn " + courseCode
                    + " của em sẽ đến hạn nộp vào " + due
                    + ". Em vui lòng hoàn thành và nộp bài trước thời hạn nhé.</br>\n\nChúc em học tốt!";

            List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(cs.getClassName());

            List<User> recipients = enrollments.stream()
                    .map(Enrollment::getStudent)
                    .filter(java.util.Objects::nonNull)
                    .toList();

            notificationService.createBatchNotification(
                    recipients,
                    title,
                    content,
                    Notification.NotificationType.ASSIGNMENT_DEADLINE,
                    "/student/assignments");
            log.info("Sent due-date reminder to {} students for assignment {} (class {})",
                    enrollments.size(), a.getId(), cs.getClassName());
        } catch (Exception ex) {
            log.warn("Failed to send due-date reminder for assignment {}: {}",
                    a.getId(), ex.getMessage());
        }
    }

    // === Auto-close helper ===

    private void autoCloseExpiredAssignments(List<Assignment> assignments) {
        LocalDateTime now = LocalDateTime.now();
        for (Assignment assignment : assignments) {
            if (assignment.getStatus() == Assignment.AssignmentStatus.OPEN
                    && assignment.getDueDate() != null
                    && assignment.getDueDate().isBefore(now)) {
                assignment.setStatus(Assignment.AssignmentStatus.CLOSED);
                assignmentRepository.save(assignment);
                log.info("Auto-closed expired assignment: id={}, dueDate={}", assignment.getId(),
                        assignment.getDueDate());
            }
        }
    }

    // === Mapping helpers ===

    private AssignmentResponse toAssignmentResponse(Assignment assignment) {
        ClassSection cs = assignment.getClassSection();
        long totalSubmissions = submissionRepository.countByAssignment_Id(assignment.getId());
        long totalStudents = enrollmentRepository.countByClassSectionClassName(cs.getClassName());

        return AssignmentResponse.builder()
                .id(assignment.getId())
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .timetableSlotId(assignment.getTimetableSlot() != null ? assignment.getTimetableSlot().getId() : null)
                .className(cs.getClassName())
                .courseName(cs.getCourse().getName())
                .courseCode(cs.getCourse().getCode())
                .lecturerName(assignment.getCreatedBy().getFullName())
                .dueDate(assignment.getDueDate())
                .referenceUrl(assignment.getReferenceUrl())
                .referenceName(assignment.getReferenceName())
                .referenceUrls(assignment.getReferenceUrl() != null && !assignment.getReferenceUrl().isEmpty()
                        ? Arrays.asList(assignment.getReferenceUrl().split("\\|\\|\\|"))
                        : Collections.emptyList())
                .referenceNames(assignment.getReferenceName() != null && !assignment.getReferenceName().isEmpty()
                        ? Arrays.asList(assignment.getReferenceName().split("\\|\\|\\|"))
                        : Collections.emptyList())
                .plagiarismTextThreshold(assignment.getPlagiarismTextThreshold() != null
                        ? assignment.getPlagiarismTextThreshold()
                        : DEFAULT_TEXT_THRESHOLD)
                .plagiarismImageThreshold(assignment.getPlagiarismImageThreshold() != null
                        ? assignment.getPlagiarismImageThreshold()
                        : DEFAULT_IMAGE_THRESHOLD)
                .status(assignment.getStatus().name())
                .totalSubmissions(totalSubmissions)
                .totalStudents(totalStudents)
                .createdAt(assignment.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public AssignmentSubmissionResponse updateLecturerComment(Long submissionId, Long lecturerId, String comment) {
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Bài nộp không tồn tại: " + submissionId));

        Assignment assignment = submission.getAssignment();
        if (!assignment.getCreatedBy().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải người tạo bài tập này");
        }

        submission.setLecturerComment(comment);
        submissionRepository.save(submission);
        log.info("Lecturer comment updated: submissionId={}, lecturer={}", submissionId, lecturerId);

        return toSubmissionResponse(submission);
    }

    private AssignmentSubmissionResponse toSubmissionResponse(AssignmentSubmission submission) {
        Assignment assignment = submission.getAssignment();
        ClassSection cs = assignment.getClassSection();
        User student = submission.getStudent();

        // Split ||| delimited file URLs and names back into lists
        List<String> fileUrls = submission.getFileUrl() != null && !submission.getFileUrl().isEmpty()
                ? Arrays.asList(submission.getFileUrl().split("\\|\\|\\|"))
                : Collections.emptyList();
        List<String> fileNames = submission.getFileName() != null && !submission.getFileName().isEmpty()
                ? Arrays.asList(submission.getFileName().split("\\|\\|\\|"))
                : Collections.emptyList();

        return AssignmentSubmissionResponse.builder()
                .id(submission.getId())
                .assignmentId(assignment.getId())
                .assignmentTitle(assignment.getTitle())
                .className(cs.getClassName())
                .courseCode(cs.getCourse().getCode())
                .courseName(cs.getCourse().getName())
                .studentCode(student.getCode())
                .studentName(student.getFullName())
                .fileUrls(fileUrls)
                .fileNames(fileNames)
                .note(submission.getNote())
                .lecturerComment(submission.getLecturerComment())
                .status(submission.getStatus())
                .submittedAt(submission.getSubmittedAt())
                .assignmentDueDate(assignment.getDueDate())
                .timetableSlotId(assignment.getTimetableSlot() != null ? assignment.getTimetableSlot().getId() : null)
                .referenceUrl(assignment.getReferenceUrl())
                .referenceName(assignment.getReferenceName())
                .referenceUrls(assignment.getReferenceUrl() != null && !assignment.getReferenceUrl().isEmpty()
                        ? Arrays.asList(assignment.getReferenceUrl().split("\\|\\|\\|"))
                        : Collections.emptyList())
                .referenceNames(assignment.getReferenceName() != null && !assignment.getReferenceName().isEmpty()
                        ? Arrays.asList(assignment.getReferenceName().split("\\|\\|\\|"))
                        : Collections.emptyList())
                .plagiarismPercent(submission.getPlagiarismPercent())
                .plagiarismStatus(submission.getPlagiarismStatus())
                .build();
    }

    @Override
    public void deleteAssignment(Long assignmentId, Long lecturerId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        ClassSection cs = assignment.getClassSection();
        if (!cs.getLecturer().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải giảng viên của lớp này");
        }

        if (Assignment.AssignmentStatus.CLOSED.equals(assignment.getStatus())) {
            throw new RuntimeException("Không thể xóa bài tập đã đóng");
        }

        // Only deletes Assignment + its submissions (via CascadeType.ALL)
        // TimetableSlot (Lớp, Ngày, Slot, Phòng) is NOT affected
        assignmentRepository.delete(assignment);
    }

    @Override
    public AssignmentResponse updateAssignment(Long assignmentId, Long lecturerId,
            String title, String description, LocalDateTime dueDate,
            List<String> referenceUrls, List<String> referenceNames) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        ClassSection cs = assignment.getClassSection();
        if (!cs.getLecturer().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải giảng viên của lớp này");
        }

        if (title != null && !title.isBlank()) {
            assignment.setTitle(title);
        }
        if (description != null) {
            assignment.setDescription(description);
        }
        if (dueDate != null) {
            assignment.setDueDate(dueDate);
            // Auto-reopen if new due date is in the future
            if (assignment.getStatus() == Assignment.AssignmentStatus.CLOSED && dueDate.isAfter(LocalDateTime.now())) {
                assignment.setStatus(Assignment.AssignmentStatus.OPEN);
                log.info("Assignment auto-reopened via update: id={}", assignmentId);
            }
        }
        if (referenceUrls != null) {
            assignment.setReferenceUrl(referenceUrls.isEmpty() ? null : String.join("|||", referenceUrls));
        }
        if (referenceNames != null) {
            assignment.setReferenceName(referenceNames.isEmpty() ? null : String.join("|||", referenceNames));
        }

        assignmentRepository.save(assignment);
        log.info("Assignment updated: id={}, lecturer={}", assignmentId, lecturerId);
        return toAssignmentResponse(assignment);
    }

    @Override
    public AssignmentResponse updatePlagiarismThresholds(Long assignmentId, Long lecturerId,
            Double textThreshold, Double imageThreshold) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        ClassSection cs = assignment.getClassSection();
        if (!cs.getLecturer().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải giảng viên của lớp này");
        }

        if (textThreshold == null || imageThreshold == null) {
            throw new RuntimeException("Vui lòng cung cấp đủ ngưỡng văn bản và hình ảnh");
        }
        if (textThreshold < 0.0d || textThreshold > 1.0d) {
            throw new RuntimeException("Ngưỡng văn bản phải nằm trong khoảng 0 đến 1");
        }
        if (imageThreshold < 0.0d || imageThreshold > 1.0d) {
            throw new RuntimeException("Ngưỡng hình ảnh phải nằm trong khoảng 0 đến 1");
        }

        assignment.setPlagiarismTextThreshold(textThreshold);
        assignment.setPlagiarismImageThreshold(imageThreshold);
        assignmentRepository.save(assignment);
        return toAssignmentResponse(assignment);
    }

    @Override
    public byte[] downloadAllSubmissionsAsZip(Long assignmentId, Long lecturerId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Bài tập không tồn tại"));

        ClassSection cs = assignment.getClassSection();
        if (!cs.getLecturer().getId().equals(lecturerId)) {
            throw new RuntimeException("Bạn không phải giảng viên của lớp này");
        }

        List<AssignmentSubmission> submissions = submissionRepository.findByAssignment_Id(assignmentId);
        List<AssignmentSubmission> submittedList = submissions.stream()
                .filter(s -> s.getStatus() == AssignmentSubmission.SubmissionStatus.SUBMITTED)
                .filter(s -> s.getFileUrl() != null && !s.getFileUrl().isEmpty())
                .toList();

        if (submittedList.isEmpty()) {
            throw new RuntimeException("Không có bài nộp nào có file đính kèm để tải");
        }

        log.info("Download ZIP: assignmentId={}, total submissions={}, submitted={}",
                assignmentId, submissions.size(), submittedList.size());

        String assignmentTitle = sanitizeFileName(assignment.getTitle());
        String className = sanitizeFileName(cs.getClassName());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ZipOutputStream zos = new ZipOutputStream(baos)) {

            HttpClient httpClient = HttpClient.newHttpClient();
            int fileCount = 0;

            for (AssignmentSubmission sub : submittedList) {
                User student = sub.getStudent();
                String studentName = sanitizeFileName(student.getFullName());
                String studentCode = student.getCode();
                String folderName = className + "_" + studentName + "_" + studentCode + "_" + assignmentTitle;

                log.info("Processing submission: student={}, fileUrl={}, fileName={}",
                        studentCode, sub.getFileUrl(), sub.getFileName());

                List<String> fileUrls = sub.getFileUrl() != null && !sub.getFileUrl().isEmpty()
                        ? Arrays.asList(sub.getFileUrl().split("\\|\\|\\|"))
                        : Collections.emptyList();
                List<String> fileNames = sub.getFileName() != null && !sub.getFileName().isEmpty()
                        ? Arrays.asList(sub.getFileName().split("\\|\\|\\|"))
                        : Collections.emptyList();

                log.info("Parsed: {} URLs, {} names", fileUrls.size(), fileNames.size());

                for (int i = 0; i < fileUrls.size(); i++) {
                    String url = fileUrls.get(i).trim();
                    String name = i < fileNames.size() ? fileNames.get(i).trim() : "file_" + (i + 1);

                    try {
                        log.info("Downloading file: {}", url);
                        HttpRequest request = HttpRequest.newBuilder()
                                .uri(URI.create(url))
                                .GET()
                                .build();
                        HttpResponse<InputStream> response = httpClient.send(request,
                                HttpResponse.BodyHandlers.ofInputStream());

                        log.info("Download response status: {}", response.statusCode());

                        if (response.statusCode() == 200) {
                            ZipEntry entry = new ZipEntry(folderName + "/" + name);
                            zos.putNextEntry(entry);
                            response.body().transferTo(zos);
                            zos.closeEntry();
                            fileCount++;
                        } else {
                            log.warn("Failed to download file: {} (status={})", url, response.statusCode());
                        }
                    } catch (Exception e) {
                        log.warn("Error downloading file: {} - {}", url, e.getMessage());
                    }
                }
            }

            zos.finish();
            log.info("ZIP created for assignment id={}, {} submissions, {} files", assignmentId, submittedList.size(),
                    fileCount);
            return baos.toByteArray();

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi tạo file ZIP: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public AssignmentPlagiarismResponse checkSubmissionPlagiarism(Long assignmentId, Long submissionId,
            Long lecturerId) {
        return assignmentVectorPlagiarismService.checkPlagiarism(assignmentId, submissionId, lecturerId);
    }

    private String sanitizeFileName(String name) {
        if (name == null)
            return "unknown";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    }

    private AssignmentPlagiarismMatchResponse toPlagiarismMatch(
            AssignmentSubmission target,
            AssignmentSubmission candidate,
            HttpClient httpClient,
            Map<Long, SubmissionArtifactFeatures> artifactCache) {
        SubmissionArtifactFeatures targetArtifacts = getSubmissionArtifacts(target, httpClient, artifactCache);
        SubmissionArtifactFeatures candidateArtifacts = getSubmissionArtifacts(candidate, httpClient, artifactCache);

        double textScore = computeTextScore(targetArtifacts.analysisText(), candidateArtifacts.analysisText());
        double fileNameScore = computeFileNameScore(targetArtifacts.fileNames(), candidateArtifacts.fileNames());
        double imageScore = computeImageScore(targetArtifacts.imageHashes(), candidateArtifacts.imageHashes());
        double metadataScore = computeMetadataScore(target, candidate, targetArtifacts.fileNames(),
                candidateArtifacts.fileNames());

        PlagiarismModelConfig config = getPlagiarismModelConfig();
        double probability = sigmoid(
                config.getBias()
                        + config.weight("textScore", 3.05d) * textScore
                        + config.weight("imageScore", 1.10d) * imageScore);

        return AssignmentPlagiarismMatchResponse.builder()
                .submissionId(candidate.getId())
                .studentCode(candidate.getStudent().getCode())
                .studentName(candidate.getStudent().getFullName())
                .plagiarismPercent(clampPercent(probability * 100d))
                .probability(round4(probability))
                .textScore(round4(textScore))
                .imageScore(round4(imageScore))
                .submittedAt(candidate.getSubmittedAt())
                .notePreview(trimPreview(candidateArtifacts.previewText()))
                .fileNames(candidateArtifacts.fileNames())
                .sharedSignals(
                        buildSharedSignals(target, candidate, textScore, imageScore, metadataScore, fileNameScore))
                .build();
    }

    private double computeTextScore(String left, String right) {
        if (left.isBlank() || right.isBlank()) {
            return 0.0d;
        }

        String normalizedLeft = normalizeText(left);
        String normalizedRight = normalizeText(right);
        if (normalizedLeft.isBlank() || normalizedRight.isBlank()) {
            return 0.0d;
        }
        if (normalizedLeft.equals(normalizedRight)) {
            return 1.0d;
        }

        double chunkScore = computeChunkOverlapScore(normalizedLeft, normalizedRight);
        double tokenScore = jaccardSimilarity(tokenize(normalizedLeft), tokenize(normalizedRight));
        double sequenceScore = sequenceSimilarity(normalizedLeft, normalizedRight);
        double containmentScore = containmentSimilarity(normalizedLeft, normalizedRight);
        return round4(Math.max(chunkScore, Math.max(sequenceScore, Math.max(tokenScore, containmentScore))));
    }

    private double computeFileNameScore(List<String> leftFiles, List<String> rightFiles) {
        if (leftFiles.isEmpty() || rightFiles.isEmpty()) {
            return 0.0d;
        }

        Set<String> left = leftFiles.stream()
                .map(this::normalizeText)
                .filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toSet());
        Set<String> right = rightFiles.stream()
                .map(this::normalizeText)
                .filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toSet());

        return round4(jaccardSimilarity(left, right));
    }

    private double computeImageScore(List<ImageHashSignature> leftHashes, List<ImageHashSignature> rightHashes) {
        if (leftHashes.isEmpty() || rightHashes.isEmpty()) {
            return 0.0d;
        }

        double best = 0.0d;
        for (ImageHashSignature left : leftHashes) {
            for (ImageHashSignature right : rightHashes) {
                int maxDistance = IMAGE_HASH_SIZE * IMAGE_HASH_SIZE;
                int distance = Long.bitCount(left.hash() ^ right.hash());
                double similarity = 1.0d - ((double) distance / (double) maxDistance);
                best = Math.max(best, similarity);
            }
        }

        return round4(Math.max(0.0d, best));
    }

    private double computeMetadataScore(
            AssignmentSubmission target,
            AssignmentSubmission candidate,
            List<String> targetFiles,
            List<String> candidateFiles) {
        double score = 0.0d;

        if (!targetFiles.isEmpty() && !candidateFiles.isEmpty() && targetFiles.size() == candidateFiles.size()) {
            score += 0.35d;
        }

        if (target.getSubmittedAt() != null && candidate.getSubmittedAt() != null) {
            long minuteGap = Math.abs(ChronoUnit.MINUTES.between(target.getSubmittedAt(), candidate.getSubmittedAt()));
            if (minuteGap <= 10) {
                score += 0.40d;
            } else if (minuteGap <= 30) {
                score += 0.22d;
            } else if (minuteGap <= 120) {
                score += 0.10d;
            }
        }

        if (!safeText(target.getNote()).isBlank()
                && safeText(target.getNote()).equalsIgnoreCase(safeText(candidate.getNote()))) {
            score += 0.25d;
        }

        return round4(Math.min(1.0d, score));
    }

    private List<String> buildSharedSignals(
            AssignmentSubmission target,
            AssignmentSubmission candidate,
            double textScore,
            double imageScore,
            double metadataScore,
            double fileNameScore) {
        Set<String> signals = new LinkedHashSet<>();

        if (textScore >= 0.85d) {
            signals.add("Ghi chú bài làm gần như trùng khớp");
        } else if (textScore >= 0.60d) {
            signals.add("Ghi chú bài làm có mức tương đồng cao");
        }
        if (imageScore >= 0.80d) {
            signals.add("File hình ảnh đính kèm có tín hiệu trùng");
        }

        if (target.getSubmittedAt() != null && candidate.getSubmittedAt() != null) {
            long minuteGap = Math.abs(ChronoUnit.MINUTES.between(target.getSubmittedAt(), candidate.getSubmittedAt()));
            if (minuteGap <= 10) {
                signals.add("Thời điểm nộp cách nhau dưới 10 phút");
            }
        }

        if (signals.isEmpty()) {
            signals.add("Phát hiện tín hiệu tương đồng nhẹ trong cùng môn học");
        }

        return new ArrayList<>(signals);
    }

    private List<String> splitTriplePipe(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("\\|\\|\\|"))
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .toList();
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0d : value;
    }

    private String normalizeText(String value) {
        return safeText(value)
                .toLowerCase(Locale.ROOT)
                .replaceAll("https?://\\S+", " ")
                .replaceAll("[^\\p{L}\\p{Nd}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private double computeChunkOverlapScore(String left, String right) {
        List<String> leftChunks = chunkText(left, 80, 20);
        List<String> rightChunks = chunkText(right, 80, 20);
        if (leftChunks.isEmpty() || rightChunks.isEmpty()) {
            return 0.0d;
        }

        double total = 0.0d;
        for (String leftChunk : leftChunks) {
            double best = 0.0d;
            Set<String> leftTokens = tokenize(leftChunk);
            for (String rightChunk : rightChunks) {
                best = Math.max(best, jaccardSimilarity(leftTokens, tokenize(rightChunk)));
            }
            total += best;
        }

        return total / (double) leftChunks.size();
    }

    private List<String> chunkText(String text, int chunkWords, int overlapWords) {
        String[] words = text.split("\\s+");
        if (words.length == 0 || text.isBlank()) {
            return List.of();
        }

        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < words.length) {
            int end = Math.min(words.length, start + chunkWords);
            chunks.add(String.join(" ", Arrays.copyOfRange(words, start, end)));
            if (end == words.length) {
                break;
            }
            start = Math.max(start + 1, end - overlapWords);
        }
        return chunks;
    }

    private Set<String> tokenize(String value) {
        if (value.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(value.split("\\s+"))
                .filter(token -> token.length() > 1)
                .collect(java.util.stream.Collectors.toSet());
    }

    private double jaccardSimilarity(Set<String> left, Set<String> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0.0d;
        }

        Set<String> intersection = new java.util.HashSet<>(left);
        intersection.retainAll(right);
        Set<String> union = new java.util.HashSet<>(left);
        union.addAll(right);

        if (union.isEmpty()) {
            return 0.0d;
        }

        return (double) intersection.size() / (double) union.size();
    }

    private double containmentSimilarity(String left, String right) {
        if (left.isBlank() || right.isBlank()) {
            return 0.0d;
        }

        if (left.contains(right) || right.contains(left)) {
            int shorter = Math.min(left.length(), right.length());
            int longer = Math.max(left.length(), right.length());
            return longer == 0 ? 0.0d : (double) shorter / (double) longer;
        }

        return 0.0d;
    }

    private double sequenceSimilarity(String left, String right) {
        if (left.isBlank() || right.isBlank()) {
            return 0.0d;
        }

        int longest = longestCommonSubstring(left, right);
        int denominator = Math.max(left.length(), right.length());
        return denominator == 0 ? 0.0d : (double) longest / (double) denominator;
    }

    private int longestCommonSubstring(String left, String right) {
        int[][] table = new int[left.length() + 1][right.length() + 1];
        int best = 0;

        for (int i = 1; i <= left.length(); i++) {
            for (int j = 1; j <= right.length(); j++) {
                if (left.charAt(i - 1) == right.charAt(j - 1)) {
                    table[i][j] = table[i - 1][j - 1] + 1;
                    best = Math.max(best, table[i][j]);
                }
            }
        }

        return best;
    }

    private double sigmoid(double value) {
        return 1.0d / (1.0d + Math.exp(-value));
    }

    private int clampPercent(double value) {
        return Math.max(0, Math.min(100, (int) Math.round(value)));
    }

    private double round4(double value) {
        return Math.round(value * 10000.0d) / 10000.0d;
    }

    private String trimPreview(String value) {
        String compact = safeText(value).replaceAll("\\s+", " ");
        if (compact.length() <= 180) {
            return compact;
        }
        return compact.substring(0, 180) + "...";
    }

    private void persistPlagiarismCheckLogs(
            Long assignmentId,
            Long lecturerId,
            AssignmentPlagiarismResponse response,
            SubmissionArtifactFeatures targetArtifacts,
            List<AssignmentPlagiarismMatchResponse> topMatches,
            Map<Long, SubmissionArtifactFeatures> artifactCache) {
        try {
            List<AssignmentPlagiarismCheck> logs = new ArrayList<>();

            if (topMatches.isEmpty()) {
                logs.add(AssignmentPlagiarismCheck.builder()
                        .assignmentId(assignmentId)
                        .targetSubmissionId(response.getSubmissionId())
                        .checkerLecturerId(lecturerId)
                        .scope(response.getScope())
                        .modelName(response.getModel())
                        .strategy(response.getStrategy())
                        .textScore(response.getTextScore())
                        .imageScore(response.getImageScore())
                        .metadataScore(response.getMetadataScore())
                        .fileNameScore(response.getFileNameScore())
                        .probability(response.getProbability())
                        .plagiarismPercent(response.getPlagiarismPercent())
                        .plagiarized(response.getPlagiarized())
                        .plagiarizedText(response.getPlagiarizedText())
                        .plagiarizedImage(response.getPlagiarizedImage())
                        .textThreshold(response.getTextThreshold())
                        .imageThreshold(response.getImageThreshold())
                        .overallComment(response.getOverallComment())
                        .indexCoverage(response.getIndexCoverage())
                        .targetTextLength(targetArtifacts.analysisText().length())
                        .comparedTextLength(0)
                        .contentBased(true)
                        .build());
            } else {
                for (AssignmentPlagiarismMatchResponse match : topMatches) {
                    SubmissionArtifactFeatures comparedArtifacts = artifactCache.get(match.getSubmissionId());
                    logs.add(AssignmentPlagiarismCheck.builder()
                            .assignmentId(assignmentId)
                            .targetSubmissionId(response.getSubmissionId())
                            .comparedSubmissionId(match.getSubmissionId())
                            .checkerLecturerId(lecturerId)
                            .scope(response.getScope())
                            .modelName(response.getModel())
                            .strategy(response.getStrategy())
                            .textScore(match.getTextScore())
                            .imageScore(match.getImageScore())
                            .metadataScore(match.getMetadataScore())
                            .fileNameScore(match.getFileNameScore())
                            .probability(match.getProbability())
                            .plagiarismPercent(match.getPlagiarismPercent())
                            .plagiarized(match.getProbability() != null
                                    && match.getProbability() >= getPlagiarismModelConfig().getThreshold())
                            .plagiarizedText(match.getTextSuspect())
                            .plagiarizedImage(match.getImageSuspect())
                            .textThreshold(response.getTextThreshold())
                            .imageThreshold(response.getImageThreshold())
                            .overallComment(response.getOverallComment())
                            .matchComment(match.getMatchComment())
                            .reasonTags(match.getReasonTags() != null ? String.join(",", match.getReasonTags()) : null)
                            .indexCoverage(response.getIndexCoverage())
                            .targetTextLength(targetArtifacts.analysisText().length())
                            .comparedTextLength(
                                    comparedArtifacts != null ? comparedArtifacts.analysisText().length() : 0)
                            .contentBased(true)
                            .build());
                }
            }

            plagiarismCheckRepository.saveAll(logs);

            // Update submission summary
            submissionRepository.findById(response.getSubmissionId()).ifPresent(sub -> {
                sub.setPlagiarismPercent(response.getPlagiarismPercent());
                sub.setPlagiarismStatus((response.getPlagiarized() != null && response.getPlagiarized()) ? "SUSPECT" : "SAFE");
                submissionRepository.save(sub);
            });
        } catch (Exception e) {
            log.warn("Failed to persist plagiarism audit logs for submission {}: {}", response.getSubmissionId(),
                    e.getMessage());
        }
    }

    private SubmissionArtifactFeatures getSubmissionArtifacts(
            AssignmentSubmission submission,
            HttpClient httpClient,
            Map<Long, SubmissionArtifactFeatures> cache) {
        return cache.computeIfAbsent(submission.getId(), ignored -> extractSubmissionArtifacts(submission, httpClient));
    }

    private SubmissionArtifactFeatures extractSubmissionArtifacts(AssignmentSubmission submission,
            HttpClient httpClient) {
        List<String> fileUrls = splitTriplePipe(submission.getFileUrl());
        List<String> fileNames = splitTriplePipe(submission.getFileName());
        List<String> textParts = new ArrayList<>();
        List<ImageHashSignature> imageHashes = new ArrayList<>();

        if (!safeText(submission.getNote()).isBlank()) {
            textParts.add(safeText(submission.getNote()));
        }

        for (int index = 0; index < fileUrls.size(); index++) {
            String url = fileUrls.get(index);
            String fileName = index < fileNames.size() ? fileNames.get(index) : "file_" + (index + 1);

            try {
                byte[] bytes = downloadFileBytes(httpClient, url);
                String extractedText = extractTextFromFile(fileName, bytes);
                if (!extractedText.isBlank()) {
                    textParts.add(extractedText);
                }

                ImageHashSignature imageHash = extractImageHash(fileName, bytes);
                if (imageHash != null) {
                    imageHashes.add(imageHash);
                }
            } catch (Exception e) {
                log.warn("Failed to extract plagiarism artifacts from file {} of submission {}: {}",
                        fileName, submission.getId(), e.getMessage());
            }
        }

        String analysisText = textParts.stream()
                .map(this::safeText)
                .filter(part -> !part.isBlank())
                .collect(java.util.stream.Collectors.joining("\n"));

        return new SubmissionArtifactFeatures(
                analysisText,
                trimPreview(analysisText.isBlank() ? safeText(submission.getNote()) : analysisText),
                fileNames,
                imageHashes);
    }

    private byte[] downloadFileBytes(HttpClient httpClient, String url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Download failed with status " + response.statusCode());
        }
        return response.body();
    }

    private String extractTextFromFile(String fileName, byte[] bytes) {
        String lower = fileName.toLowerCase(Locale.ROOT);

        if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || lower.endsWith(".json")) {
            return new String(bytes, StandardCharsets.UTF_8);
        }

        if (lower.endsWith(".pdf")) {
            return extractPdfText(bytes);
        }

        if (lower.endsWith(".docx")) {
            return extractDocxText(bytes);
        }

        return "";
    }

    private String extractPdfText(byte[] bytes) {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        } catch (IOException e) {
            log.warn("Failed to extract PDF text: {}", e.getMessage());
            return "";
        }
    }

    private String extractDocxText(byte[] bytes) {
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            StringBuilder builder = new StringBuilder();
            document.getParagraphs().forEach(paragraph -> {
                if (paragraph != null && paragraph.getText() != null) {
                    builder.append(paragraph.getText()).append('\n');
                }
            });
            return builder.toString();
        } catch (IOException e) {
            log.warn("Failed to extract DOCX text: {}", e.getMessage());
            return "";
        }
    }

    private ImageHashSignature extractImageHash(String fileName, byte[] bytes) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        if (!(lower.endsWith(".png")
                || lower.endsWith(".jpg")
                || lower.endsWith(".jpeg")
                || lower.endsWith(".webp")
                || lower.endsWith(".gif"))) {
            return null;
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                return null;
            }

            BufferedImage resized = new BufferedImage(IMAGE_HASH_SIZE, IMAGE_HASH_SIZE, BufferedImage.TYPE_BYTE_GRAY);
            resized.getGraphics().drawImage(image, 0, 0, IMAGE_HASH_SIZE, IMAGE_HASH_SIZE, null);

            int[] pixels = new int[IMAGE_HASH_SIZE * IMAGE_HASH_SIZE];
            long total = 0L;
            int index = 0;
            for (int y = 0; y < IMAGE_HASH_SIZE; y++) {
                for (int x = 0; x < IMAGE_HASH_SIZE; x++) {
                    int pixel = resized.getRGB(x, y) & 0xFF;
                    pixels[index++] = pixel;
                    total += pixel;
                }
            }

            double average = total / (double) pixels.length;
            long hash = 0L;
            for (int i = 0; i < pixels.length; i++) {
                if (pixels[i] >= average) {
                    hash |= (1L << i);
                }
            }

            return new ImageHashSignature(fileName, hash);
        } catch (IOException e) {
            log.warn("Failed to compute image hash for {}: {}", fileName, e.getMessage());
            return null;
        }
    }

    private PlagiarismModelConfig getPlagiarismModelConfig() {
        if (plagiarismModelConfig == null) {
            plagiarismModelConfig = loadPlagiarismModelConfig();
        }
        return plagiarismModelConfig;
    }

    private record SubmissionArtifactFeatures(
            String analysisText,
            String previewText,
            List<String> fileNames,
            List<ImageHashSignature> imageHashes) {
    }

    private record ImageHashSignature(String fileName, long hash) {
    }

    private PlagiarismModelConfig loadPlagiarismModelConfig() {
        ClassPathResource resource = new ClassPathResource(PLAGIARISM_MODEL_RESOURCE);
        if (!resource.exists()) {
            log.warn("Plagiarism model resource not found at {}, using fallback weights", PLAGIARISM_MODEL_RESOURCE);
            return PlagiarismModelConfig.fallback();
        }

        try (InputStream inputStream = resource.getInputStream()) {
            PlagiarismModelConfig loaded = objectMapper.readValue(inputStream, PlagiarismModelConfig.class);
            loaded.applyDefaults();
            log.info("Loaded plagiarism model config: {}", loaded.getModelName());
            return loaded;
        } catch (IOException e) {
            log.error("Failed to load plagiarism model config, falling back to defaults", e);
            return PlagiarismModelConfig.fallback();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class PlagiarismModelConfig {
        private String modelName;
        private Double threshold;
        private Double bias;
        private java.util.Map<String, Double> weights;

        public static PlagiarismModelConfig fallback() {
            PlagiarismModelConfig config = new PlagiarismModelConfig();
            config.modelName = INTERNAL_PLAGIARISM_MODEL;
            config.threshold = 0.5d;
            config.bias = -2.85d;
            config.weights = new java.util.HashMap<>();
            config.weights.put("textScore", 3.05d);
            config.weights.put("fileNameScore", 1.35d);
            config.weights.put("imageScore", 1.10d);
            config.weights.put("metadataScore", 1.40d);
            return config;
        }

        public void applyDefaults() {
            PlagiarismModelConfig fallback = fallback();
            if (modelName == null || modelName.isBlank()) {
                modelName = fallback.modelName;
            }
            if (threshold == null) {
                threshold = fallback.threshold;
            }
            if (bias == null) {
                bias = fallback.bias;
            }
            if (weights == null) {
                weights = fallback.weights;
            } else {
                fallback.weights.forEach(weights::putIfAbsent);
            }
        }

        public String getModelName() {
            return modelName;
        }

        public double getThreshold() {
            return threshold == null ? 0.5d : threshold;
        }

        public double getBias() {
            return bias == null ? -2.85d : bias;
        }

        public double weight(String key, double fallback) {
            if (weights == null) {
                return fallback;
            }
            return weights.getOrDefault(key, fallback);
        }

        public void setModelName(String modelName) {
            this.modelName = modelName;
        }

        public void setThreshold(Double threshold) {
            this.threshold = threshold;
        }

        public void setBias(Double bias) {
            this.bias = bias;
        }

        public void setWeights(java.util.Map<String, Double> weights) {
            this.weights = weights;
        }
    }
}
