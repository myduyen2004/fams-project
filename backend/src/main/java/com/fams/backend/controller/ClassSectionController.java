package com.fams.backend.controller;

import com.fams.backend.dto.request.ClassSectionRequest;
import com.fams.backend.dto.request.EnrollmentRequest;
import com.fams.backend.dto.response.ClassDetailResponse;
import com.fams.backend.dto.response.ClassSectionResponse;
import com.fams.backend.dto.response.ClassSectionTransferResponse;
import com.fams.backend.dto.response.EnrollmentResponse;
import com.fams.backend.dto.response.LecturerOptionResponse;
import com.fams.backend.dto.response.StudentOptionResponse;
import com.fams.backend.service.ClassSectionService;
import com.fams.backend.service.impl.StagingImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/class-sections")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Class Sections", description = "API for managing class sections")
public class ClassSectionController {

        private final ClassSectionService classSectionService;
        private final StagingImportService stagingImportService;

        // ==================== READ ENDPOINTS ====================

        @GetMapping("/semester/{semesterCode}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS') or hasRole('LECTURER')")
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
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS') or hasRole('LECTURER') or hasRole('STUDENT')")
        @Operation(summary = "Get lecturers by semester", description = "Get list of lecturers who have class sections in a semester")
        public ResponseEntity<List<LecturerOptionResponse>> getLecturersBySemester(
                        @PathVariable String semesterCode) {
                log.info("GET /api/v1/class-sections/semester/{}/lecturers", semesterCode);
                return ResponseEntity.ok(classSectionService.getLecturersBySemester(semesterCode));
        }

        @GetMapping("/lecturers")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS') or hasRole('LECTURER') or hasRole('STUDENT')")
        @Operation(summary = "Get all lecturers", description = "Get list of all lecturers for dropdown")
        public ResponseEntity<List<LecturerOptionResponse>> getAllLecturers() {
                log.info("GET /api/v1/class-sections/lecturers");
                return ResponseEntity.ok(classSectionService.getAllLecturers());
        }

        @GetMapping("/semester/{semesterCode}/courses")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS') or hasRole('LECTURER')")
        @Operation(summary = "Get courses by semester and lecturer", description = "Get list of unique courses taught by a lecturer in a semester")
        public ResponseEntity<List<com.fams.backend.dto.response.CourseOptionResponse>> getCoursesBySemesterAndLecturer(
                        @PathVariable String semesterCode,
                        @RequestParam Long lecturerId) {
                log.info("GET /api/v1/class-sections/semester/{}/courses?lecturerId={}", semesterCode, lecturerId);
                return ResponseEntity.ok(
                                classSectionService.getCourseOptionsByLecturerAndSemester(semesterCode, lecturerId));
        }

        @GetMapping("/{className}/enrollments")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS') or hasRole('LECTURER') or hasRole('STUDENT')")
        @Operation(summary = "Get enrollments by class section", description = "Get list of student enrollments for a specific class section")
        public ResponseEntity<List<EnrollmentResponse>> getEnrollmentsByClassName(
                        @PathVariable String className) {
                log.info("GET /api/v1/class-sections/{}/enrollments", className);
                return ResponseEntity.ok(classSectionService.getEnrollmentsByClassName(className));
        }

        @GetMapping("/{className}/details")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS') or hasRole('LECTURER')")
        @Operation(summary = "Get class section details", description = "Get detailed information for a specific class section including enrollments")
        public ResponseEntity<ClassDetailResponse> getClassDetail(@PathVariable String className) {
                log.info("GET /api/v1/class-sections/{}/details", className);
                return ResponseEntity.ok(classSectionService.getClassDetail(className));
        }

        @GetMapping("/{className}/available-students")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Get available students for class section", description = "Get list of students not enrolled in this class section")
        public ResponseEntity<List<StudentOptionResponse>> getAvailableStudents(@PathVariable String className) {
                log.info("GET /api/v1/class-sections/{}/available-students", className);
                return ResponseEntity.ok(classSectionService.getAvailableStudentsForClassSection(className));
        }

