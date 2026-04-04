package com.fams.backend.controller;

import com.fams.backend.dto.response.SemesterResponse;
import com.fams.backend.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/semesters")
@RequiredArgsConstructor
@Tag(name = "Semesters", description = "API cho quản lý kỳ học")
public class SemesterController {

    private final SemesterService semesterService;

    @GetMapping("/active")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasRole('STUDENT') or hasRole('LECTURER') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<List<SemesterResponse>> getAllSemesters() {
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<SemesterResponse>> getUpcomingSemesters() {
        return ResponseEntity.ok(semesterService.getUpcomingSemesters());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<SemesterResponse> getSemesterById(@PathVariable Long id) {
        return ResponseEntity.ok(semesterService.getSemesterById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<SemesterResponse> createSemester(@RequestBody SemesterResponse semesterDTO) {
        SemesterResponse createdSemester = semesterService.createSemester(semesterDTO);
        return ResponseEntity.status(201).body(createdSemester);
    }

    @PutMapping("/{code}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<SemesterResponse> updateSemester(
            @PathVariable String code,
            @RequestBody SemesterResponse semesterDTO) {
        SemesterResponse updatedSemester = semesterService.updateSemester(code, semesterDTO);
        return ResponseEntity.ok(updatedSemester);
    }

    @DeleteMapping("/{code}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<Void> deleteSemester(@PathVariable String code) {
        semesterService.deleteSemester(code);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/get-by-code/{code}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<SemesterResponse> getSemesterByCode(@PathVariable String code) {
        return ResponseEntity.ok(semesterService.getSemesterByCode(code));
    }

    @PostMapping("/{code}/config")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<Void> saveSemesterConfig(
            @PathVariable String code,
            @RequestBody com.fams.backend.dto.request.SemesterConfigRequest configRequest) {
        semesterService.saveSemesterConfig(code, configRequest);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{code}/publish")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<java.util.Map<String, Object>> togglePublished(
            @PathVariable String code,
            @RequestBody java.util.Map<String, Boolean> request) {
        Boolean isPublished = request.get("isPublished");
        semesterService.setPublished(code, isPublished != null && isPublished);
        return ResponseEntity.ok(java.util.Map.of(
                "success", true,
                "isPublished", isPublished != null && isPublished));
    }

    @GetMapping("/{code}/publish")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SEMESTERS')")
    public ResponseEntity<java.util.Map<String, Object>> getPublishStatus(@PathVariable String code) {
        boolean isPublished = semesterService.isPublished(code);
        return ResponseEntity.ok(java.util.Map.of("isPublished", isPublished));
    }

}