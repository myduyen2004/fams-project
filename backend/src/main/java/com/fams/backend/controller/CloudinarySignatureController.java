package com.fams.backend.controller;

import com.cloudinary.Cloudinary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.cloudinary.utils.ObjectUtils;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/cloudinary")
@RequiredArgsConstructor
@Tag(name = "Cloudinary", description = "Cloudinary upload signature generation")
public class CloudinarySignatureController {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    @Value("${cloudinary.api-key}")
    private String apiKey;

    @GetMapping("/signature")
    @Operation(summary = "Get Cloudinary upload signature")
    public ResponseEntity<Map<String, Object>> getSignature(@RequestParam(required = false, defaultValue = "chat_attachments") String folder) {
        long timestamp = System.currentTimeMillis() / 1000L;

        Map<String, Object> params = new HashMap<>();
        params.put("timestamp", timestamp);
        params.put("folder", folder);

        String signature = cloudinary.apiSignRequest(params, cloudinary.config.apiSecret);

        Map<String, Object> response = new HashMap<>();
        response.put("signature", signature);
        response.put("timestamp", timestamp);
        response.put("apiKey", apiKey);
        response.put("cloudName", cloudName);
        response.put("folder", folder);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/image")
    @Operation(summary = "Delete an image from Cloudinary by public ID")
    public ResponseEntity<?> deleteImage(@RequestParam String publicId) {
        try {
            Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
