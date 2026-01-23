package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SemesterResponse {
    private String code;
    private String name;
    private String startDate;
    private String endDate;
    private String status;
    private String action;
    private Boolean isPublished;

    // Configuration details
    private List<String> selectedDays;
    private Integer maxSlotsPerDay;
    private Integer slotsPerSubjectPerWeek;
    private Integer slotDuration;
    private List<SlotTypeResponse> slots;
    private List<HolidayResponse> holidays;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotTypeResponse {
        private String startTime;
        private String endTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HolidayResponse {
        private String holidayDate;
        private String description;
    }
}
