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
public class ScheduleRequestResponse {
    private Long id;
    private Long requesterId;
    private String requesterName;
    private String requesterCode;
    private String requesterAvatar;
    private String requesterRole;
    private String className;
    private String type;
    private String typeLabel; // Tiếng Việt
    private String reason;
    private String status;
    private String statusLabel; // Tiếng Việt
    private String approverName;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    private String approverNote;

    // Additional info for original/requested slots
    private Long originalSlotId;
    private String originalSlotInfo;
    private Long requestedSlotId;
    private String requestedSlotInfo;
    private String requestedRoomName;
    private String requesterEmail;
    private String requesterMajor;
    private String file;
}
