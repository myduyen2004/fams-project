package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse {
    private Long id;
    private String title;
    private String description;
    private String timestamp;
    private String level; // info, warning, error, critical
    private String type; // SYSTEM, GRADE, etc.
    private boolean isResolved;
}
