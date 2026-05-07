package com.fams.backend.controller;

import com.fams.backend.dto.request.SubmitAssignmentRequest;
import com.fams.backend.dto.response.AssignmentSubmissionResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.EnrollmentRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.AssignmentSubmissionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/student/assignments")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Student Assignment", description = "API for student assignments")
public class StudentAssignmentController {

    private final AssignmentSubmissionService assignmentSubmissionService;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    /**
     * Danh sách bài tập cần nộp (OPEN assignments cho các lớp SV đăng ký)
     */
    @GetMapping
    public ResponseEntity<List<AssignmentSubmissionResponse>> getMyAssignments(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long studentId = getUserId(userDetails);
        List<AssignmentSubmissionResponse> assignments = assignmentSubmissionService.getStudentAssignments(studentId);
        return ResponseEntity.ok(assignments);
    }

    /**
     * Lấy danh sách tất cả lớp mà sinh viên đang đăng ký (từ bảng enrollment)
     */
    @GetMapping("/enrolled-classes")
    public ResponseEntity<List<String>> getEnrolledClasses(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long studentId = getUserId(userDetails);
        List<String> classNames = enrollmentRepository.findEnrolledClassNamesByStudentId(studentId);
        return ResponseEntity.ok(classNames);
    }

    /**
     * Nộp bài tập
     */
    @PostMapping("/submit")
    public ResponseEntity<AssignmentSubmissionResponse> submitAssignment(
            @Valid @RequestBody SubmitAssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long studentId = getUserId(userDetails);
        AssignmentSubmissionResponse response = assignmentSubmissionService.submitAssignment(request, studentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Xem bài đã nộp cho bài tập
     */
    @GetMapping("/{assignmentId}/submission")
    public ResponseEntity<AssignmentSubmissionResponse> getMySubmission(
            @PathVariable Long assignmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long studentId = getUserId(userDetails);
        AssignmentSubmissionResponse response = assignmentSubmissionService.getMySubmission(assignmentId, studentId);
        return ResponseEntity.ok(response);
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
