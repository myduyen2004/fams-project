package com.fams.backend.controller;

import com.fams.backend.dto.request.SpecializationRequest;
import com.fams.backend.dto.response.SpecializationResponse;
import com.fams.backend.entity.Specialization;
import com.fams.backend.service.SpecializationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

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

    @PostMapping("/import/{majorId}")
    public ResponseEntity<List<Specialization>> importSpecializations(
            @PathVariable Long majorId,
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(specializationService.importSpecializations(majorId, file));
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
