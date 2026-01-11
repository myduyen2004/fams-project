package com.fams.backend.controller;

import com.fams.backend.dto.request.SemesterDTORequest;
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
    public ResponseEntity<List<SemesterDTORequest>> getAllSemesters() {
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SemesterDTORequest> getSemesterById(@PathVariable Long id) {
        return ResponseEntity.ok(semesterService.getSemesterById(id));
    }

    @PostMapping
    public ResponseEntity<SemesterDTORequest> createSemester(@RequestBody SemesterDTORequest semesterDTO) {
        SemesterDTORequest createdSemester = semesterService.createSemester(semesterDTO);
        return ResponseEntity.status(201).body(createdSemester);
    }

    @PutMapping("/{code}")
    public ResponseEntity<SemesterDTORequest> updateSemester(
            @PathVariable String code,
            @RequestBody SemesterDTORequest semesterDTO) {
        SemesterDTORequest updatedSemester = semesterService.updateSemester(code, semesterDTO);
        return ResponseEntity.ok(updatedSemester);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> deleteSemester(@PathVariable String code) {
        semesterService.deleteSemester(code);
        return ResponseEntity.noContent().build();
    }
}