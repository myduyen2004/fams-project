package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Simple notification DTO for dashboard widgets
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardNotificationResponse {
    private Long id;
    private String title;
    private String description;
    private String timestamp;
    private Boolean isRead;
    private String type;

    private String senderName;
    private String senderFullName;
    private String senderAvatar;

    private java.util.List<String> attachmentUrls;
}
