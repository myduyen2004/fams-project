package com.fams.backend.service.timetable;

import com.fams.backend.dto.timetable.TimetableDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;
import java.util.List;

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

    /**
     * Get distinct teaching dates for a lecturer in a semester.
     */
    List<LocalDate> getLecturerTeachingDates(Long lecturerId, String semesterCode);

    /**
     * Search assignments (slots) with filters and pagination.
     */
    Page<TimetableDTO.TimetableSlotDTO> searchAssignments(Long lecturerId, String semesterCode, LocalDate date,
            String className, String status, Pageable pageable);
}
