package com.fams.backend.controller;

import com.fams.backend.dto.SpecializationImportDTO;
import com.fams.backend.dto.request.ReorderCoursesRequest;
import com.fams.backend.dto.request.SpecializationRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.dto.response.SpecializationResponse;
import com.fams.backend.entity.Specialization;
import com.fams.backend.service.SpecializationService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/specializations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SpecializationController {

    private final SpecializationService specializationService;

    @GetMapping("/by-major/{majorId}")
    public ResponseEntity<Page<SpecializationResponse>> getSpecializationsByMajor(
            @PathVariable Long majorId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Specialization.SpecializationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort) {

        String sortField = sort[0];
        Sort.Direction sortDirection = Sort.Direction.DESC;
        if (sort.length > 1 && sort[1].equalsIgnoreCase("asc")) {
            sortDirection = Sort.Direction.ASC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortField));
        return ResponseEntity.ok(specializationService.getSpecializationsByMajor(majorId, keyword, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpecializationResponse> getSpecialization(@PathVariable Long id) {
        return ResponseEntity.ok(specializationService.getSpecialization(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<SpecializationResponse> updateStatus(@PathVariable Long id,
            @RequestParam Specialization.SpecializationStatus status) {
        return ResponseEntity.ok(specializationService.updateStatus(id, status));
    }

    @PostMapping
    public ResponseEntity<SpecializationResponse> createSpecialization(
            @RequestBody SpecializationRequest request) {
        return ResponseEntity.ok(specializationService.createSpecialization(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SpecializationResponse> updateSpecialization(
            @PathVariable Long id,
            @RequestBody SpecializationRequest request) {
        return ResponseEntity.ok(specializationService.updateSpecialization(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSpecialization(@PathVariable Long id) {
        specializationService.deleteSpecialization(id);
        return ResponseEntity.noContent().build();
    }

    // ========== Import Specializations ==========

    @PostMapping("/import/preview/{majorId}")
    public ResponseEntity<List<SpecializationImportDTO>> previewImportSpecializations(
            @PathVariable Long majorId,
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(specializationService.previewImportSpecializations(majorId, file));
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/import/save/{majorId}")
    public ResponseEntity<Map<String, Object>> saveImportedSpecializations(
            @PathVariable Long majorId,
            @RequestBody List<SpecializationImportDTO> dtos) {
        return ResponseEntity.ok(specializationService.saveImportedSpecializations(majorId, dtos));
    }

    @GetMapping("/import/template")
    public ResponseEntity<Resource> downloadImportTemplate() throws IOException {
        byte[] data = specializationService.exportSpecializationTemplate();
        ByteArrayResource resource = new ByteArrayResource(data);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=specialization_import_template.xlsx")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(data.length)
                .body(resource);
    }

    // ========== Course Management ==========

    @GetMapping("/{id}/courses")
    public ResponseEntity<List<CourseResponse>> getCourses(@PathVariable Long id) {
        return ResponseEntity.ok(specializationService.getCourses(id));
    }

    @PostMapping("/{id}/courses/{courseId}")
    public ResponseEntity<CourseResponse> addCourse(@PathVariable Long id, @PathVariable Long courseId,
            @RequestParam(required = false, defaultValue = "1") Integer semester) {
        return ResponseEntity.ok(specializationService.addCourse(id, courseId, semester));
    }

    @DeleteMapping("/{id}/courses/{courseId}")
    public ResponseEntity<Void> removeCourse(@PathVariable Long id, @PathVariable Long courseId) {
        specializationService.removeCourse(id, courseId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/courses/reorder")
    public ResponseEntity<Void> reorderCourses(@PathVariable Long id, @RequestBody ReorderCoursesRequest request) {
        specializationService.reorderCourses(id, request);
        return ResponseEntity.ok().build();
    }
}
