package com.fams.backend.service.timetable.impl;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.Semester;
import com.fams.backend.entity.TimetableSlot;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.repository.SlotTypeRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TimetableSlotServiceImplTest {

    @Mock
    private TimetableSlotRepository timetableSlotRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private SlotTypeRepository slotTypeRepository;
    @Mock
    private SemesterRepository semesterRepository;

    @InjectMocks
    private TimetableSlotServiceImpl timetableSlotService;

    private Long lecturerId = 1L;
    private String semesterCode = "SUMMER2026";

    @BeforeEach
    void setUp() {
    }

    /**
     * Test searchAssignments - Normal case with all filters
     */
    @Test
    void testSearchAssignments_AllFilters() {
        LocalDate date = LocalDate.of(2026, 4, 16);
        String className = "SE1701";
        Pageable pageable = PageRequest.of(0, 10);
        TimetableSlot slot = new TimetableSlot();
        slot.setId(101L);
        slot.setDate(date);

        Page<TimetableSlot> page = new PageImpl<>(Arrays.asList(slot));
        when(timetableSlotRepository.findAssignments(lecturerId, semesterCode, date, className, pageable))
                .thenReturn(page);

        Page<TimetableDTO.TimetableSlotDTO> result = timetableSlotService.searchAssignments(
                lecturerId, semesterCode, date, className, "SCHEDULED", pageable);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(101L, result.getContent().get(0).getId());
    }

    /**
     * Test searchAssignments - Empty results
     */
    @Test
    void testSearchAssignments_Empty() {
        Pageable pageable = PageRequest.of(0, 10);
        when(timetableSlotRepository.findAssignments(any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        Page<TimetableDTO.TimetableSlotDTO> result = timetableSlotService.searchAssignments(
                lecturerId, semesterCode, null, null, null, pageable);

        assertTrue(result.getContent().isEmpty());
    }

    /**
     * Test getLecturerTeachingDates - Normal case
     */
    @Test
    void testGetLecturerTeachingDates_Normal() {
        Semester semester = new Semester();
        semester.setStartDate(LocalDate.of(2026, 1, 1));
        semester.setEndDate(LocalDate.of(2026, 5, 1));
        
        when(semesterRepository.findByCode(semesterCode)).thenReturn(Optional.of(semester));
        
        List<LocalDate> dates = Arrays.asList(LocalDate.of(2026, 4, 16));
        when(timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(
                lecturerId, semester.getStartDate(), semester.getEndDate())).thenReturn(dates);

        List<LocalDate> result = timetableSlotService.getLecturerTeachingDates(lecturerId, semesterCode);

        assertEquals(1, result.size());
        assertEquals(dates.get(0), result.get(0));
    }

    /**
     * Test getLecturerTeachingDates - Free lecturer (No dates)
     */
    @Test
    void testGetLecturerTeachingDates_FreeLecturer() {
        Semester semester = new Semester();
        semester.setStartDate(LocalDate.of(2026, 1, 1));
        semester.setEndDate(LocalDate.of(2026, 5, 1));
        
        when(semesterRepository.findByCode(semesterCode)).thenReturn(Optional.of(semester));
        when(timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(any(), any(), any()))
                .thenReturn(Collections.emptyList());

        List<LocalDate> result = timetableSlotService.getLecturerTeachingDates(lecturerId, semesterCode);

        assertTrue(result.isEmpty());
    }

    /**
     * Test getLecturerTeachingDates - Semester NotFound
     */
    @Test
    void testGetLecturerTeachingDates_NotFound() {
        when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> {
            timetableSlotService.getLecturerTeachingDates(lecturerId, "INVALID");
        });
    }

    @Nested
    @DisplayName("updateSlot()")
    class UpdateSlotTests {

        private TimetableSlot slot;
        private com.fams.backend.entity.Room room;
        private com.fams.backend.entity.SlotType slotType;
        private com.fams.backend.entity.ClassSection classSection;
        private com.fams.backend.entity.User lecturer;
        private TimetableDTO.UpdateSlotRequest request;

        @BeforeEach
        void setUp() {
            lecturer = new com.fams.backend.entity.User();
            lecturer.setId(lecturerId);

            com.fams.backend.entity.Semester semester = new com.fams.backend.entity.Semester();
            semester.setId(10L);
            semester.setCode(semesterCode);

            classSection = new com.fams.backend.entity.ClassSection();
            classSection.setClassName("SE1701");
            classSection.setSemester(semester);
            classSection.setLecturer(lecturer);

            room = new com.fams.backend.entity.Room();
            room.setId(10L);
            room.setCode("BE-301");

            slotType = new com.fams.backend.entity.SlotType();
            slotType.setId(5L);
            slotType.setSlotIndex(1);

            slot = new TimetableSlot();
            slot.setId(101L);
            slot.setClassSection(classSection);
            slot.setRoom(room);
            slot.setDate(LocalDate.of(2026, 4, 16));
            slot.setSlotNumber(2);

            request = TimetableDTO.UpdateSlotRequest.builder()
                    .date(LocalDate.of(2026, 4, 17))
                    .slotNumber(1)
                    .roomId(10L)
                    .build();
        }

        @Test
        @DisplayName("UTCID01 - Normal: Update successful with no conflicts")
        void updateSlot_success() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(slotTypeRepository.findBySemesterIdAndSlotIndex(10L, 1)).thenReturn(Optional.of(slotType));
            
            // No conflicts
            when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(timetableSlotRepository.findByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(timetableSlotRepository.existsByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(false);
            when(timetableSlotRepository.countStudentConflicts(any(), any(), any())).thenReturn(0L);

            when(timetableSlotRepository.save(any())).thenReturn(slot);

            TimetableDTO.TimetableSlotDTO result = timetableSlotService.updateSlot(101L, request);

            assertNotNull(result);
            assertEquals(101L, result.getId());
            assertEquals(1, result.getSlotNumber());
            verify(timetableSlotRepository).save(any());
        }

        @Test
        @DisplayName("UTCID02 - Abnormal: Slot ID not found")
        void updateSlot_slotNotFound() {
            when(timetableSlotRepository.findById(999L)).thenReturn(Optional.empty());
            assertThrows(com.fams.backend.exception.NotFoundException.class, 
                    () -> timetableSlotService.updateSlot(999L, request));
        }

        @Test
        @DisplayName("UTCID03 - Abnormal: Room ID not found")
        void updateSlot_roomNotFound() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.empty());
            assertThrows(com.fams.backend.exception.BadRequestException.class, 
                    () -> timetableSlotService.updateSlot(101L, request));
        }

        @Test
        @DisplayName("UTCID04 - Abnormal: Invalid slot number for semester")
        void updateSlot_invalidSlotNumber() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(slotTypeRepository.findBySemesterIdAndSlotIndex(10L, 1)).thenReturn(Optional.empty());
            assertThrows(com.fams.backend.exception.BadRequestException.class, 
                    () -> timetableSlotService.updateSlot(101L, request));
        }

        @Test
        @DisplayName("UTCID05 - Conflict: Room is already occupied")
        void updateSlot_roomConflict() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(slotTypeRepository.findBySemesterIdAndSlotIndex(10L, 1)).thenReturn(Optional.of(slotType));

            TimetableSlot otherSlot = new TimetableSlot();
            otherSlot.setId(202L);
            when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(List.of(otherSlot));

            assertThrows(com.fams.backend.exception.BadRequestException.class, 
                    () -> timetableSlotService.updateSlot(101L, request));
        }

        @Test
        @DisplayName("UTCID06 - Conflict: Lecturer is teaching elsewhere")
        void updateSlot_lecturerConflict() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(slotTypeRepository.findBySemesterIdAndSlotIndex(10L, 1)).thenReturn(Optional.of(slotType));

            when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            
            TimetableSlot otherSlot = new TimetableSlot();
            otherSlot.setId(202L);
            when(timetableSlotRepository.findByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(List.of(otherSlot));

            assertThrows(com.fams.backend.exception.BadRequestException.class, 
                    () -> timetableSlotService.updateSlot(101L, request));
        }

        @Test
        @DisplayName("UTCID07 - Conflict: Class already has another slot")
        void updateSlot_classConflict() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(slotTypeRepository.findBySemesterIdAndSlotIndex(10L, 1)).thenReturn(Optional.of(slotType));

            when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(timetableSlotRepository.findByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            
            when(timetableSlotRepository.existsByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(true);
            TimetableSlot otherSlot = new TimetableSlot();
            otherSlot.setId(202L);
            when(timetableSlotRepository.findByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(List.of(otherSlot));

            assertThrows(com.fams.backend.exception.BadRequestException.class, 
                    () -> timetableSlotService.updateSlot(101L, request));
        }

        @Test
        @DisplayName("UTCID08 - Conflict: Students in class have overlapping schedules")
        void updateSlot_studentConflict() {
            when(timetableSlotRepository.findById(101L)).thenReturn(Optional.of(slot));
            when(roomRepository.findById(10L)).thenReturn(Optional.of(room));
            when(slotTypeRepository.findBySemesterIdAndSlotIndex(10L, 1)).thenReturn(Optional.of(slotType));

            when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(timetableSlotRepository.findByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(Collections.emptyList());
            when(timetableSlotRepository.existsByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                    .thenReturn(false);
            
            when(timetableSlotRepository.countStudentConflicts(any(), any(), any())).thenReturn(5L);

            assertThrows(com.fams.backend.exception.BadRequestException.class, 
                    () -> timetableSlotService.updateSlot(101L, request));
        }
    }
}
