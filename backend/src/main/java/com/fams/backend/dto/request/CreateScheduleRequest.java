package com.fams.backend.dto.request;

import com.fams.backend.entity.ScheduleRequest;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateScheduleRequest {
    private Long originalSlotId;
    private ScheduleRequest.RequestType type;
    private String reason;
    private String file;

    // For RESCHEDULE/ROOM_CHANGE/SWAP
    private LocalDate requestedDate;
    private Long requestedSlotTypeId; // e.g. 1 for Slot 1
    private Long requestedRoomId;
}
