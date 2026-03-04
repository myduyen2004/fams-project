package com.fams.backend.controller;

import com.fams.backend.dto.request.CreateAssignmentRequest;
import com.fams.backend.dto.request.UpdateAssignmentRequest;
import com.fams.backend.dto.response.AssignmentResponse;
import com.fams.backend.dto.response.AssignmentSubmissionResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.scheduler.AssignmentReminderScheduler;
import com.fams.backend.service.AssignmentSubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lecturer/assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerAssignmentController {

    private final AssignmentSubmissionService assignmentSubmissionService;
    private final UserRepository userRepository;
    private final AssignmentReminderScheduler assignmentReminderScheduler;

    /**
     * Tạo bài tập mới cho lớp
     */
    @PostMapping
    public ResponseEntity<AssignmentResponse> createAssignment(
            @Valid @RequestBody CreateAssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long lecturerId = getUserId(userDetails);
        AssignmentResponse response = assignmentSubmissionService.createAssignment(request, lecturerId);
        return ResponseEntity.ok(response);
    }

    /**
     * Đóng bài tập
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<Map<String, String>> closeAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long lecturerId = getUserId(userDetails);
        assignmentSubmissionService.closeAssignment(id, lecturerId);
        return ResponseEntity.ok(Map.of("message", "Đã đóng bài tập"));
    }

    /**
     * Cập nhật hạn nộp bài tập
     */
    @PutMapping("/{id}/due-date")
    public ResponseEntity<AssignmentResponse> updateDueDate(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long lecturerId = getUserId(userDetails);
        String dueDateStr = body.get("dueDate");
        if (dueDateStr == null || dueDateStr.isBlank()) {
            throw new RuntimeException("Vui lòng cung cấp hạn nộp mới");
        }
        java.time.LocalDateTime newDueDate = java.time.LocalDateTime.parse(dueDateStr);
        AssignmentResponse response = assignmentSubmissionService.updateDueDate(id, lecturerId, newDueDate);
        return ResponseEntity.ok(response);
    }

    /**
     * Cập nhật bài tập
     */
    @PutMapping("/{id}")
    public ResponseEntity<AssignmentResponse> updateAssignment(
            @PathVariable Long id,
            @RequestBody UpdateAssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long lecturerId = getUserId(userDetails);
        java.time.LocalDateTime dueDate = request.getDueDate();
        AssignmentResponse response = assignmentSubmissionService.updateAssignment(
                id, lecturerId,
                request.getTitle(), request.getDescription(), dueDate,
                request.getReferenceUrl(), request.getReferenceName());
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy danh sách bài tập theo lớp
     */
    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> getAssignments(
            @RequestParam String className) {
        List<AssignmentResponse> assignments = assignmentSubmissionService.getAssignmentsByClass(className);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Xem danh sách bài nộp của bài tập
     */
    @GetMapping("/{id}/submissions")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getSubmissions(
            @PathVariable Long id) {
        List<AssignmentSubmissionResponse> submissions = assignmentSubmissionService.getAssignmentSubmissions(id);
        return ResponseEntity.ok(submissions);
    }

    /**
     * Xem trạng thái nộp bài của tất cả sinh viên trong lớp
     */
    @GetMapping("/{id}/all-submissions")
    public ResponseEntity<List<AssignmentSubmissionResponse>> getAllSubmissions(
            @PathVariable Long id) {
        List<AssignmentSubmissionResponse> submissions = assignmentSubmissionService.getAllStudentSubmissionStatus(id);
        return ResponseEntity.ok(submissions);
    }

    /**
     * Giảng viên nhận xét bài nộp của sinh viên
     */
    @PutMapping("/submissions/{submissionId}/comment")
    public ResponseEntity<AssignmentSubmissionResponse> updateLecturerComment(
            @PathVariable Long submissionId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long lecturerId = getUserId(userDetails);
        String comment = body.get("comment");
        AssignmentSubmissionResponse response = assignmentSubmissionService.updateLecturerComment(submissionId,
                lecturerId, comment);
        return ResponseEntity.ok(response);
    }

    /**
     * Giảng viên xóa bài tập
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAssignment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long lecturerId = getUserId(userDetails);
        assignmentSubmissionService.deleteAssignment(id, lecturerId);
        return ResponseEntity.ok(Map.of("message", "Đã xóa bài tập"));
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    /**
     * [TEST ONLY] Trigger thủ công AssignmentReminderScheduler để test Phase 2.
     * Xóa endpoint này sau khi test xong.
     */
    @PostMapping("/test/trigger-reminders")
    public ResponseEntity<Map<String, String>> testTriggerReminders() {
        assignmentReminderScheduler.sendDueDateReminders();
        return ResponseEntity.ok(Map.of("message", "Reminder scheduler triggered manually"));
    }
}
