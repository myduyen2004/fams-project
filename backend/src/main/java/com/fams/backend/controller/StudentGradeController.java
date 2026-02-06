package com.fams.backend.controller;

import com.fams.backend.dto.request.UpdateGradeRequest;
import com.fams.backend.dto.response.GradeOverviewResponse;
import com.fams.backend.service.StudentGradeService;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
     * Get grade overview for a class section
     */
    @GetMapping("/class-sections/{className}/grades")
    public ResponseEntity<GradeOverviewResponse> getGradeOverview(
            @PathVariable String className) {
        GradeOverviewResponse response = studentGradeService.getGradeOverview(className);
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

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
