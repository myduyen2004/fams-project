package com.fams.backend.controller;

import com.fams.backend.dto.request.GradeComponentRequest;
import com.fams.backend.dto.response.GradeComponentResponse;
import com.fams.backend.service.GradeComponentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class GradeComponentController {

    private final GradeComponentService gradeComponentService;

    // ==================== COURSE-SCOPED ENDPOINTS ====================

    /**
     * Get all grade components for a course
     */
    @GetMapping("/courses/{courseId}/grade-components")
    public ResponseEntity<List<GradeComponentResponse>> getGradeComponents(@PathVariable Long courseId) {
        log.info("GET /courses/{}/grade-components", courseId);
        return ResponseEntity.ok(gradeComponentService.getGradeComponentsByCourse(courseId));
    }

    /**
     * Get grade configuration summary for a course
     */
    @GetMapping("/courses/{courseId}/grade-config")
    public ResponseEntity<Map<String, Object>> getGradeConfigSummary(@PathVariable Long courseId) {
        log.info("GET /courses/{}/grade-config", courseId);
        return ResponseEntity.ok(gradeComponentService.getGradeConfigSummary(courseId));
    }

    /**
     * Get main (non-resit) grade components for a course
     */
    @GetMapping("/courses/{courseId}/grade-components/main")
    public ResponseEntity<List<GradeComponentResponse>> getMainComponents(@PathVariable Long courseId) {
        log.info("GET /courses/{}/grade-components/main", courseId);
        return ResponseEntity.ok(gradeComponentService.getMainComponents(courseId));
    }

    /**
     * Get resit grade components for a course
     */
    @GetMapping("/courses/{courseId}/grade-components/resit")
    public ResponseEntity<List<GradeComponentResponse>> getResitComponents(@PathVariable Long courseId) {
        log.info("GET /courses/{}/grade-components/resit", courseId);
        return ResponseEntity.ok(gradeComponentService.getResitComponents(courseId));
    }

    /**
     * Get total weight of main components for a course
     */
    @GetMapping("/courses/{courseId}/grade-components/total-weight")
    public ResponseEntity<Map<String, Object>> getTotalWeight(@PathVariable Long courseId) {
        log.info("GET /courses/{}/grade-components/total-weight", courseId);
        Double totalWeight = gradeComponentService.getTotalWeight(courseId);
        return ResponseEntity.ok(Map.of(
                "courseId", courseId,
                "totalWeight", totalWeight,
                "isValid", Math.abs(totalWeight - 100.0) < 0.01));
    }

    /**
     * Create a new grade component for a course
     */
    @PostMapping("/courses/{courseId}/grade-components")
    public ResponseEntity<GradeComponentResponse> createGradeComponent(
            @PathVariable Long courseId,
            @Valid @RequestBody GradeComponentRequest request) {
        log.info("POST /courses/{}/grade-components | name={}", courseId, request.getName());
        return ResponseEntity.ok(gradeComponentService.createGradeComponent(courseId, request));
    }

    // ==================== COMPONENT-SCOPED ENDPOINTS ====================

    /**
     * Update a grade component
     */
    @PutMapping("/grade-components/{id}")
    public ResponseEntity<GradeComponentResponse> updateGradeComponent(
            @PathVariable Long id,
            @Valid @RequestBody GradeComponentRequest request) {
        log.info("PUT /grade-components/{} | name={}", id, request.getName());
        return ResponseEntity.ok(gradeComponentService.updateGradeComponent(id, request));
    }

    /**
     * Delete a grade component
     */
    @DeleteMapping("/grade-components/{id}")
    public ResponseEntity<Void> deleteGradeComponent(@PathVariable Long id) {
        log.info("DELETE /grade-components/{}", id);
        gradeComponentService.deleteGradeComponent(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Duplicate a grade component
     */
    @PostMapping("/grade-components/{id}/duplicate")
    public ResponseEntity<GradeComponentResponse> duplicateGradeComponent(@PathVariable Long id) {
        log.info("POST /grade-components/{}/duplicate", id);
        return ResponseEntity.ok(gradeComponentService.duplicateGradeComponent(id));
    }

    /**
     * Toggle isRequired for a grade component
     */
    @PatchMapping("/grade-components/{id}/toggle-required")
    public ResponseEntity<GradeComponentResponse> toggleRequired(@PathVariable Long id) {
        log.info("PATCH /grade-components/{}/toggle-required", id);
        return ResponseEntity.ok(gradeComponentService.toggleRequired(id));
    }
}
