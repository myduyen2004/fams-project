package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CreateAssignmentRequest;
import com.fams.backend.dto.request.SubmitAssignmentRequest;
import com.fams.backend.dto.response.AssignmentResponse;
import com.fams.backend.dto.response.AssignmentSubmissionResponse;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.AssignmentSubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AssignmentSubmissionServiceImpl implements AssignmentSubmissionService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final ClassSectionRepository classSectionRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final NotificationServiceImpl notificationService;

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

        Assignment assignment = Assignment.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .classSection(classSection)
                .createdBy(lecturer)
                .dueDate(request.getDueDate())
                .referenceUrl(request.getReferenceUrl())
                .referenceName(request.getReferenceName())
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

            for (Enrollment e : enrollments) {
                notificationService.createNotification(
                        e.getStudent(),
                        title,
                        content,
                        Notification.NotificationType.ACADEMIC,
                        "/student/assignments",
                        lecturer);
            }
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
            User lecturer = a.getCreatedBy();
            String courseCode = cs.getCourse().getCode();
            String due = a.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

            String title = "Nhắc nhở: Bài tập môn " + courseCode + " sắp đến hạn";
            String content = "Bài tập môn " + courseCode
                    + " của em sẽ đến hạn nộp vào " + due
                    + ". Em vui lòng hoàn thành và nộp bài trước thời hạn nhé.</br>\n\nChúc em học tốt!";

            List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(cs.getClassName());

            for (Enrollment e : enrollments) {
                notificationService.createNotification(
                        e.getStudent(),
                        title,
                        content,
                        Notification.NotificationType.ACADEMIC,
                        "/student/assignments",
                        lecturer);
            }
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

        if (assignment.getStatus() != Assignment.AssignmentStatus.CLOSED) {
            throw new RuntimeException("Chỉ được nhận xét khi bài tập đã đóng");
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
            String referenceUrl, String referenceName) {
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
        if (referenceUrl != null) {
            assignment.setReferenceUrl(referenceUrl);
        }
        if (referenceName != null) {
            assignment.setReferenceName(referenceName);
        }

        assignmentRepository.save(assignment);
        log.info("Assignment updated: id={}, lecturer={}", assignmentId, lecturerId);
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

    private String sanitizeFileName(String name) {
        if (name == null)
            return "unknown";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    }
}
