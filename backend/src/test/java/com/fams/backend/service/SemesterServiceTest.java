package com.fams.backend.service;

import com.fams.backend.dto.response.SemesterResponse;
import com.fams.backend.entity.Semester;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.service.impl.SemesterServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SemesterServiceTest {

    @Mock
    private SemesterRepository semesterRepository;

    @InjectMocks
    private SemesterServiceImpl semesterService;

    private Semester activeSemester;
    private SemesterResponse semesterRequest;
    private LocalDate tomorrow;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        today = LocalDate.now();
        tomorrow = today.plusDays(1);

        activeSemester = Semester.builder()
                .id(1L)
                .code("SP26")
                .name("Spring 2026")
                .startDate(tomorrow)
                .endDate(tomorrow.plusDays(90))
                .status(Semester.SemesterStatus.UPCOMING)
                .build();

        semesterRequest = new SemesterResponse();
        semesterRequest.setCode("SP26");
        semesterRequest.setName("Spring 2026");
        semesterRequest.setStartDate(tomorrow.toString());
        semesterRequest.setEndDate(tomorrow.plusDays(90).toString());
    }

    // ============ CREATE SEMESTER TESTS ============

    @Test
    @DisplayName("Create Semester: Success")
    void createSemester_Success() {
        // Arrange - Condition: authorized, valid inputs, no duplicate
        when(semesterRepository.save(any(Semester.class))).thenReturn(activeSemester);

        // Act
        SemesterResponse result = semesterService.createSemester(semesterRequest);

        // Assert - Confirmation: DTO returned with correct code/name, status = UPCOMING
        assertNotNull(result);
        assertEquals("SP26", result.getCode());
        assertEquals("Spring 2026", result.getName());
        assertEquals("upcoming", result.getStatus());
        verify(semesterRepository).save(any(Semester.class));
    }

    @Test
    @DisplayName("Create Semester: Fail - Code is Empty/Null")
    void createSemester_CodeEmpty_Failure() {
        // Arrange - Condition: code is null
        semesterRequest.setCode(null);

        // Act & Assert - Confirmation: should throw exception
        assertThrows(RuntimeException.class, () -> semesterService.createSemester(semesterRequest));
    }

    @Test
    @DisplayName("Create Semester: Fail - Name is Empty/Null")
    void createSemester_NameEmpty_Failure() {
        // Arrange - Condition: name is null
        semesterRequest.setName(null);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> semesterService.createSemester(semesterRequest));
    }

    @Test
    @DisplayName("Create Semester: Fail - Start Date in Past")
    void createSemester_StartDateInPast_Failure() {
        // Arrange - Condition: startDate < today
        LocalDate yesterday = today.minusDays(1);
        semesterRequest.setStartDate(yesterday.toString());
        semesterRequest.setEndDate(yesterday.plusDays(30).toString());

        // Act & Assert - Confirmation: throw RuntimeException with message
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> semesterService.createSemester(semesterRequest));
        assertTrue(exception.getMessage().contains("Ngày bắt đầu học kỳ phải từ ngày hôm nay trở đi"));
    }

    @Test
    @DisplayName("Create Semester: Fail - Start Date Invalid Format")
    void createSemester_InvalidDateFormat_Failure() {
        // Arrange - Condition: invalid date format "XYZ"
        semesterRequest.setStartDate("XYZ");

        // Act & Assert - Confirmation: throw exception
        assertThrows(Exception.class, () -> semesterService.createSemester(semesterRequest));
    }

    @Test
    @DisplayName("Create Semester: Fail - End Date Invalid Format")
    void createSemester_EndDateInvalidFormat_Failure() {
        // Arrange - Condition: invalid end date format
        semesterRequest.setEndDate("INVALID");

        // Act & Assert
        assertThrows(Exception.class, () -> semesterService.createSemester(semesterRequest));
    }

    @Test
    @DisplayName("Create Semester: Fail - Duplicate Code in Database")
    void createSemester_DuplicateCode_Failure() {
        // Arrange - Condition: code exists in DB
        when(semesterRepository.save(any(Semester.class)))
                .thenThrow(new RuntimeException("Mã học kỳ đã tồn tại trong hệ thống"));

        // Act & Assert - Confirmation: throw exception with message
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> semesterService.createSemester(semesterRequest));
        assertTrue(exception.getMessage().contains("Mã học kỳ đã tồn tại trong hệ thống"));
    }

    @Test
    @DisplayName("Update Semester: Success")
    void updateSemester_Success() {
        // Arrange - Condition: semester exists, status = UPCOMING, valid dates
        when(semesterRepository.findByCode("SP26")).thenReturn(Optional.of(activeSemester));
        when(semesterRepository.save(any(Semester.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SemesterResponse updateRequest = SemesterResponse.builder()
                .code("SP26")
                .name("Spring 2026 - Updated")
                .startDate(tomorrow.toString())
                .endDate(tomorrow.plusDays(100).toString())
                .build();

        // Act
        SemesterResponse result = semesterService.updateSemester("SP26", updateRequest);

        // Assert - Confirmation: name updated, dates updated, status recalculated
        assertNotNull(result);
        assertEquals("Spring 2026 - Updated", result.getName());
        verify(semesterRepository).findByCode("SP26");
        verify(semesterRepository).save(any(Semester.class));
    }

    @Test
    @DisplayName("Update Semester: Fail - Semester Not Found")
    void updateSemester_NotFound_Failure() {
        // Arrange - Condition: semester doesn't exist
        when(semesterRepository.findByCode("NOTEXIST")).thenReturn(Optional.empty());

        // Act & Assert - Confirmation: throw RuntimeException
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> semesterService.updateSemester("NOTEXIST", semesterRequest));
        assertTrue(exception.getMessage().contains("Semester not found with code: NOTEXIST"));
    }

    @Test
    @DisplayName("Update Semester: Fail - Status is COMPLETED")
    void updateSemester_StatusCompleted_Failure() {
        // Arrange - Condition: semester status = COMPLETED (cannot update)
        Semester completedSemester = Semester.builder()
                .id(1L)
                .code("FA24")
                .name("Fall 2024")
                .status(Semester.SemesterStatus.COMPLETED)
                .build();
        when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(completedSemester));

        // Act & Assert - Confirmation: throw exception
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> semesterService.updateSemester("FA24", semesterRequest));
        assertTrue(exception.getMessage().contains("Chỉ có thể cập nhật các học kỳ sắp diễn ra hoặc đang diễn ra"));
    }

    // ============ DELETE SEMESTER TESTS ============

    @Test
    @DisplayName("Delete Semester: Success")
    void deleteSemester_Success() {
        // Arrange - Condition: semester exists with status = UPCOMING
        when(semesterRepository.findByCode("SP26")).thenReturn(Optional.of(activeSemester));
        doNothing().when(semesterRepository).delete(any(Semester.class));

        // Act
        semesterService.deleteSemester("SP26");

        // Assert - Confirmation: delete() called
        verify(semesterRepository).findByCode("SP26");
        verify(semesterRepository).delete(activeSemester);
    }

    @Test
    @DisplayName("Delete Semester: Fail - Semester Not Found")
    void deleteSemester_NotFound_Failure() {
        // Arrange - Condition: semester doesn't exist
        when(semesterRepository.findByCode("NOTEXIST")).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> semesterService.deleteSemester("NOTEXIST"));
        assertTrue(exception.getMessage().contains("Semester not found with code: NOTEXIST"));
        verify(semesterRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Delete Semester: Fail - Status is ONGOING")
    void deleteSemester_StatusOngoing_Failure() {
        // Arrange - Condition: semester status = ONGOING (cannot delete)
        Semester ongoingSemester = Semester.builder()
                .id(1L)
                .code("SP26")
                .name("Spring 2026")
                .status(Semester.SemesterStatus.ONGOING)
                .build();
        when(semesterRepository.findByCode("SP26")).thenReturn(Optional.of(ongoingSemester));

        // Act & Assert - Confirmation: throw exception, delete NOT called
        RuntimeException exception = assertThrows(RuntimeException.class, () -> semesterService.deleteSemester("SP26"));
        assertTrue(exception.getMessage().contains("Chỉ có thể xóa các học kỳ sắp diễn ra"));
        verify(semesterRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Delete Semester: Fail - Status is COMPLETED")
    void deleteSemester_StatusCompleted_Failure() {
        // Arrange - Condition: semester status = COMPLETED
        Semester completedSemester = Semester.builder()
                .id(1L)
                .code("FA24")
                .name("Fall 2024")
                .status(Semester.SemesterStatus.COMPLETED)
                .build();
        when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(completedSemester));

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> semesterService.deleteSemester("FA24"));
        assertTrue(exception.getMessage().contains("Chỉ có thể xóa các học kỳ sắp diễn ra"));
        verify(semesterRepository, never()).delete(any());
    }

    // ============ GET SEMESTER TESTS ============

    @Test
    @DisplayName("Get Semester By Id: Success")
    void getSemesterById_Success() {
        // Arrange - Condition: semester exists
        when(semesterRepository.findById(1L)).thenReturn(Optional.of(activeSemester));

        // Act
        SemesterResponse result = semesterService.getSemesterById(1L);

        // Assert - Confirmation: DTO returned with correct data
        assertNotNull(result);
        assertEquals("SP26", result.getCode());
        assertEquals("Spring 2026", result.getName());
        verify(semesterRepository).findById(1L);
    }

    @Test
    @DisplayName("Get Semester By Id: Fail - Not Found")
    void getSemesterById_NotFound_Failure() {
        // Arrange - Condition: semester doesn't exist
        when(semesterRepository.findById(999L)).thenReturn(Optional.empty());

        // Act & Assert - Confirmation: throw RuntimeException
        RuntimeException exception = assertThrows(RuntimeException.class, () -> semesterService.getSemesterById(999L));
        assertTrue(exception.getMessage().contains("Semester not found with id: 999"));
    }

    @Test
    @DisplayName("Get All Semesters: Success")
    void getAllSemesters_Success() {
        // Arrange - Condition: multiple semesters exist
        Semester semester2 = Semester.builder()
                .id(2L)
                .code("FA26")
                .name("Fall 2026")
                .startDate(tomorrow.plusDays(180))
                .endDate(tomorrow.plusDays(270))
                .status(Semester.SemesterStatus.UPCOMING)
                .build();
        when(semesterRepository.findAllOrderByStartDateDesc()).thenReturn(List.of(activeSemester, semester2));

        // Act
        List<SemesterResponse> result = semesterService.getAllSemesters();

        // Assert - Confirmation: list returned with correct size and data
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("SP26", result.get(0).getCode());
        assertEquals("FA26", result.get(1).getCode());
        verify(semesterRepository).findAllOrderByStartDateDesc();
    }

    @Test
    @DisplayName("Get All Semesters: Empty List")
    void getAllSemesters_Empty() {
        // Arrange - Condition: no semesters exist
        when(semesterRepository.findAllOrderByStartDateDesc()).thenReturn(Collections.emptyList());

        // Act
        List<SemesterResponse> result = semesterService.getAllSemesters();

        // Assert - Confirmation: empty list returned
        assertNotNull(result);
        assertEquals(0, result.size());
    }
}
