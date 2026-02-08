package com.fams.backend.controller;

import com.fams.backend.dto.face.FaceDTO;
import com.fams.backend.service.FaceAttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/face-attendance")
@RequiredArgsConstructor
@Tag(name = "Face Attendance", description = "Face recognition attendance endpoints")
public class FaceAttendanceController {

    private final FaceAttendanceService faceAttendanceService;
    private final com.fams.backend.repository.UserRepository userRepository;

    @PostMapping("/register")
    @Operation(summary = "Register face")
    public ResponseEntity<FaceDTO.RegisterFaceResponse> registerFace(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody FaceDTO.RegisterFaceRequest request) {

        Long userId = extractUserId(userDetails);
        log.info("Face registration request for user {}", userId);

        FaceDTO.RegisterFaceResponse response = faceAttendanceService.registerFace(userId, request);

        if (response.getSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/check-in")
    @Operation(summary = "Face check-in")
    public ResponseEntity<FaceDTO.FaceCheckInResponse> checkInWithFace(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody FaceDTO.FaceCheckInRequest request) {

        Long studentId = extractUserId(userDetails);
        log.info("Face check-in for student {} at slot {}", studentId, request.getSlotId());

        FaceDTO.FaceCheckInResponse response = faceAttendanceService.checkInWithFace(studentId, request);

        String status = response.getStatus();
        if ("SUCCESS".equals(status) || "LATE".equals(status) || "ALREADY_CHECKED_IN".equals(status)) {
            return ResponseEntity.ok(response);
        } else if ("REQUIRES_MANUAL".equals(status)) {
            return ResponseEntity.status(202).body(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/status")
    @Operation(summary = "Face status")
    public ResponseEntity<FaceDTO.FaceStatusResponse> getFaceStatus(@AuthenticationPrincipal UserDetails userDetails) {

        Long userId = extractUserId(userDetails);
        FaceDTO.FaceStatusResponse response = faceAttendanceService.getFaceStatus(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending-verifications")
    @Operation(summary = "Pending verifications")
    public ResponseEntity<FaceDTO.PendingVerificationsResponse> getPendingVerifications(
            @AuthenticationPrincipal UserDetails userDetails) {

        Long lecturerId = extractUserId(userDetails);
        FaceDTO.PendingVerificationsResponse response = faceAttendanceService.getPendingVerifications(lecturerId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/manual-verify")
    @Operation(summary = "Manual verify")
    public ResponseEntity<Void> manualVerify(@AuthenticationPrincipal UserDetails userDetails,
            @RequestBody FaceDTO.ManualVerifyRequest request) {

        Long lecturerId = extractUserId(userDetails);
        log.info("Manual verify by lecturer {} for student {}", lecturerId, request.getStudentId());

        faceAttendanceService.manualVerify(lecturerId, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/face-image")
    @Operation(summary = "Get registered face image")
    public ResponseEntity<FaceDTO.FaceImagesResponse> getFaceImage(@AuthenticationPrincipal UserDetails userDetails) {

        Long userId = extractUserId(userDetails);
        FaceDTO.FaceImagesResponse response = faceAttendanceService.getFaceImage(userId);

        if (response != null) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/check-quality")
    @Operation(summary = "Check face quality")
    public ResponseEntity<FaceDTO.FaceQualityResponse> checkQuality(@RequestBody FaceDTO.FaceQualityRequest request) {
        // This is a public or secured endpoint?
        // Ideally secured, but for simplicity we allow valid JWT user or even open if
        // needed for registration flow init
        // But let's assume valid token is present

        FaceDTO.FaceQualityResponse response = faceAttendanceService.checkQuality(request);
        return ResponseEntity.ok(response);
    }

    private Long extractUserId(UserDetails userDetails) {
        return userRepository.findByUsername(userDetails.getUsername()).map(com.fams.backend.entity.User::getId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));
    }
}
