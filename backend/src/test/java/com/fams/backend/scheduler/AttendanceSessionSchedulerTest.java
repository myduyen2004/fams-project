package com.fams.backend.scheduler;

import com.fams.backend.entity.*;
import com.fams.backend.repository.AttendanceSessionRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceSessionSchedulerTest {

    @Mock
    private TimetableSlotRepository timetableSlotRepository;

    @Mock
    private AttendanceSessionRepository sessionRepository;

    @InjectMocks
    private AttendanceSessionScheduler attendanceSessionScheduler;

    private TimetableSlot mockSlot;

    @BeforeEach
    void setUp() {
        User lecturer = User.builder().id(1L).fullName("Test Lecturer").build();
        ClassSection classSection = ClassSection.builder()
                .className("CS101")
                .lecturer(lecturer)
                .build();
        Room room = Room.builder().id(1L).code("R101").build();

        mockSlot = TimetableSlot.builder()
                .id(1L)
                .classSection(classSection)
                .room(room)
                .status(TimetableSlot.TimetableSlotStatus.SCHEDULED)
                .build();
    }

    @Test
    void autoCreateSessions_WhenSlotsFound_ShouldCreateSessions() {
        // Arrange
        when(timetableSlotRepository.findSlotsNeedingSession(any(LocalDate.class), any(LocalTime.class)))
                .thenReturn(List.of(mockSlot));

        // Act
        attendanceSessionScheduler.autoCreateSessions();

        // Assert
        verify(sessionRepository, times(1)).save(any(AttendanceSession.class));
    }

    @Test
    void autoCreateSessions_WhenNoSlotsFound_ShouldDoNothing() {
        // Arrange
        when(timetableSlotRepository.findSlotsNeedingSession(any(LocalDate.class), any(LocalTime.class)))
                .thenReturn(Collections.emptyList());

        // Act
        attendanceSessionScheduler.autoCreateSessions();

        // Assert
        verify(sessionRepository, never()).save(any(AttendanceSession.class));
    }
}
