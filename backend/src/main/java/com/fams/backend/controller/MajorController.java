package com.fams.backend.controller;

import com.fams.backend.dto.MajorImportDTO;
import com.fams.backend.dto.request.MajorRequest;
import com.fams.backend.dto.response.MajorResponse;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/majors")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MajorController {

    private final MajorService majorService;

    @GetMapping
    public ResponseEntity<Page<MajorResponse>> getMajors(
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
    public ResponseEntity<Major> createMajor(@RequestBody MajorRequest request) {
        return ResponseEntity.ok(majorService.createMajor(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MajorResponse> getMajor(@PathVariable Long id) {
        return ResponseEntity.ok(majorService.getMajor(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Major> updateMajor(@PathVariable Long id, @RequestBody MajorRequest request) {
        return ResponseEntity.ok(majorService.updateMajor(id, request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Major> updateStatus(@PathVariable Long id, @RequestParam Major.MajorStatus status) {
        return ResponseEntity.ok(majorService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMajor(@PathVariable Long id) {
        majorService.deleteMajor(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importMajors(@RequestParam("file") MultipartFile file) {
        Map<String, Object> result = majorService.importMajors(file);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/import/preview")
    public ResponseEntity<List<MajorImportDTO>> previewImportMajors(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(majorService.previewImportMajors(file));
    }

    @PostMapping("/import/save")
    public ResponseEntity<Map<String, Object>> saveImportedMajors(@RequestBody List<MajorImportDTO> dtos) {
        return ResponseEntity.ok(majorService.saveImportedMajors(dtos));
    }

    @GetMapping("/import/template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] data = majorService.exportMajorTemplate();
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=major_import_template.xlsx")
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(data);
    }
}
