package com.fams.backend.service;

import com.fams.backend.dto.request.CreateAssignmentRequest;
import com.fams.backend.dto.request.SubmitAssignmentRequest;
import com.fams.backend.dto.response.AssignmentResponse;
import com.fams.backend.dto.response.AssignmentSubmissionResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface AssignmentSubmissionService {

    /**
     * Giảng viên tạo bài tập cho lớp
     */
    AssignmentResponse createAssignment(CreateAssignmentRequest request, Long lecturerId);

    /**
     * Giảng viên đóng bài tập
     */
    void closeAssignment(Long assignmentId, Long lecturerId);

    /**
     * Lấy danh sách bài tập theo lớp
     */
    List<AssignmentResponse> getAssignmentsByClass(String className);

    /**
     * Giảng viên xem danh sách bài nộp của bài tập
     */
    List<AssignmentSubmissionResponse> getAssignmentSubmissions(Long assignmentId);

    /**
     * Sinh viên nộp bài tập
     */
    AssignmentSubmissionResponse submitAssignment(SubmitAssignmentRequest request, Long studentId);

    /**
     * Sinh viên xem danh sách bài tập cần nộp
     */
    List<AssignmentSubmissionResponse> getStudentAssignments(Long studentId);

    /**
     * Sinh viên xem bài đã nộp cho bài tập
     */
    AssignmentSubmissionResponse getMySubmission(Long assignmentId, Long studentId);

    /**
     * Giảng viên cập nhật hạn nộp bài tập
     */
    AssignmentResponse updateDueDate(Long assignmentId, Long lecturerId, LocalDateTime newDueDate);

    /**
     * Lấy trạng thái nộp bài của tất cả sinh viên trong lớp cho bài tập
     */
    List<AssignmentSubmissionResponse> getAllStudentSubmissionStatus(Long assignmentId);

    /**
     * Giảng viên nhận xét bài nộp của sinh viên
     */
    AssignmentSubmissionResponse updateLecturerComment(Long submissionId, Long lecturerId, String comment);

    /**
     * Giảng viên xóa bài tập
     */
    void deleteAssignment(Long assignmentId, Long lecturerId);

    /**
     * Giảng viên cập nhật bài tập
     */
    AssignmentResponse updateAssignment(Long assignmentId, Long lecturerId,
            String title, String description, java.time.LocalDateTime dueDate,
            String referenceUrl, String referenceName);
}
