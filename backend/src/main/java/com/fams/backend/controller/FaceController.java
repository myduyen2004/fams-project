package com.fams.backend.controller;

import com.fams.backend.client.FaceRecognitionClient;
import com.fams.backend.service.FaceAttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/face")
@RequiredArgsConstructor
@Tag(name = "Face AI", description = "Direct face AI endpoints")
public class FaceController {

    private final FaceAttendanceService faceService;

    @PostMapping("/detect")
    @Operation(summary = "Detect face and check for spoofing (Proxy to AI Service)")
    public ResponseEntity<FaceRecognitionClient.FaceDetectResponse> detectFace(
            @RequestBody Map<String, String> request) {
        log.info("FaceController.detectFace called");
        String image = request.get("image");
        if (image == null || image.isEmpty()) {
            log.warn("FaceController.detectFace: No image provided");
            return ResponseEntity.badRequest().build();
        }

        FaceRecognitionClient.FaceDetectResponse response = faceService.detectFace(image);

        // If replay detected, return 400 with the response body so client can see
        // 'is_replay'
        if (Boolean.TRUE.equals(response.getIsReplay())) {
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }
}
