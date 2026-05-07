package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String content;
    private String type;
    private String priority;
    private String targetType;
    private String targetClassName;
    private Long targetCourseId;
    private String status;
    private LocalDateTime scheduledAt;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isRead;
    private LocalDateTime readAt;
    private UserBasic sender;
    private String targetUrl;
    private java.util.List<String> attachmentUrls;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserBasic {
        private Long id;
        private String username;
        private String fullName;
        private String role;
        private String avatarUrl;
    }
}
