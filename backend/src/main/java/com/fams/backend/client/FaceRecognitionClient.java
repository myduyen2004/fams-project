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
        try {
            return restClient.post()
                    .uri("/api/face/verify")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(FaceVerifyResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("AI verify error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return parseErrorResponse(e.getResponseBodyAsString(), FaceVerifyResponse.class);
        } catch (Exception e) {
            log.error("Unexpected error in AI verify: {}", e.getMessage());
            return FaceVerifyResponse.builder()
                    .success(false)
                    .isMatch(false)
                    .message("Verify failed: " + e.getMessage())
                    .build();
        }
    }

    public FaceDetectResponse detectFace(FaceDetectRequest request) {
        log.debug("Calling AI service detect face");
        try {
            return restClient.post()
                    .uri("/api/face/detect")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(FaceDetectResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("AI detect error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return parseErrorResponse(e.getResponseBodyAsString(), FaceDetectResponse.class);
        } catch (Exception e) {
            log.error("Unexpected error in AI detect: {}", e.getMessage());
            return FaceDetectResponse.builder()
                    .success(false)
                    .faceFound(false)
                    .message("Detect failed: " + e.getMessage())
                    .build();
        }
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
        try {
            return restClient.post()
                    .uri("/api/face/liveness/passive")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(LivenessResponse.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("AI liveness error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return parseErrorResponse(e.getResponseBodyAsString(), LivenessResponse.class);
        } catch (Exception e) {
            log.error("Unexpected error in AI liveness: {}", e.getMessage());
            return LivenessResponse.builder()
                    .success(false)
                    .passed(false)
                    .message("Liveness check failed: " + e.getMessage())
                    .build();
        }
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
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("AI quality error: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return parseErrorResponse(e.getResponseBodyAsString(), FaceQualityResponse.class);
        } catch (Exception e) {
            log.error("Unexpected error in AI quality check: {}", e.getMessage());
            return FaceQualityResponse.builder()
                    .success(false)
                    .passed(false)
                    .message("Quality check failed: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Centralized parser for error responses from AI Service
     */
    private <T> T parseErrorResponse(String body, Class<T> responseType) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            T errorResponse = mapper.readValue(body, responseType);

            // Handle nested JSON messages if present
            try {
                java.lang.reflect.Method getMessage = responseType.getMethod("getMessage");
                java.lang.reflect.Method setMessage = responseType.getMethod("setMessage", String.class);
                String msg = (String) getMessage.invoke(errorResponse);

                if (msg != null && msg.trim().startsWith("{")) {
                    com.fasterxml.jackson.databind.JsonNode rootNode = mapper.readTree(msg);
                    if (rootNode.has("message")) {
                        setMessage.invoke(errorResponse, rootNode.get("message").asText());
                    }
                }
            } catch (Exception reflectionEx) {
                // Ignore reflection errors
            }

            return errorResponse;
        } catch (Exception e) {
            log.error("Failed to parse AI error response: {}", body);
            try {
                return responseType.getDeclaredConstructor().newInstance();
            } catch (Exception instantiateEx) {
                return null;
            }
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
        private String mode;
        @com.fasterxml.jackson.annotation.JsonProperty("liveness_proof")
        private LivenessProof livenessProof;
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
        private String mode;
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
        @com.fasterxml.jackson.annotation.JsonProperty("is_replay")
        private Boolean isReplay;
        @com.fasterxml.jackson.annotation.JsonProperty("is_liveness")
        private Boolean isLiveness;
        @com.fasterxml.jackson.annotation.JsonProperty("screen_artifacts_score")
        private Double screenArtifactsScore;
        @com.fasterxml.jackson.annotation.JsonProperty("replay_score")
        private Double replayScore;
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
        private String mode;
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
        private String mode;
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
}
