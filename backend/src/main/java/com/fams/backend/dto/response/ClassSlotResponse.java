package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSlotResponse {
    private Long id;
    private Integer slotNumber;
    private Long roomId;
    private String roomName;
    private LocalDate date;
    private Integer dayOfWeek;
}
