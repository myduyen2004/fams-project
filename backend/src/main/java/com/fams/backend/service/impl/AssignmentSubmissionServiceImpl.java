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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

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

        if (assignment.getStatus() == Assignment.AssignmentStatus.CLOSED) {
            throw new RuntimeException("Không thể chỉnh sửa bài tập đã đóng");
        }

        if (newDueDate.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Hạn nộp bài phải sau thời điểm hiện tại");
        }

        assignment.setDueDate(newDueDate);
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
                .build();
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

        if (Assignment.AssignmentStatus.CLOSED.equals(assignment.getStatus())) {
            throw new RuntimeException("Không thể chỉnh sửa bài tập đã đóng");
        }

        if (title != null && !title.isBlank()) {
            assignment.setTitle(title);
        }
        if (description != null) {
            assignment.setDescription(description);
        }
        if (dueDate != null) {
            assignment.setDueDate(dueDate);
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
}
