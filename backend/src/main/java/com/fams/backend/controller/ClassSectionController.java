package com.fams.backend.controller;

import com.fams.backend.dto.response.ClassSectionResponse;
import com.fams.backend.dto.response.EnrollmentResponse;
import com.fams.backend.dto.response.LecturerOptionResponse;
import com.fams.backend.service.ClassSectionService;
import com.fams.backend.service.impl.StagingImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/class-sections")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
@Tag(name = "Class Sections", description = "API for managing class sections")
public class ClassSectionController {

        private final ClassSectionService classSectionService;
        private final StagingImportService stagingImportService;

        // ==================== READ ENDPOINTS ====================

        @GetMapping("/semester/{semesterCode}")
        @Operation(summary = "Get all class sections by semester", description = "Retrieve paginated list of class sections for a specific semester with optional filters")
        public ResponseEntity<Page<ClassSectionResponse>> getClassSectionsBySemester(
                        @PathVariable String semesterCode,
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) String status,
                        @RequestParam(required = false) Long lecturerId,
                        Pageable pageable) {
                log.info("GET /api/v1/class-sections/semester/{} | search={}, status={}, lecturerId={}, page={}, size={}",
                                semesterCode, search, status, lecturerId, pageable.getPageNumber(),
                                pageable.getPageSize());

                Page<ClassSectionResponse> classSections = classSectionService.getClassSectionsBySemester(
                                semesterCode, search, status, lecturerId, pageable);

                return ResponseEntity.ok(classSections);
        }

        @GetMapping("/semester/{semesterCode}/lecturers")
        @Operation(summary = "Get lecturers by semester", description = "Get list of lecturers who have class sections in a semester")
        public ResponseEntity<List<LecturerOptionResponse>> getLecturersBySemester(
                        @PathVariable String semesterCode) {
                log.info("GET /api/v1/class-sections/semester/{}/lecturers", semesterCode);
                return ResponseEntity.ok(classSectionService.getLecturersBySemester(semesterCode));
        }

        @GetMapping("/{className}/enrollments")
        @Operation(summary = "Get enrollments by class section", description = "Get list of student enrollments for a specific class section")
        public ResponseEntity<List<EnrollmentResponse>> getEnrollmentsByClassName(
                        @PathVariable String className) {
                log.info("GET /api/v1/class-sections/{}/enrollments", className);
                return ResponseEntity.ok(classSectionService.getEnrollmentsByClassName(className));
        }

        // ==================== TEMPLATE DOWNLOAD ENDPOINTS ====================

        @GetMapping("/import/template")
        @Operation(summary = "Download import template", description = "Download Excel template for importing class sections")
        public ResponseEntity<byte[]> getImportTemplate() {
                log.info("GET /api/v1/class-sections/import/template");
                byte[] template = classSectionService.getImportTemplate();
                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION,
                                                "attachment; filename=class_sections_import_template.xlsx")
                                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                                .body(template);
        }

        @GetMapping("/semester/{semesterCode}/enrollments/import/template")
        @Operation(summary = "Download enrollment import template", description = "Download Excel template for importing enrollments for a semester")
        public ResponseEntity<byte[]> getEnrollmentImportTemplate(@PathVariable String semesterCode) {
                log.info("GET /api/v1/class-sections/semester/{}/enrollments/import/template", semesterCode);
                byte[] template = classSectionService.getEnrollmentImportTemplate(semesterCode);
                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION,
                                                "attachment; filename=enrollment_import_template_" + semesterCode
                                                                + ".xlsx")
                                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                                .body(template);
        }

        // ==================== BULK IMPORT ENDPOINTS (Staging Table - Ultra Low RAM)
        // ====================

        @PostMapping("/semester/{semesterCode}/fast-preview")
        @Operation(summary = "Fast preview class sections import", description = "Ultra-fast preview using Staging Table. RAM usage < 50MB even for 1M rows. Returns summary only.")
        public ResponseEntity<Map<String, Object>> fastPreviewClassSections(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/fast-preview | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.fastPreviewClassSections(semesterCode, file));
        }

        @PostMapping("/semester/{semesterCode}/enrollments/fast-preview")
        @Operation(summary = "Fast preview enrollments import", description = "Ultra-fast preview using Staging Table. RAM usage < 50MB even for 1M rows.")
        public ResponseEntity<Map<String, Object>> fastPreviewEnrollments(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/enrollments/fast-preview | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.fastPreviewEnrollments(semesterCode, file));
        }

        @PostMapping("/semester/{semesterCode}/bulk-import")
        @Operation(summary = "Bulk import class sections", description = "Ultra-fast bulk import using Staging Table. RAM < 50MB for 1M rows.")
        public ResponseEntity<Map<String, Object>> bulkImportClassSections(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/bulk-import | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.bulkImportClassSections(semesterCode, file));
        }

        @PostMapping("/semester/{semesterCode}/enrollments/bulk-import")
        @Operation(summary = "Bulk import enrollments", description = "Ultra-fast bulk import enrollments using Staging Table. RAM < 50MB for 1M rows.")
        public ResponseEntity<Map<String, Object>> bulkImportEnrollments(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/enrollments/bulk-import | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.bulkImportEnrollments(semesterCode, file));
        }
}
