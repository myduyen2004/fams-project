package com.fams.backend.controller;

import com.fams.backend.dto.response.SemesterResponse;
import com.fams.backend.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/semesters")
@RequiredArgsConstructor
public class SemesterController {

    private final SemesterService semesterService;

    @GetMapping("/active")
    public ResponseEntity<List<SemesterResponse>> getAllSemesters() {
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SemesterResponse> getSemesterById(@PathVariable Long id) {
        return ResponseEntity.ok(semesterService.getSemesterById(id));
    }

    @PostMapping
    public ResponseEntity<SemesterResponse> createSemester(@RequestBody SemesterResponse semesterDTO) {
        SemesterResponse createdSemester = semesterService.createSemester(semesterDTO);
        return ResponseEntity.status(201).body(createdSemester);
    }

    @PutMapping("/{code}")
    public ResponseEntity<SemesterResponse> updateSemester(
            @PathVariable String code,
            @RequestBody SemesterResponse semesterDTO) {
        SemesterResponse updatedSemester = semesterService.updateSemester(code, semesterDTO);
        return ResponseEntity.ok(updatedSemester);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> deleteSemester(@PathVariable String code) {
        semesterService.deleteSemester(code);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/get-by-code/{code}")
    public ResponseEntity<SemesterResponse> getSemesterByCode(@PathVariable String code) {
        return ResponseEntity.ok(semesterService.getSemesterByCode(code));
    }

    @PostMapping("/{code}/config")
    public ResponseEntity<Void> saveSemesterConfig(
            @PathVariable String code,
            @RequestBody com.fams.backend.dto.request.SemesterConfigRequest configRequest) {
        semesterService.saveSemesterConfig(code, configRequest);
        return ResponseEntity.ok().build();
    }
}