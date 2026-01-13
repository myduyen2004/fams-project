package com.fams.backend.controller;

import com.fams.backend.dto.request.ReorderCoursesRequest;
import com.fams.backend.dto.request.SubSpecializationRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.dto.response.SubSpecializationResponse;
import com.fams.backend.entity.SubSpecialization;
import com.fams.backend.service.SubSpecializationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sub-specializations")
@RequiredArgsConstructor
public class SubSpecializationController {

    private final SubSpecializationService subSpecializationService;

    @GetMapping("/by-specialization/{specId}")
    public ResponseEntity<List<SubSpecializationResponse>> getBySpecialization(@PathVariable Long specId) {
        return ResponseEntity.ok(subSpecializationService.getSubSpecializationsBySpecialization(specId));
    }

    @GetMapping("/by-specialization/{specId}/paged")
    public ResponseEntity<Page<SubSpecializationResponse>> getBySpecializationPaged(
            @PathVariable Long specId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SubSpecialization.SubSpecializationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(subSpecializationService.getSubSpecializationsBySpecialization(
                specId, keyword, status, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SubSpecializationResponse> getSubSpecialization(@PathVariable Long id) {
        return ResponseEntity.ok(subSpecializationService.getSubSpecialization(id));
    }

    @PostMapping
    public ResponseEntity<SubSpecializationResponse> create(@RequestBody SubSpecializationRequest request) {
        return ResponseEntity.ok(subSpecializationService.createSubSpecialization(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubSpecializationResponse> update(@PathVariable Long id,
            @RequestBody SubSpecializationRequest request) {
        return ResponseEntity.ok(subSpecializationService.updateSubSpecialization(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<SubSpecializationResponse> updateStatus(@PathVariable Long id,
            @RequestParam SubSpecialization.SubSpecializationStatus status) {
        return ResponseEntity.ok(subSpecializationService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        subSpecializationService.deleteSubSpecialization(id);
        return ResponseEntity.noContent().build();
    }

    // Course management endpoints
    @GetMapping("/{id}/courses")
    public ResponseEntity<List<CourseResponse>> getCourses(@PathVariable Long id) {
        return ResponseEntity.ok(subSpecializationService.getCourses(id));
    }

    @PostMapping("/{id}/courses/{courseId}")
    public ResponseEntity<CourseResponse> addCourse(@PathVariable Long id, @PathVariable Long courseId,
            @RequestParam(required = false, defaultValue = "1") Integer semester) {
        return ResponseEntity.ok(subSpecializationService.addCourse(id, courseId, semester));
    }

    @DeleteMapping("/{id}/courses/{courseId}")
    public ResponseEntity<Void> removeCourse(@PathVariable Long id, @PathVariable Long courseId) {
        subSpecializationService.removeCourse(id, courseId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/courses/reorder")
    public ResponseEntity<Void> reorderCourses(@PathVariable Long id, @RequestBody ReorderCoursesRequest request) {
        subSpecializationService.reorderCourses(id, request);
        return ResponseEntity.ok().build();
    }
}
