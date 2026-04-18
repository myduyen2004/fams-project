package com.fams.backend.service.impl;

import com.fams.backend.dto.attendance.AttendanceDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.ExcelExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AttendanceServiceImplTest {

    @Mock
    private AttendanceSessionRepository sessionRepository;
    @Mock
    private TimetableSlotRepository timetableSlotRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SystemLogService systemLogService;
    @Mock
    private ExcelExportService excelExportService;

    @InjectMocks
    private AttendanceServiceImpl attendanceService;

    private TimetableSlot mockSlot;
    private ClassSection mockClassSection;
    private User mockLecturer;

    @BeforeEach
    void setUp() {
        mockLecturer = new User();
        mockLecturer.setId(1L);
        mockLecturer.setFullName("Lecturer Name");

        Course mockCourse = new Course();
        mockCourse.setCode("PRJ301");
        mockCourse.setName("Java Web");

        mockClassSection = new ClassSection();
        mockClassSection.setClassName("SE1701");
        mockClassSection.setCourse(mockCourse);
        mockClassSection.setLecturer(mockLecturer);

        SlotType mockSlotType = new SlotType();
        mockSlotType.setStartTime(LocalTime.of(7, 30));
        mockSlotType.setEndTime(LocalTime.of(9, 0));

        Room mockRoom = new Room();
        mockRoom.setCode("BE-302");

        mockSlot = new TimetableSlot();
        mockSlot.setId(100L);
        mockSlot.setDate(LocalDate.of(2026, 4, 16));
        mockSlot.setClassSection(mockClassSection);
        mockSlot.setSlotType(mockSlotType);
        mockSlot.setRoom(mockRoom);
    }

    /**
     * Test getSessionBySlot - Session exists (Full flow into mapToDetailResponse)
     */
    @Test
    void testGetSessionBySlot_SessionExists() {
        AttendanceSession mockSession = new AttendanceSession();
        mockSession.setId(500L);
        mockSession.setStatus(AttendanceSession.SessionStatus.OPEN);
        mockSession.setTimetableSlot(mockSlot);
        mockSession.setLecturer(mockLecturer);

        when(sessionRepository.findByTimetableSlotId(100L)).thenReturn(Optional.of(mockSession));
        when(enrollmentRepository.findByClassSectionClassName("SE1701")).thenReturn(Collections.emptyList());

        AttendanceDTO.SessionDetailResponse response = attendanceService.getSessionBySlot(100L);

        assertNotNull(response);
        assertEquals(500L, response.getSessionId());
        assertEquals("SE1701", response.getClassName());
        verify(enrollmentRepository).findByClassSectionClassName("SE1701");
    }

    /**
     * Test getSessionBySlot - No session (Building empty response from slot)
     */
    @Test
    void testGetSessionBySlot_NoSession() {
        when(sessionRepository.findByTimetableSlotId(100L)).thenReturn(Optional.empty());
        when(timetableSlotRepository.findById(100L)).thenReturn(Optional.of(mockSlot));
        when(enrollmentRepository.findByClassSectionClassName("SE1701")).thenReturn(Collections.emptyList());

        AttendanceDTO.SessionDetailResponse response = attendanceService.getSessionBySlot(100L);

        assertNotNull(response);
        assertEquals(0L, response.getSessionId());
        assertEquals("SE1701", response.getClassName());
    }

    /**
     * Test getSessionBySlot - Session is CLOSED
     */
    @Test
    void testGetSessionBySlot_SessionClosed() {
        AttendanceSession mockSession = new AttendanceSession();
        mockSession.setId(500L);
        mockSession.setStatus(AttendanceSession.SessionStatus.CLOSED);
        mockSession.setTimetableSlot(mockSlot);
        mockSession.setLecturer(mockLecturer);

        when(sessionRepository.findByTimetableSlotId(100L)).thenReturn(Optional.of(mockSession));
        when(enrollmentRepository.findByClassSectionClassName("SE1701")).thenReturn(Collections.emptyList());

        AttendanceDTO.SessionDetailResponse response = attendanceService.getSessionBySlot(100L);

        assertEquals("CLOSED", response.getStatus());
    }

    /**
     * Test getSessionBySlot - No session, Slot in future
     */
    @Test
    void testGetSessionBySlot_NoSessionFuture() {
        // Mock slot in the future (relative to the server)
        mockSlot.setDate(LocalDate.now().plusDays(1));
        
        when(sessionRepository.findByTimetableSlotId(100L)).thenReturn(Optional.empty());
        when(timetableSlotRepository.findById(100L)).thenReturn(Optional.of(mockSlot));
        when(enrollmentRepository.findByClassSectionClassName("SE1701")).thenReturn(Collections.emptyList());

        AttendanceDTO.SessionDetailResponse response = attendanceService.getSessionBySlot(100L);

        assertEquals("NO_SESSION", response.getStatus());
    }

    /**
     * Test getSessionBySlot - Enrollment mapping and sorting
     */
    @Test
    void testGetSessionBySlot_WithEnrollments() {
        User studentA = new User();
        studentA.setId(10L);
        studentA.setFullName("Alpha Student");
        
        User studentB = new User();
        studentB.setId(11L);
        studentB.setFullName("Beta Student");

        Enrollment eA = new Enrollment(); eA.setStudent(studentA);
        Enrollment eB = new Enrollment(); eB.setStudent(studentB);

        when(sessionRepository.findByTimetableSlotId(100L)).thenReturn(Optional.empty());
        when(timetableSlotRepository.findById(100L)).thenReturn(Optional.of(mockSlot));
        // Return unsorted list to test sorting
        when(enrollmentRepository.findByClassSectionClassName("SE1701")).thenReturn(Arrays.asList(eB, eA));

        AttendanceDTO.SessionDetailResponse response = attendanceService.getSessionBySlot(100L);

        assertEquals(2, response.getStudents().size());
        assertEquals("Alpha Student", response.getStudents().get(0).getFullName());
        assertEquals("Beta Student", response.getStudents().get(1).getFullName());
    }

    /**
     * Test getSessionDetail - Success
     */
    @Test
    void testGetSessionDetail_Success() {
        AttendanceSession mockSession = new AttendanceSession();
        mockSession.setId(500L);
        mockSession.setStatus(AttendanceSession.SessionStatus.OPEN);
        mockSession.setTimetableSlot(mockSlot);
        mockSession.setLecturer(mockLecturer);

        when(sessionRepository.findById(500L)).thenReturn(Optional.of(mockSession));
        when(enrollmentRepository.findByClassSectionClassName("SE1701")).thenReturn(Collections.emptyList());

        AttendanceDTO.SessionDetailResponse response = attendanceService.getSessionDetail(500L);

        assertEquals(500L, response.getSessionId());
    }

    /**
     * Test getSessionDetail - NotFound
     */
    @Test
    void testGetSessionDetail_NotFound() {
        when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> {
            attendanceService.getSessionDetail(999L);
        });
    }
}
