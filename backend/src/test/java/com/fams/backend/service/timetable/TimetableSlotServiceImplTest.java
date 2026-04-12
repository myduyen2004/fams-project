package com.fams.backend.service.timetable.impl;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.*;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.repository.SlotTypeRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimetableSlotServiceImplTest {

    @Mock
    private TimetableSlotRepository timetableSlotRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private SlotTypeRepository slotTypeRepository;
    @Mock
    private SemesterRepository semesterRepository;

    @InjectMocks
    private TimetableSlotServiceImpl service;

    // =========================================================================
    // 1. getLecturerTeachingDates Tests (5 Cases) - FE-75
    // =========================================================================

    @Test
    void testGetLecturerTeachingDates_Success() {
        Semester semester = Semester.builder().code("SP26").startDate(LocalDate.of(2026, 1, 1)).endDate(LocalDate.of(2026, 5, 1)).build();
        when(semesterRepository.findByCode("SP26")).thenReturn(Optional.of(semester));
        
        List<LocalDate> expectedDates = Arrays.asList(LocalDate.of(2026, 2, 10), LocalDate.of(2026, 2, 15));
        when(timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(1L, semester.getStartDate(), semester.getEndDate()))
                .thenReturn(expectedDates);

        List<LocalDate> result = service.getLecturerTeachingDates(1L, "SP26");
        assertEquals(2, result.size());
        assertEquals(expectedDates, result);
    }

    @Test
    void testGetLecturerTeachingDates_SemesterNotFound() {
        when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class, () -> service.getLecturerTeachingDates(1L, "INVALID"));
        assertEquals("Semester not found: INVALID", ex.getMessage());
        verify(timetableSlotRepository, never()).findDistinctDatesByLecturerIdAndDateBetween(anyLong(), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    void testGetLecturerTeachingDates_EmptySchedule() {
        Semester semester = Semester.builder().code("SP26").startDate(LocalDate.of(2026, 1, 1)).endDate(LocalDate.of(2026, 5, 1)).build();
        when(semesterRepository.findByCode("SP26")).thenReturn(Optional.of(semester));
        
        when(timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(99L, semester.getStartDate(), semester.getEndDate()))
                .thenReturn(Collections.emptyList());

        List<LocalDate> result = service.getLecturerTeachingDates(99L, "SP26");
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetLecturerTeachingDates_BoundarySemesterDates() {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(1);
        Semester edgeSemester = Semester.builder().code("EDGE").startDate(start).endDate(end).build();
        when(semesterRepository.findByCode("EDGE")).thenReturn(Optional.of(edgeSemester));
        when(timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(1L, start, end))
                .thenReturn(Collections.singletonList(start));

        List<LocalDate> result = service.getLecturerTeachingDates(1L, "EDGE");
        assertEquals(1, result.size());
        assertEquals(start, result.get(0));
    }

    @Test
    void testGetLecturerTeachingDates_RepoThrowsException() {
        Semester semester = Semester.builder().code("SP26").startDate(LocalDate.of(2026, 1, 1)).endDate(LocalDate.of(2026, 5, 1)).build();
        when(semesterRepository.findByCode("SP26")).thenReturn(Optional.of(semester));
        when(timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(anyLong(), any(), any()))
                .thenThrow(new RuntimeException("DB Timeout"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.getLecturerTeachingDates(1L, "SP26"));
        assertEquals("DB Timeout", ex.getMessage());
    }

    // =========================================================================
    // 2. searchAssignments Tests (5 Cases) - FE-76
    // =========================================================================

    @Test
    void testSearchAssignments_Success() {
        TimetableSlot slot = new TimetableSlot();
        slot.setId(10L);
        slot.setDate(LocalDate.of(2026, 3, 15));
        slot.setDayOfWeek(7); // Saturday
        slot.setSlotNumber(1);
        Page<TimetableSlot> mockPage = new PageImpl<>(Collections.singletonList(slot));
        
        when(timetableSlotRepository.findAssignments(eq(1L), eq("SP26"), any(), eq("SE1801"), any()))
                .thenReturn(mockPage);

        Page<TimetableDTO.TimetableSlotDTO> result = service.searchAssignments(1L, "SP26", null, "SE1801", "ALL", PageRequest.of(0, 10));
        
        assertEquals(1, result.getTotalElements());
        assertEquals(10L, result.getContent().get(0).getId());
        assertEquals(1, result.getContent().get(0).getSlotNumber());
        assertEquals(7, result.getContent().get(0).getDayOfWeek());
    }

    @Test
    void testSearchAssignments_EmptyResult() {
        when(timetableSlotRepository.findAssignments(anyLong(), anyString(), any(), anyString(), any()))
                .thenReturn(Page.empty());

        Page<TimetableDTO.TimetableSlotDTO> result = service.searchAssignments(1L, "SP26", LocalDate.now(), "SE1801", null, PageRequest.of(0, 10));
        assertTrue(result.isEmpty());
    }

    @Test
    void testSearchAssignments_NullFiltersHandledSafely() {
        TimetableSlot slot = new TimetableSlot();
        slot.setId(11L);
        slot.setDayOfWeek(1); // Monday
        slot.setSlotNumber(2);
        when(timetableSlotRepository.findAssignments(isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(new PageImpl<>(Collections.singletonList(slot)));

        Page<TimetableDTO.TimetableSlotDTO> result = service.searchAssignments(null, null, null, null, null, PageRequest.of(0, 10));
        assertFalse(result.isEmpty());
        assertEquals(11L, result.getContent().get(0).getId());
    }

    @Test
    void testSearchAssignments_BoundaryPagination() {
        when(timetableSlotRepository.findAssignments(anyLong(), anyString(), any(), anyString(), any()))
                .thenReturn(Page.empty());
        
        PageRequest hugeOffset = PageRequest.of(9999, 100);
        Page<TimetableDTO.TimetableSlotDTO> result = service.searchAssignments(1L, "SP26", null, "SE1801", "ALL", hugeOffset);
        assertEquals(0, result.getTotalElements());
    }

    @Test
    void testSearchAssignments_DatabaseError() {
        when(timetableSlotRepository.findAssignments(any(), any(), any(), any(), any()))
                .thenThrow(new RuntimeException("SQL Execution Error"));

        assertThrows(RuntimeException.class, () -> service.searchAssignments(1L, "SP26", null, "SE1801", null, PageRequest.of(0, 10)));
    }

    // =========================================================================
    // 3. updateSlot Tests (5 Cases) - FE-77
    // =========================================================================

    @Test
    void testUpdateSlot_SuccessNoConflicts() {
        TimetableDTO.UpdateSlotRequest request = TimetableDTO.UpdateSlotRequest.builder()
                .roomId(2L).slotNumber(3).date(LocalDate.now()).build();
        
        TimetableSlot existingSlot = new TimetableSlot();
        existingSlot.setId(1L);
        ClassSection cs = new ClassSection();
        cs.setClassName("SE1801");
        Semester sem = Semester.builder().id(5L).build();
        cs.setSemester(sem);
        existingSlot.setClassSection(cs);

        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(roomRepository.findById(2L)).thenReturn(Optional.of(new Room()));
        when(slotTypeRepository.findBySemesterIdAndSlotIndex(5L, 3)).thenReturn(Optional.of(new SlotType()));
        
        // Mock conflict checks mapping to empty
        when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(anyLong(), any(), anyInt(), any())).thenReturn(Collections.emptyList());
        when(timetableSlotRepository.countStudentConflicts(anyString(), any(), anyInt())).thenReturn(0L);
        
        when(timetableSlotRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        TimetableDTO.TimetableSlotDTO result = service.updateSlot(1L, request);
        assertEquals(1L, result.getId());
        assertEquals(3, result.getSlotNumber());
    }

    @Test
    void testUpdateSlot_SlotNotFound() {
        when(timetableSlotRepository.findById(99L)).thenReturn(Optional.empty());
        TimetableDTO.UpdateSlotRequest request = TimetableDTO.UpdateSlotRequest.builder().roomId(1L).build();

        assertThrows(NotFoundException.class, () -> service.updateSlot(99L, request));
    }

    @Test
    void testUpdateSlot_RoomConflictOccurs() {
        TimetableDTO.UpdateSlotRequest request = TimetableDTO.UpdateSlotRequest.builder().roomId(2L).slotNumber(3).date(LocalDate.now()).build();
        TimetableSlot existingSlot = new TimetableSlot();
        existingSlot.setId(1L);
        ClassSection cs = new ClassSection();
        cs.setSemester(Semester.builder().id(5L).build());
        existingSlot.setClassSection(cs);

        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(roomRepository.findById(2L)).thenReturn(Optional.of(new Room()));
        when(slotTypeRepository.findBySemesterIdAndSlotIndex(5L, 3)).thenReturn(Optional.of(new SlotType()));

        TimetableSlot conflictingSlot = new TimetableSlot();
        conflictingSlot.setId(20L); // Different ID causes conflict trigger
        when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(anyLong(), any(), anyInt(), any()))
                .thenReturn(Collections.singletonList(conflictingSlot));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateSlot(1L, request));
        assertTrue(ex.getMessage().contains("Room is already occupied"));
    }

    @Test
    void testUpdateSlot_StudentConflictOccurs() {
        TimetableDTO.UpdateSlotRequest request = TimetableDTO.UpdateSlotRequest.builder().roomId(2L).slotNumber(3).date(LocalDate.now()).build();
        TimetableSlot existingSlot = new TimetableSlot();
        existingSlot.setId(1L);
        ClassSection cs = new ClassSection();
        cs.setClassName("SE1801");
        cs.setSemester(Semester.builder().id(5L).build());
        existingSlot.setClassSection(cs);

        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(roomRepository.findById(2L)).thenReturn(Optional.of(new Room()));
        when(slotTypeRepository.findBySemesterIdAndSlotIndex(5L, 3)).thenReturn(Optional.of(new SlotType()));

        // No room conflict
        when(timetableSlotRepository.findByRoomIdAndDateAndSlotNumberAndStatusNot(anyLong(), any(), anyInt(), any())).thenReturn(Collections.emptyList());
        // Simulating Student Conflict
        when(timetableSlotRepository.countStudentConflicts(eq("SE1801"), any(), eq(3))).thenReturn(5L);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateSlot(1L, request));
        assertTrue(ex.getMessage().contains("viên bị trùng lịch học khác"));
    }

    @Test
    void testUpdateSlot_InvalidSlotTypeBoundary() {
        TimetableDTO.UpdateSlotRequest request = TimetableDTO.UpdateSlotRequest.builder().roomId(2L).slotNumber(99).date(LocalDate.now()).build();
        TimetableSlot existingSlot = new TimetableSlot();
        existingSlot.setId(1L);
        ClassSection cs = new ClassSection();
        cs.setSemester(Semester.builder().id(5L).build());
        existingSlot.setClassSection(cs);

        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(roomRepository.findById(2L)).thenReturn(Optional.of(new Room()));
        
        // Simulating Slot 99 boundary failure (Not found for semester)
        when(slotTypeRepository.findBySemesterIdAndSlotIndex(5L, 99)).thenReturn(Optional.empty());

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateSlot(1L, request));
        assertTrue(ex.getMessage().contains("Invalid slot number"));
    }
}
