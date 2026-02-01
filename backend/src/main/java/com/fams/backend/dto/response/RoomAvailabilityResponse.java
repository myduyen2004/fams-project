package com.fams.backend.dto.response;

import com.fams.backend.entity.Room.RoomStatus;
import com.fams.backend.entity.Room.RoomType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response DTO for room availability including whether the room is available
 * for a specific date and slot
 */
@Data
@Builder
public class RoomAvailabilityResponse {
    private Long id;
    private String code;
    private String name;
    private Integer capacity;
    private String building;
    private Integer floor;
    private RoomType type;
    private RoomStatus status;
    private Integer gridRow;
    private Integer gridCol;
    private Integer gridRowSpan;
    private Integer gridColSpan;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Availability status for the requested date/slot
    private Boolean isAvailable;
}
