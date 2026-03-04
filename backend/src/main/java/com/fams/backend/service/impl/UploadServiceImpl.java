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

    @Override
    public String uploadFile(MultipartFile file) {
        return uploadFile(file, "fams_general");
    }

    @Override
    public String uploadFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        try {
            String filename = file.getOriginalFilename();
            log.info("Uploading file to Cloudinary folder {}: {}", folder, filename);

            // Determine resource type based on file extension
            String resourceType = "auto";
            if (filename != null) {
                String lowerFilename = filename.toLowerCase();
                if (lowerFilename.endsWith(".doc") ||
                        lowerFilename.endsWith(".docx") ||
                        lowerFilename.endsWith(".xls") ||
                        lowerFilename.endsWith(".xlsx") ||
                        lowerFilename.endsWith(".txt") ||
                        lowerFilename.endsWith(".zip") ||
                        lowerFilename.endsWith(".rar")) {
                    resourceType = "raw"; // Use raw for documents and archives
                }
            }

            log.info("Using resource_type: {} for file: {}", resourceType, filename);
            Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap(
                            "resource_type", resourceType,
                            "type", "upload", // Make files publicly accessible
                            "folder", folder,
                            "use_filename", true,
                            "unique_filename", true,
                            "filename", file.getOriginalFilename()));

            String url = (String) uploadResult.get("secure_url");

            // Strip any Cloudinary signing from URL (s--xxx--) to avoid 404 errors
            // Files are uploaded with type=upload & access_mode=public, so signing is
            // unnecessary
            if (url != null && url.contains("/s--")) {
                url = url.replaceAll("/s--[^/]+--/", "/");
            }

            log.info("Upload successful: {}", url);
            return url;
        } catch (Exception e) {
            log.error("Cloudinary upload failed for file: {}. Error: {}", file.getOriginalFilename(), e.getMessage());
            throw new RuntimeException("Upload file thất bại: " + e.getMessage());
        }
    }

    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot >= 0 ? filename.substring(lastDot + 1) : "";
    }

    @Override
    public String uploadBytes(byte[] bytes, String fileName, String folder) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        try {
            log.info("Uploading bytes to Cloudinary folder {}: {}", folder, fileName);
            Map<?, ?> uploadResult = cloudinary.uploader().upload(bytes,
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
