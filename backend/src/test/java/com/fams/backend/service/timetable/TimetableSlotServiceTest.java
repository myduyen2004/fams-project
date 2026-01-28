package com.fams.backend.service.timetable;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimetableSlotServiceTest {

    @Mock
    private TimetableSlotRepository timetableSlotRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private SemesterRepository semesterRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @Mock
    private SlotTypeRepository slotTypeRepository;

    @InjectMocks
    private TimetableSlotService timetableSlotService;

    private TimetableSlot existingSlot;
    private TimetableDTO.UpdateSlotRequest updateRequest;
    private Semester semester;
    private ClassSection classSection;
    private Room room;
    private SlotType slotType;

    @BeforeEach
    void setUp() {
        semester = new Semester();
        semester.setId(1L);
        semester.setCode("SP25");
        semester.setStartDate(LocalDate.of(2025, 1, 1));
        semester.setEndDate(LocalDate.of(2025, 4, 30));

        classSection = new ClassSection();
        classSection.setClassName("SE1801");
        classSection.setSemester(semester);

        room = new Room();
        room.setId(1L);
        room.setCode("BE-201");
        room.setName("BE-201");

        slotType = new SlotType();
        slotType.setSlotIndex(1);

        existingSlot = new TimetableSlot();
        existingSlot.setId(1L);
        existingSlot.setClassSection(classSection);
        existingSlot.setRoom(room);
        existingSlot.setSlotType(slotType);
        existingSlot.setDate(LocalDate.of(2025, 2, 3)); // Monday
        existingSlot.setSlotNumber(1);

        updateRequest = new TimetableDTO.UpdateSlotRequest();
        updateRequest.setDate(LocalDate.of(2025, 2, 4)); // Tuesday
        updateRequest.setSlotNumber(2);
        updateRequest.setRoomId(1L);
    }

    @Test
    @DisplayName("Update Slot - Success")
    void updateSlot_Success() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(slotTypeRepository.findBySemesterIdAndSlotIndex(anyLong(), anyInt())).thenReturn(Optional.of(slotType));
        when(timetableSlotRepository.save(any(TimetableSlot.class))).thenAnswer(i -> i.getArguments()[0]);

        // Mock validations to pass
        semester.setWeekdays(new ArrayList<>()); // No specific weekdays = Mon-Sat valid
        when(holidayRepository.findBySemesterIdIsNull()).thenReturn(new ArrayList<>());
        when(timetableSlotRepository.existsByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                .thenReturn(false);
        when(timetableSlotRepository.findStudentsWithConflict(any(), any(), any(), any()))
                .thenReturn(new ArrayList<>());
        when(timetableSlotRepository.findStudentsExceedingMaxSlots(any(), any(), anyLong(), any()))
                .thenReturn(new ArrayList<>());
        when(timetableSlotRepository.findByClassName(anyString())).thenReturn(List.of(existingSlot));

        // Act
        TimetableDTO.TimetableSlotDTO result = timetableSlotService.updateSlot(1L, updateRequest);

        // Assert
        assertNotNull(result);
        assertEquals(updateRequest.getDate(), result.getDate());
        assertEquals(updateRequest.getSlotNumber(), result.getSlotNumber());
        assertEquals(TimetableSlot.TimetableSlotStatus.RESCHEDULED.name(), result.getStatus());
        verify(timetableSlotRepository).save(existingSlot);
    }

    @Test
    @DisplayName("Update Slot - HC-5: Date out of Semester Range")
    void updateSlot_HC5_DateOutOfRange() {
        // Arrange
        updateRequest.setDate(LocalDate.of(2024, 12, 31)); // Before semester
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-5]"));
        assertTrue(exception.getMessage().contains("nằm ngoài khoảng thời gian học kỳ"));
    }

    @Test
    @DisplayName("Update Slot - HC-5: Invalid Weekday")
    void updateSlot_HC5_InvalidWeekday() {
        // Arrange
        updateRequest.setDate(LocalDate.of(2025, 2, 9)); // Sunday
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));

        // Mock specific weekdays (e.g., only Mon, Wed, Fri)
        SemesterWeekday sw = new SemesterWeekday();
        sw.setWeekday(2); // Mon
        semester.setWeekdays(List.of(sw));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-5]"));
        assertTrue(exception.getMessage().contains("không phải là ngày học hợp lệ"));
    }

    @Test
    @DisplayName("Update Slot - HC-4: Scheduled on Holiday")
    void updateSlot_HC4_Holiday() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        Holiday holiday = new Holiday();
        holiday.setHolidayDate(updateRequest.getDate());
        semester.setHolidays(List.of(holiday));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-4]"));
        assertTrue(exception.getMessage().contains("là ngày nghỉ"));
    }

    @Test
    @DisplayName("Update Slot - HC-5: Slot Index Limit")
    void updateSlot_HC5_SlotLimit() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        SemesterConfig config = new SemesterConfig();
        config.setMaxSlotPerDay(4);
        semester.setConfig(config);
        updateRequest.setSlotNumber(5); // Exceeds 4

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-5]"));
        assertTrue(exception.getMessage().contains("không hợp lệ (Giới hạn: 4"));
    }

    @Test
    @DisplayName("Update Slot - HC-1: Room Conflict")
    void updateSlot_HC1_RoomConflict() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(timetableSlotRepository.existsByRoomIdAndDateAndSlotNumberAndStatusNot(any(), any(), any(), any()))
                .thenReturn(true);

        TimetableSlot conflictSlot = new TimetableSlot();
        conflictSlot.setId(99L); // Different ID
        when(timetableSlotRepository.findConflicts(any(), any(), any())).thenReturn(List.of(conflictSlot));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-1]"));
        assertTrue(exception.getMessage().contains("Phòng học đã có lịch"));
    }

    @Test
    @DisplayName("Update Slot - HC-1: Lecturer Conflict")
    void updateSlot_HC1_LecturerConflict() {
        // Arrange
        User lecturer = new User();
        lecturer.setId(10L);
        lecturer.setFullName("Lecturer A");
        classSection.setLecturer(lecturer);

        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(timetableSlotRepository.existsByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(anyLong(), any(),
                anyInt(), any()))
                .thenReturn(true);

        TimetableSlot conflictSlot = new TimetableSlot();
        conflictSlot.setId(99L);
        conflictSlot.setSlotNumber(updateRequest.getSlotNumber());
        when(timetableSlotRepository.findByLecturerIdAndDateBetween(anyLong(), any(), any()))
                .thenReturn(List.of(conflictSlot));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-1]"));
        assertTrue(exception.getMessage().contains("Giảng viên Lecturer A đã có lịch"));
    }

    @Test
    @DisplayName("Update Slot - HC-1: Student Conflict")
    void updateSlot_HC1_StudentConflict() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(timetableSlotRepository.findStudentsWithConflict(anyString(), any(), anyInt(), anyLong()))
                .thenReturn(List.of("ST001"));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-1]"));
        assertTrue(exception.getMessage().contains("sinh viên trong lớp bị trùng lịch"));
    }

    @Test
    @DisplayName("Update Slot - HC-2: Student Max Slots Per Day")
    void updateSlot_HC2_MaxSlotsPerDay() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));
        when(timetableSlotRepository.findStudentsExceedingMaxSlots(anyString(), any(), anyLong(), anyLong()))
                .thenReturn(List.of("ST002"));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-2]"));
        assertTrue(exception.getMessage().contains("vượt quá 6 tiết/ngày"));
    }

    @Test
    @DisplayName("Update Slot - HC-3: Weekly Slot Count Exceeded")
    void updateSlot_HC3_WeeklySlotLimit() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));

        SemesterConfig config = new SemesterConfig();
        config.setSlotPerSubjectPerWeek(2);
        semester.setConfig(config);

        TimetableSlot otherSlot1 = new TimetableSlot();
        otherSlot1.setId(2L);
        otherSlot1.setDate(updateRequest.getDate().minusDays(1)); // Same week
        otherSlot1.setStatus(TimetableSlot.TimetableSlotStatus.SCHEDULED);

        TimetableSlot otherSlot2 = new TimetableSlot();
        otherSlot2.setId(3L);
        otherSlot2.setDate(updateRequest.getDate().plusDays(1)); // Same week
        otherSlot2.setStatus(TimetableSlot.TimetableSlotStatus.SCHEDULED);

        // Class already has 2 slots in this week. Moving existingSlot into this week
        // makes it 3.
        when(timetableSlotRepository.findByClassName(anyString()))
                .thenReturn(List.of(existingSlot, otherSlot1, otherSlot2));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-3]"));
        assertTrue(exception.getMessage().contains("Lớp đã có đủ 2 tiết trong tuần này"));
    }

    @Test
    @DisplayName("Update Slot - HC-6: Day Gap Violation (Distance < 2)")
    void updateSlot_HC6_DayGapViolation() {
        // Arrange
        when(timetableSlotRepository.findById(1L)).thenReturn(Optional.of(existingSlot));

        TimetableSlot otherSlot = new TimetableSlot();
        otherSlot.setId(2L);
        otherSlot.setDate(updateRequest.getDate().minusDays(1)); // Distance = 1 (< 2)
        otherSlot.setStatus(TimetableSlot.TimetableSlotStatus.SCHEDULED);

        when(timetableSlotRepository.findByClassName(anyString())).thenReturn(List.of(existingSlot, otherSlot));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> timetableSlotService.updateSlot(1L, updateRequest));
        assertTrue(exception.getMessage().contains("[HC-6]"));
        assertTrue(exception.getMessage().contains("Vi phạm quy tắc cách ngày"));
    }

    @Test
    @DisplayName("Get Availability - Success")
    void getAvailability_Success() {
        // Arrange
        LocalDate targetDate = LocalDate.of(2025, 2, 3);
        when(semesterRepository.findByCode("SP25")).thenReturn(Optional.of(semester));
        when(roomRepository.findAll()).thenReturn(List.of(room));
        when(timetableSlotRepository.findBySemesterCodeAndDate(anyString(), any())).thenReturn(new ArrayList<>());

        // Act
        TimetableDTO.AvailabilityResponse result = timetableSlotService.getAvailability(targetDate, "SP25");

        // Assert
        assertNotNull(result);
        assertFalse(result.getAllRooms().isEmpty());
        // By default maxSlots=6, all rooms free, so all 6 slots available
        assertEquals(6, result.getAvailableSlots().size());
    }

    @Test
    @DisplayName("Get Availability - Holiday")
    void getAvailability_Holiday() {
        // Arrange
        LocalDate targetDate = LocalDate.of(2025, 2, 3);
        when(semesterRepository.findByCode("SP25")).thenReturn(Optional.of(semester));

        Holiday holiday = new Holiday();
        holiday.setHolidayDate(targetDate);
        semester.setHolidays(List.of(holiday));

        // Act
        TimetableDTO.AvailabilityResponse result = timetableSlotService.getAvailability(targetDate, "SP25");

        // Assert
        assertNotNull(result);
        assertTrue(result.getAvailableSlots().isEmpty());
    }
}
