package com.fams.backend.service;

import com.fams.backend.dto.request.CreateAssignmentRequest;
import com.fams.backend.dto.request.SubmitAssignmentRequest;
import com.fams.backend.dto.response.AssignmentPlagiarismResponse;
import com.fams.backend.dto.response.AssignmentResponse;
import com.fams.backend.dto.response.AssignmentSubmissionResponse;
import com.fams.backend.entity.Assignment;

import java.time.LocalDateTime;
import java.util.List;

public interface AssignmentSubmissionService {

    AssignmentResponse createAssignment(CreateAssignmentRequest request, Long lecturerId);

    void closeAssignment(Long assignmentId, Long lecturerId);

    List<AssignmentResponse> getAssignmentsByClass(String className);

    List<AssignmentSubmissionResponse> getAssignmentSubmissions(Long assignmentId);

    AssignmentSubmissionResponse submitAssignment(SubmitAssignmentRequest request, Long studentId);

    List<AssignmentSubmissionResponse> getStudentAssignments(Long studentId);

    AssignmentSubmissionResponse getMySubmission(Long assignmentId, Long studentId);

    AssignmentResponse updateDueDate(Long assignmentId, Long lecturerId, LocalDateTime newDueDate);

    List<AssignmentSubmissionResponse> getAllStudentSubmissionStatus(Long assignmentId);

    AssignmentSubmissionResponse updateLecturerComment(Long submissionId, Long lecturerId, String comment);

    void deleteAssignment(Long assignmentId, Long lecturerId);

    AssignmentResponse updateAssignment(Long assignmentId, Long lecturerId,
            String title, String description, LocalDateTime dueDate,
            List<String> referenceUrls, List<String> referenceNames);

    /**
     * Gửi thông báo nhắc nhở sinh viên trước hạn nộp 1 ngày.
     * Được gọi bởi AssignmentReminderScheduler.
     */
    void sendDueDateReminderNotifications(Assignment assignment);

    byte[] downloadAllSubmissionsAsZip(Long assignmentId, Long lecturerId);

    AssignmentPlagiarismResponse checkSubmissionPlagiarism(Long assignmentId, Long submissionId, Long lecturerId);
}
