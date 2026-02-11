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
    private Integer originalSlotNumber; // Added
    private String originalSlotInfo;
    private Long requestedSlotId;
    private Integer requestedSlotNumber; // Added
    private String requestedSlotInfo;
    private String requestedRoomName;
    private java.time.LocalDate requestedDate; // Ngày yêu cầu thay đổi
    private String originalRoomName; // Added
    private java.time.LocalDate originalDate; // Ngày slot ban đầu
    private String requesterEmail;
    private String requesterMajor;
    private String file;
}
