package com.fams.backend.controller;

import com.fams.backend.dto.CourseImportDTO;
import com.fams.backend.dto.request.CourseRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
@Slf4j
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
            @RequestParam(defaultValue = "1000") int limit) {
        return ResponseEntity.ok(courseService.searchCourses(keyword, limit));
    }

    @GetMapping("/search/not-in-specialization/{specId}")
    public ResponseEntity<List<CourseResponse>> searchCoursesNotInSpecialization(
            @PathVariable Long specId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1000") int limit) {
        return ResponseEntity.ok(courseService.searchCoursesNotInSpecialization(specId, keyword, limit));
    }

    @GetMapping("/search/not-in-sub-specialization/{subSpecId}")
    public ResponseEntity<List<CourseResponse>> searchCoursesNotInSubSpecialization(
            @PathVariable Long subSpecId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1000") int limit) {
        return ResponseEntity.ok(courseService.searchCoursesNotInSubSpecialization(subSpecId, keyword, limit));
    }

    // ==================== IMPORT/EXPORT ENDPOINTS ====================

    @PostMapping("/import/preview")
    public ResponseEntity<List<CourseImportDTO>> previewImportCourses(@RequestParam("file") MultipartFile file) {
        log.info("POST /courses/import/preview | filename={}", file.getOriginalFilename());
        return ResponseEntity.ok(courseService.previewImportCourses(file));
    }

    @PostMapping("/import/save")
    public ResponseEntity<Map<String, Object>> saveImportedCourses(@RequestBody List<CourseImportDTO> dtos) {
        log.info("POST /courses/import/save | count={}", dtos.size());
        return ResponseEntity.ok(courseService.saveImportedCourses(dtos));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCourses(@RequestParam(required = false) String status) {
        log.info("GET /courses/export | status={}", status);
        byte[] data = courseService.exportCourses(status);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=danh-sach-mon-hoc.xlsx")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/import/template")
    public ResponseEntity<byte[]> getImportTemplate() {
        log.info("GET /courses/import/template");
        byte[] data = courseService.getImportTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=template-import-mon-hoc.xlsx")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }
}
