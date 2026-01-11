package com.fams.backend.controller;

import com.fams.backend.dto.request.CourseRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<Page<CourseResponse>> getCourses(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Course.CourseStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(courseService.getCourses(keyword, status, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseResponse> getCourse(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.getCourse(id));
    }

    @PostMapping
    public ResponseEntity<CourseResponse> createCourse(@RequestBody CourseRequest request) {
        return ResponseEntity.ok(courseService.createCourse(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourseResponse> updateCourse(@PathVariable Long id, @RequestBody CourseRequest request) {
        return ResponseEntity.ok(courseService.updateCourse(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<CourseResponse> updateStatus(@PathVariable Long id,
            @RequestParam Course.CourseStatus status) {
        return ResponseEntity.ok(courseService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable Long id) {
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<CourseResponse>> searchCourses(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(courseService.searchCourses(keyword, limit));
    }

    @GetMapping("/search/not-in-specialization/{specId}")
    public ResponseEntity<List<CourseResponse>> searchCoursesNotInSpecialization(
            @PathVariable Long specId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(courseService.searchCoursesNotInSpecialization(specId, keyword, limit));
    }

    @GetMapping("/search/not-in-sub-specialization/{subSpecId}")
    public ResponseEntity<List<CourseResponse>> searchCoursesNotInSubSpecialization(
            @PathVariable Long subSpecId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(courseService.searchCoursesNotInSubSpecialization(subSpecId, keyword, limit));
    }
}
