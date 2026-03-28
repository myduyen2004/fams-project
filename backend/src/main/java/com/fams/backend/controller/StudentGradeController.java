package com.fams.backend.controller;

import com.fams.backend.dto.request.UpdateGradeRequest;
import com.fams.backend.dto.response.GradeOverviewResponse;
import com.fams.backend.dto.response.StudentAllGradesSummaryResponse;
import com.fams.backend.dto.response.StudentCourseOptionResponse;
import com.fams.backend.dto.response.StudentMyGradeResponse;
import com.fams.backend.dto.response.StudentResponse;
import com.fams.backend.service.StudentGradeService;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class StudentGradeController {

    private final StudentGradeService studentGradeService;
    private final UserRepository userRepository;

    /**
     * Get grade overview for a class section.
     * - LECTURER: sees all grades (full access for management)
     * - ACADEMIC_STAFF: sees grades only after Lecturer has submitted
     * (gradesSubmitted=true)
     */
    @GetMapping("/class-sections/{className}/grades")
    public ResponseEntity<GradeOverviewResponse> getGradeOverview(
            @PathVariable String className,
            @AuthenticationPrincipal UserDetails userDetails) {
        String role = userDetails != null
                ? userDetails.getAuthorities().stream()
                        .findFirst()
                        .map(a -> a.getAuthority().replace("ROLE_", ""))
                        .orElse("UNKNOWN")
                : "UNKNOWN";
        GradeOverviewResponse response = studentGradeService.getGradeOverview(className, role);
        return ResponseEntity.ok(response);
    }

    /**
     * Export grades to Excel
     */
    @GetMapping("/class-sections/{className}/grades/export")
    public void exportGrades(
            @PathVariable String className,
            HttpServletResponse response) throws IOException {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"grades_" + className + ".xlsx\"");
        studentGradeService.exportGradesToExcel(className, response);
    }

    /**
     * Preview grades import (validation only, no DB changes)
     */
    @PostMapping("/class-sections/{className}/grades/preview")
    public ResponseEntity<Map<String, Object>> previewGrades(
            @PathVariable String className,
            @RequestParam("file") MultipartFile file) throws IOException {
        Map<String, Object> result = studentGradeService.previewGradeImport(className, file);
        return ResponseEntity.ok(result);
    }

    /**
     * Import grades from Excel
     */
    @PostMapping("/class-sections/{className}/grades/import")
    public ResponseEntity<Map<String, Object>> importGrades(
            @PathVariable String className,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        Long userId = getUserId(userDetails);
        Map<String, Object> result = studentGradeService.importGradesFromExcel(className, file, userId);
        return ResponseEntity.ok(result);
    }

    /**
     * Update a single student grade
     */
    @PutMapping("/student-grades")
    public ResponseEntity<Void> updateGrade(
            @Valid @RequestBody UpdateGradeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        studentGradeService.updateGrade(request, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Batch update student grades
     */
    @PostMapping("/student-grades/batch")
    public ResponseEntity<Void> updateGradesBatch(
            @Valid @RequestBody List<UpdateGradeRequest> requests,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        studentGradeService.updateGradesBatch(requests, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Submit grades to academic office
     * This will lock the grades from further editing
     */
    @PostMapping("/class-sections/{className}/grades/submit")
    public ResponseEntity<Void> submitGrades(
            @PathVariable String className,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        studentGradeService.submitGrades(className, userId);
        return ResponseEntity.ok().build();
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    // ==================== STUDENT SELF-VIEW GRADE ENDPOINTS ====================

    /**
     * Get all courses a student is enrolled in (for dropdown)
     */
    @GetMapping("/students/{studentId}/courses")
    public ResponseEntity<List<StudentCourseOptionResponse>> getStudentCourses(
            @PathVariable Long studentId,
            @RequestParam(required = false) Long semesterId) {
        List<StudentCourseOptionResponse> courses = studentGradeService.getStudentCourses(studentId, semesterId);
        return ResponseEntity.ok(courses);
    }

    /**
     * Get detailed grades for a student in a specific class
     */
    @GetMapping("/students/{studentId}/grades")
    public ResponseEntity<StudentMyGradeResponse> getStudentGrades(
            @PathVariable Long studentId,
            @RequestParam String className) {
        StudentMyGradeResponse response = studentGradeService.getStudentGrades(studentId, className);
        return ResponseEntity.ok(response);
    }

    /**
     * Get basic student information for profile popup
     * Accessible by LECTURER, ACADEMIC_STAFF, and ADMIN
     */
    @GetMapping("/students/{studentCode}/info")
    @PreAuthorize("hasAnyRole('LECTURER', 'ACADEMIC_STAFF', 'ADMIN', 'STUDENT')")
    public ResponseEntity<StudentResponse> getStudentInfo(
            @PathVariable String studentCode) {
        StudentResponse response = studentGradeService.getStudentInfo(studentCode);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a comprehensive summary of all grades for a student across all semesters
     */
    @GetMapping("/students/{studentId}/all-grades")
    public ResponseEntity<StudentAllGradesSummaryResponse> getAllGradesSummary(
            @PathVariable Long studentId) {
        StudentAllGradesSummaryResponse response = studentGradeService.getAllGradesSummary(studentId);
        return ResponseEntity.ok(response);
    }
}
