package com.fams.backend.controller;

import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

@Slf4j
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FileDownloadController {

    private final Cloudinary cloudinary;

    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadFile(
            @RequestParam String publicId,
            @RequestParam(defaultValue = "raw") String resourceType,
            @RequestParam(required = false) String filename) {
        try {
            log.info("Download request for publicId: {}, resourceType: {}", publicId, resourceType);

            // Use secure(true) and remove .signed(true) for public resources to avoid
            // signature mismatch
            String signedUrl = cloudinary.url()
                    .resourceType(resourceType)
                    .secure(true)
                    .generate(publicId);

            log.info("Generated signed URL: {}", signedUrl);

            // Download file from Cloudinary
            URL url = new URL(signedUrl);
            try (InputStream inputStream = url.openStream()) {
                byte[] fileBytes = inputStream.readAllBytes();

                // Determine content type
                String contentType = "application/octet-stream";
                if (filename == null || filename.isEmpty()) {
                    filename = publicId.substring(publicId.lastIndexOf('/') + 1);
                }

                // Determine content type based on filename extension (more accurate)
                if (filename.toLowerCase().endsWith(".heic")) {
                    contentType = "image/heic";
                } else if (filename.toLowerCase().endsWith(".heif")) {
                    contentType = "image/heif";
                } else if (filename.toLowerCase().endsWith(".pdf")) {
                    contentType = "application/pdf";
                } else if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (filename.toLowerCase().endsWith(".png")) {
                    contentType = "image/png";
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType(contentType));
                headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
                headers.setContentLength(fileBytes.length);

                log.info("Successfully downloaded file: {} ({} bytes)", filename, fileBytes.length);
                return new ResponseEntity<>(fileBytes, headers, HttpStatus.OK);
            }
        } catch (IOException e) {
            log.error("Failed to download file from Cloudinary: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            log.error("Unexpected error during file download: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
