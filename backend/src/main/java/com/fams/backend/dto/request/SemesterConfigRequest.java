package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SemesterConfigRequest {
    private List<String> selectedDays;
    private Integer maxSlotsPerDay;
    private Integer slotsPerSubjectPerWeek;
    private Integer slotDuration;
    private Boolean isPublished;
    private List<SlotTypeRequest> slots;
    private List<HolidayRequest> holidays;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotTypeRequest {
        private String startTime;
        private String endTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HolidayRequest {
        private String holidayDate;
        private String description;
    }
}
