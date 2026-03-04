package com.fams.backend.controller;

import com.fams.backend.dto.response.ExamGradeOverviewResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.ExamGradeService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Controller for managing exam grades (ME, FE, PE) and resit grades by course
 * For Academic Staff to manage grades across all class sections of a course
 */
@RestController
@RequestMapping("/api/v1/exam-grades")
@RequiredArgsConstructor
public class ExamGradeController {

    private final ExamGradeService examGradeService;
    private final UserRepository userRepository;

    /**
     * Get exam grade overview for a course in a semester.
     * - ACADEMIC_STAFF: sees all grades (full access for management)
     * - LECTURER / STUDENT: sees grades only after Academic Staff has published
     * them (gradesPublished=true)
     *
     * @param courseCode   Course code
     * @param semesterCode Semester code
     * @param type         "EXAM" for ME/FE/PE, "RESIT" for resit grades
     */
    @GetMapping
    public ResponseEntity<ExamGradeOverviewResponse> getExamGradeOverview(
            @RequestParam String courseCode,
            @RequestParam String semesterCode,
            @RequestParam(defaultValue = "EXAM") String type,
            @AuthenticationPrincipal UserDetails userDetails) {
        String role = userDetails != null
                ? userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .orElse("UNKNOWN")
                : "UNKNOWN";
        ExamGradeOverviewResponse response = examGradeService.getExamGradeOverview(courseCode, semesterCode, type,
                role);
        return ResponseEntity.ok(response);
    }

    /**
     * Export exam grades to Excel
     */
    @GetMapping("/export")
    public void exportExamGrades(
            @RequestParam String courseCode,
            @RequestParam String semesterCode,
            @RequestParam(defaultValue = "EXAM") String type,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletResponse response) throws IOException {
        String role = userDetails != null
                ? userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .orElse("UNKNOWN")
                : "UNKNOWN";
        examGradeService.exportExamGradesToExcel(courseCode, semesterCode, type, role, response);
    }

    /**
     * Preview exam grade import (validation only, no DB changes)
     */
    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> previewExamGradeImport(
            @RequestParam String courseCode,
            @RequestParam String semesterCode,
            @RequestParam(defaultValue = "EXAM") String type,
            @RequestParam("file") MultipartFile file) throws IOException {
        Map<String, Object> result = examGradeService.previewExamGradeImport(courseCode, semesterCode, type, file);
        return ResponseEntity.ok(result);
    }

    /**
     * Import exam grades from Excel
     */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importExamGrades(
            @RequestParam String courseCode,
            @RequestParam String semesterCode,
            @RequestParam(defaultValue = "EXAM") String type,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        Long userId = getUserId(userDetails);
        Map<String, Object> result = examGradeService.importExamGradesFromExcel(courseCode, semesterCode, type, file,
                userId);
        return ResponseEntity.ok(result);
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    /**
     * Publish grades to students
     * Makes grades visible to students for this course in this semester
     */
    @PostMapping("/publish")
    public ResponseEntity<Map<String, Object>> publishGrades(
            @RequestParam String courseCode,
            @RequestParam String semesterCode,
            @RequestParam(defaultValue = "EXAM") String type,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        Map<String, Object> result = examGradeService.publishGrades(courseCode, semesterCode, type, userId);
        return ResponseEntity.ok(result);
    }
}