        // ==================== CLASS SECTION CRUD ENDPOINTS ====================

        @PostMapping
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Create a class section", description = "Create a new class section. Only allowed when semester is UPCOMING.")
        public ResponseEntity<ClassSectionResponse> createClassSection(
                        @Valid @RequestBody ClassSectionRequest request) {
                log.info("POST /api/v1/class-sections | className={}", request.getClassName());
                return ResponseEntity.ok(classSectionService.createClassSection(request));
        }

        @PutMapping("/{className}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Update a class section", description = "Update an existing class section. Only allowed when semester is UPCOMING.")
        public ResponseEntity<ClassSectionResponse> updateClassSection(
                        @PathVariable String className,
                        @Valid @RequestBody ClassSectionRequest request) {
                log.info("PUT /api/v1/class-sections/{}", className);
                return ResponseEntity.ok(classSectionService.updateClassSection(className, request));
        }

        @DeleteMapping("/{className}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Delete a class section", description = "Delete a class section. Only allowed when semester is UPCOMING.")
        public ResponseEntity<Void> deleteClassSection(@PathVariable String className) {
                log.info("DELETE /api/v1/class-sections/{}", className);
                classSectionService.deleteClassSection(className);
                return ResponseEntity.noContent().build();
        }

        @DeleteMapping("/bulk")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Delete multiple class sections", description = "Delete multiple class sections. Only allowed when semester is UPCOMING.")
        public ResponseEntity<Void> deleteClassSections(@RequestBody List<String> classNames) {
                log.info("DELETE /api/v1/class-sections/bulk | count={}", classNames.size());
                classSectionService.deleteClassSections(classNames);
                return ResponseEntity.noContent().build();
        }

        // ==================== ENROLLMENT CRUD ENDPOINTS ====================

        @PostMapping("/enrollments")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Create an enrollment", description = "Create a new enrollment. Only allowed when semester is UPCOMING.")
        public ResponseEntity<EnrollmentResponse> createEnrollment(
                        @Valid @RequestBody EnrollmentRequest request) {
                log.info("POST /api/v1/class-sections/enrollments | className={}, studentCode={}",
                                request.getClassName(), request.getStudentCode());
                return ResponseEntity.ok(classSectionService.createEnrollment(request));
        }

        @PutMapping("/enrollments/{enrollmentId}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Update an enrollment", description = "Update an enrollment status. Only allowed when semester is UPCOMING.")
        public ResponseEntity<EnrollmentResponse> updateEnrollment(
                        @PathVariable Long enrollmentId,
                        @Valid @RequestBody EnrollmentRequest request) {
                log.info("PUT /api/v1/class-sections/enrollments/{}", enrollmentId);
                return ResponseEntity.ok(classSectionService.updateEnrollment(enrollmentId, request));
        }

        @DeleteMapping("/enrollments/{enrollmentId}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Delete an enrollment", description = "Delete an enrollment. Only allowed when semester is UPCOMING.")
        public ResponseEntity<Void> deleteEnrollment(@PathVariable Long enrollmentId) {
                log.info("DELETE /api/v1/class-sections/enrollments/{}", enrollmentId);
                classSectionService.deleteEnrollment(enrollmentId);
                return ResponseEntity.noContent().build();
        }

        @DeleteMapping("/enrollments/bulk")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Delete multiple enrollments", description = "Delete multiple enrollments. Only allowed when semester is UPCOMING.")
        public ResponseEntity<Void> deleteEnrollments(@RequestBody List<Long> enrollmentIds) {
                log.info("DELETE /api/v1/class-sections/enrollments/bulk | count={}", enrollmentIds.size());
                classSectionService.deleteEnrollments(enrollmentIds);
                return ResponseEntity.noContent().build();
        }

