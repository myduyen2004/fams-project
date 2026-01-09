package com.fams.backend.controller;

import com.fams.backend.dto.MajorDTO;
import com.fams.backend.entity.Major;
import com.fams.backend.service.MajorService;
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
@RequestMapping("/api/majors")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MajorController {

    private final MajorService majorService;

    @GetMapping
    public ResponseEntity<Page<Major>> getMajors(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Major.MajorStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort) {

        String sortField = sort[0];
        Sort.Direction sortDirection = Sort.Direction.DESC;
        if (sort.length > 1 && sort[1].equalsIgnoreCase("asc")) {
            sortDirection = Sort.Direction.ASC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortField));
        return ResponseEntity.ok(majorService.getMajors(keyword, status, pageable));
    }

    @PostMapping
    public ResponseEntity<Major> createMajor(@RequestBody MajorDTO majorDTO) {
        return ResponseEntity.ok(majorService.createMajor(majorDTO));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Major> getMajor(@PathVariable Long id) {
        return ResponseEntity.ok(majorService.getMajor(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Major> updateStatus(@PathVariable Long id, @RequestParam Major.MajorStatus status) {
        return ResponseEntity.ok(majorService.updateStatus(id, status));
    }

    @PostMapping("/import")
    public ResponseEntity<List<Major>> importMajors(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(majorService.importMajors(file));
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
