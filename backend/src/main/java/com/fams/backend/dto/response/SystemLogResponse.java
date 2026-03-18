package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemLogResponse {
    private Long id;
    private String title;
    private String description;
    private String timestamp;
    private String type; // info, success, warning, error
    private String performerName;
    private String performerAvatar;
    private String ipAddress;
    private String userAgent;
    private String oldValue;
    private String newValue;
}
