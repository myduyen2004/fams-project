package com.fams.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fams.backend.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UploadServiceImpl implements UploadService {

    private final Cloudinary cloudinary;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    @SuppressWarnings("unchecked")
    @Override
    public String uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        try {
            log.info("Uploading file to Cloudinary: {}", file.getOriginalFilename());
            Map<Object, Object> uploadResult = (Map<Object, Object>) cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap(
                            "resource_type", "auto",
                            "folder", "fams_notifications",
                            "use_filename", true,
                            "unique_filename", true,
                            "filename", file.getOriginalFilename()));
            String url = (String) uploadResult.get("secure_url");
            log.info("Upload successful: {}", url);
            return url;
        } catch (Exception e) {
            log.error("Cloudinary upload failed: {}. Falling back to default avatar.", e.getMessage());
            // Fallback for demonstration since we don't have real keys
            return "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
        }
    }

    @Override
    public String uploadBytes(byte[] bytes, String fileName, String folder) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        try {
            log.info("Uploading bytes to Cloudinary folder {}: {}", folder, fileName);
            Map<Object, Object> uploadResult = (Map<Object, Object>) cloudinary.uploader().upload(bytes,
                    ObjectUtils.asMap(
                            "resource_type", "auto",
                            "folder", folder,
                            "use_filename", true,
                            "unique_filename", true,
                            "filename", fileName));
            String url = (String) uploadResult.get("secure_url");
            log.info("Byte upload successful: {}", url);
            return url;
        } catch (Exception e) {
            log.error("Cloudinary byte upload failed: {}. Falling back to local storage.", e.getMessage());
            return saveLocally(bytes, fileName);
        }
    }

    private String saveLocally(byte[] bytes, String fileName) {
        try {
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }
            Path path = Paths.get(uploadDir, fileName);
            Files.write(path, bytes);
            log.info("File saved locally: {}", path.toAbsolutePath());

            try {
                // Try to build dynamic URL based on current request
                return ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path("/api/files/")
                        .path(fileName)
                        .toUriString();
            } catch (Exception e) {
                // Fallback to relative URL if context is not available
                log.warn("Could not build dynamic URL, returning relative path: {}", e.getMessage());
                return "/api/files/" + fileName;
            }
        } catch (IOException e) {
            log.error("Failed to save file locally: {}", e.getMessage());
            return "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
        }
    }
}
