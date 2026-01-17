package com.fams.backend.controller;

import com.fams.backend.service.UploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Upload Management", description = "API cho phép upload file lên Cloudinary thông qua Backend")
public class FileUploadController {

    private final UploadService uploadService;

    @PostMapping
    @Operation(summary = "Upload một file lên Cloudinary")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        log.info("START uploadFile - filename: {}, size: {}, contentType: {}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        try {
            String url = uploadService.uploadFile(file);

            if (url == null) {
                log.warn("Upload failed - UploadService returned null for file: {}", file.getOriginalFilename());
                return ResponseEntity.badRequest().body(Map.of("message", "Không thể upload file"));
            }

            log.info("Upload successful - resulting URL: {}", url);
            return ResponseEntity.ok(Map.of(
                    "url", url,
                    "secure_url", url));
        } catch (Exception e) {
            log.error("EXCEPTION in FileUploadController.uploadFile: ", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Lỗi server: " + e.getMessage()));
        }
    }
}
