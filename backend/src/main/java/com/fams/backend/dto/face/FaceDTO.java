package com.fams.backend.dto.face;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs for Face Recognition operations
 */
public class FaceDTO {

    // ========================================
    // Request DTOs
    // ========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterFaceRequest {
        private Long userId;
        private List<String> faceImages; // Changed from single string to list
        private LivenessProofDTO livenessProof;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceCheckInRequest {
        private Long slotId;
        private String faceImageBase64;
        private String wifiSsid;
        private String wifiBssid;
        private Integer wifiRssi;
        private Integer attemptNumber;
        private LivenessProofDTO livenessProof;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LivenessProofDTO {
        private Boolean passedPassiveCheck;
        private Boolean passedBlinkCheck;
        private Boolean passedHeadMovement;
        private Boolean passedSmile;
        private Long timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualVerifyRequest {
        private Long sessionId;
        private Long studentId;
        private String status;
        private String note;
    }

    // ========================================
    // Response DTOs
    // ========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterFaceResponse {
        private Boolean success;
        private Long userId;
        private String message;
        private LocalDateTime registeredAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceCheckInResponse {
        private String status;
        private String message;
        private String courseName;
        private String sessionTime;
        private Double confidence;
        private Integer attemptNumber;
        private Integer remainingAttempts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceStatusResponse {
        private Long userId;
        private Boolean hasFaceData;
        private Integer faceCount;
        private LocalDateTime registeredAt;

        // Current attendance state (optional, only when slotId is provided)
        private Integer attemptCount;
        private Integer remainingAttempts;
        private Integer maxAttempts;
        private String attendanceStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingVerificationDTO {
        private Long attendanceId;
        private Long sessionId;
        private Long studentId;
        private String studentCode;
        private String studentName;
        private String avatarUrl;
        private Integer attemptCount;
        private String failureReason;
        private LocalDateTime lastAttemptAt;
        private String courseName;
        private String className;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingVerificationsResponse {
        private Integer count;
        private List<PendingVerificationDTO> pendingVerifications;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceImagesResponse {
        private Long userId;
        private String faceImage; // Base64 encoded image
        private LocalDateTime registeredAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceQualityRequest {
        private String image;
        private String mode;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceQualityResponse {
        private Boolean success;
        private Boolean passed;
        private List<String> warnings;
        private List<String> errors;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FacePreCheckRequest {
        private Long slotId;
        private String image;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FacePreCheckResponse {
        private Boolean success;
        private Boolean passed; // Is the face "clean" (not a spoof)
        private String message;
        private Boolean isQualityWarning; // NEW: Instructional warning (distance/light) vs real spoof
        private Integer attemptNumber;
        private Integer remainingAttempts;
        private Integer maxAttempts;
        private String status; // e.g. "FAILED", "REQUIRES_MANUAL"
    }
}