        @GetMapping("/{className}/transfer-targets")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Get available class sections for transfer", description = "Get list of class sections with same course that have available slots")
        public ResponseEntity<List<ClassSectionResponse>> getAvailableClassSectionsForTransfer(
                        @PathVariable String className) {
                log.info("GET /api/v1/class-sections/{}/transfer-targets", className);
                return ResponseEntity.ok(classSectionService.getAvailableClassSectionsForTransfer(className));
        }

        @GetMapping("/{className}/transfer-targets-with-conflict")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Get available class sections for transfer with conflict check", description = "Get list of class sections with same course that have available slots, including conflict check for a student")
        public ResponseEntity<List<ClassSectionTransferResponse>> getAvailableClassSectionsForTransferWithConflict(
                        @PathVariable String className,
                        @RequestParam Long studentId) {
                log.info("GET /api/v1/class-sections/{}/transfer-targets-with-conflict?studentId={}", className,
                                studentId);
                return ResponseEntity.ok(classSectionService.getAvailableClassSectionsForTransferWithConflict(className,
                                studentId));
        }

        @PostMapping("/enrollments/transfer")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Transfer enrollments to another class section", description = "Transfer selected enrollments to a different class section with the same course. Only allowed when semester is UPCOMING.")
        public ResponseEntity<Void> transferEnrollments(
                        @RequestBody Map<String, Object> request) {
                @SuppressWarnings("unchecked")
                List<Integer> enrollmentIdInts = (List<Integer>) request.get("enrollmentIds");
                List<Long> enrollmentIds = enrollmentIdInts.stream().map(Long::valueOf).toList();
                String targetClassName = (String) request.get("targetClassName");
                log.info("POST /api/v1/class-sections/enrollments/transfer | count={}, target={}",
                                enrollmentIds.size(), targetClassName);
                classSectionService.transferEnrollments(enrollmentIds, targetClassName);
                return ResponseEntity.ok().build();
        }

        // ==================== TEMPLATE DOWNLOAD ENDPOINTS ====================

        @GetMapping("/import/template")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
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
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
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
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Fast preview class sections import", description = "Ultra-fast preview using Staging Table. RAM usage < 50MB even for 1M rows. Returns summary only.")
        public ResponseEntity<Map<String, Object>> fastPreviewClassSections(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/fast-preview | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.fastPreviewClassSections(semesterCode, file));
        }

        @PostMapping("/semester/{semesterCode}/enrollments/fast-preview")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Fast preview enrollments import", description = "Ultra-fast preview using Staging Table. RAM usage < 50MB even for 1M rows.")
        public ResponseEntity<Map<String, Object>> fastPreviewEnrollments(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/enrollments/fast-preview | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.fastPreviewEnrollments(semesterCode, file));
        }

        @PostMapping("/semester/{semesterCode}/bulk-import")
        @PreAuthorize("hasAnyAuthority('ROLE_ACADEMIC_STAFF', 'MANAGE_SEMESTERS')")
        @Operation(summary = "Bulk import class sections", description = "Ultra-fast bulk import using Staging Table. RAM < 50MB for 1M rows.")
        public ResponseEntity<Map<String, Object>> bulkImportClassSections(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/bulk-import | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.bulkImportClassSections(semesterCode, file));
        }

        @PostMapping("/semester/{semesterCode}/enrollments/bulk-import")
        @PreAuthorize("hasAnyAuthority('ROLE_ACADEMIC_STAFF', 'MANAGE_SEMESTERS')")
        @Operation(summary = "Bulk import enrollments", description = "Ultra-fast bulk import enrollments using Staging Table. RAM < 50MB for 1M rows.")
        public ResponseEntity<Map<String, Object>> bulkImportEnrollments(
                        @PathVariable String semesterCode,
                        @RequestParam("file") MultipartFile file) {
                log.info("POST /api/v1/class-sections/semester/{}/enrollments/bulk-import | filename={}, size={}MB",
                                semesterCode, file.getOriginalFilename(), file.getSize() / (1024 * 1024));
                return ResponseEntity.ok(stagingImportService.bulkImportEnrollments(semesterCode, file));
        }
}
