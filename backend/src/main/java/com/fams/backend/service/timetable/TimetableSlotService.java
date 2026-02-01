package com.fams.backend.service.timetable;

import com.fams.backend.dto.timetable.TimetableDTO;
import java.time.LocalDate;

public interface TimetableSlotService {
    /**
     * Update a specific timetable slot manually.
     * Includes conflict checks.
     */
    TimetableDTO.TimetableSlotDTO updateSlot(Long id, TimetableDTO.UpdateSlotRequest request);

    /**
     * Get availability of all rooms and slots for a given date and semester.
     */
    TimetableDTO.AvailabilityResponse getAvailability(LocalDate date, String semesterCode);
}
