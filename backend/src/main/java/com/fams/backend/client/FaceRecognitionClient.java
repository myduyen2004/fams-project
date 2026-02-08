package com.fams.backend.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * REST client for AI Service face recognition endpoints
 */
@Slf4j
@Component
public class FaceRecognitionClient {

    private final RestClient restClient;

    public FaceRecognitionClient(@Value("${ai-service.url:http://localhost:5000}") String aiServiceUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    public FaceVerifyResponse verifyFace(FaceVerifyRequest request) {
        log.debug("Calling AI service verify face");
        return restClient.post()
                .uri("/api/face/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(FaceVerifyResponse.class);
    }

    public FaceDetectResponse detectFace(FaceDetectRequest request) {
        log.debug("Calling AI service detect face");
        return restClient.post()
                .uri("/api/face/detect")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(FaceDetectResponse.class);
    }

    public FaceRegisterResponse registerFace(FaceRegisterRequest request) {
        log.info("Calling AI service register face for user {}", request.getUserId());
        log.info("Request - userId: {}, image length: {}, livenessProof: {}",
                request.getUserId(),
                request.getImage() != null ? request.getImage().length() : "null",
                request.getLivenessProof());
        try {
            return restClient.post()
                    .uri("/api/face/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(FaceRegisterResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("AI service returned error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            // Parse error response
            try {
                // Try to parse as FaceRegisterResponse first
                FaceRegisterResponse errorResponse = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(e.getResponseBodyAsString(), FaceRegisterResponse.class);

                // If the response contains a JSON string as message (nested JSON), try to parse
                // it
                if (errorResponse.getMessage() != null && errorResponse.getMessage().trim().startsWith("{")) {
                    try {
                        com.fasterxml.jackson.databind.JsonNode rootNode = new com.fasterxml.jackson.databind.ObjectMapper()
                                .readTree(errorResponse.getMessage());
                        if (rootNode.has("message")) {
                            errorResponse.setMessage(rootNode.get("message").asText());
                        }
                    } catch (Exception nestedEx) {
                        // Ignore nested parsing error, use original message
                    }
                }

                return errorResponse;
            } catch (Exception parseEx) {
                return FaceRegisterResponse.builder()
                        .success(false)
                        .message("AI service error: " + e.getMessage())
                        .build();
            }
        } catch (Exception e) {
            log.error("Unexpected error calling AI service: {}", e.getMessage(), e);
            return FaceRegisterResponse.builder()
                    .success(false)
                    .message("Failed to call AI service: " + e.getMessage())
                    .build();
        }
    }

    public LivenessResponse passiveLiveness(LivenessRequest request) {
        log.debug("Calling AI service passive liveness");
        return restClient.post()
                .uri("/api/face/liveness/passive")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(LivenessResponse.class);
    }

    public FaceQualityResponse checkQuality(FaceQualityRequest request) {
        log.debug("Calling AI service quality check");
        try {
            return restClient.post()
                    .uri("/api/face/quality-check")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(FaceQualityResponse.class);
        } catch (Exception e) {
            log.error("Error calling AI service quality check: {}", e.getMessage());
            return FaceQualityResponse.builder()
                    .success(false)
                    .passed(false)
                    .message("AI Service error: " + e.getMessage())
                    .build();
        }
    }

    // ========================================
    // Request/Response DTOs
    // ========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceVerifyRequest {
        @com.fasterxml.jackson.annotation.JsonProperty("captured_image")
        private String capturedImage;
        // List of multiple reference encodings (1:N support)
        @com.fasterxml.jackson.annotation.JsonProperty("reference_encodings")
        private List<List<Double>> referenceEncodings;
        @Deprecated
        @com.fasterxml.jackson.annotation.JsonProperty("reference_encoding")
        private List<Double> referenceEncoding; // Backward compatibility
        private Double tolerance;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceVerifyResponse {
        private Boolean success;
        @com.fasterxml.jackson.annotation.JsonProperty("is_match")
        private Boolean isMatch;
        private Double confidence;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceDetectRequest {
        private String image;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceDetectResponse {
        private Boolean success;
        @com.fasterxml.jackson.annotation.JsonProperty("face_found")
        private Boolean faceFound;
        @com.fasterxml.jackson.annotation.JsonProperty("face_count")
        private Integer faceCount;
        private List<Double> encoding;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceRegisterRequest {
        @com.fasterxml.jackson.annotation.JsonProperty("user_id")
        private Long userId;
        private String image;
        @com.fasterxml.jackson.annotation.JsonProperty("liveness_proof")
        private LivenessProof livenessProof;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceRegisterResponse {
        private Boolean success;
        @com.fasterxml.jackson.annotation.JsonProperty("user_id")
        private Long userId;
        private List<Double> encoding;
        @com.fasterxml.jackson.annotation.JsonProperty("liveness_verified")
        private Boolean livenessVerified;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LivenessRequest {
        private String image;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LivenessResponse {
        private Boolean success;
        private Boolean passed;
        private Double score;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LivenessProof {
        @com.fasterxml.jackson.annotation.JsonProperty("passed_passive")
        private Boolean passedPassive;
        @com.fasterxml.jackson.annotation.JsonProperty("passed_blink")
        private Boolean passedBlink;
        @com.fasterxml.jackson.annotation.JsonProperty("passed_head_movement")
        private Boolean passedHeadMovement;
        @com.fasterxml.jackson.annotation.JsonProperty("passed_smile")
        private Boolean passedSmile;
        private Long timestamp;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceQualityRequest {
        private String image;
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
}
