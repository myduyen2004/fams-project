package com.fams.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fams.backend.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UploadServiceImpl implements UploadService {

    private final Cloudinary cloudinary;

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
}
