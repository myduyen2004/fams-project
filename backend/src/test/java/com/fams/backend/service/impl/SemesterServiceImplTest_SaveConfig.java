package com.fams.backend.service.impl;

import com.fams.backend.dto.request.SemesterConfigRequest;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit Test Cases for saveSemesterConfig()
 * Function Code: FE-SC-01
 * Total Test Cases: 8
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SemesterServiceImplTest_SaveConfig {

    @Mock
    private SemesterRepository semesterRepository;
    @Mock
    private SemesterConfigRepository semesterConfigRepository;
    @Mock
    private SlotTypeRepository slotTypeRepository;
    @Mock
    private HolidayRepository holidayRepository;
    @Mock
    private SemesterWeekdayRepository semesterWeekdayRepository;

    @InjectMocks
    private SemesterServiceImpl semesterService;

    private Semester semester;
    private SemesterConfigRequest validConfigRequest;

    @BeforeEach
    void setUp() {
        // Setup valid semester
        semester = new Semester();
        semester.setId(1L);
        semester.setCode("FA24");
        semester.setName("Fall 2024");
        semester.setStartDate(LocalDate.of(2024, 9, 1));
        semester.setEndDate(LocalDate.of(2024, 12, 31));
        semester.setStatus(Semester.SemesterStatus.UPCOMING);
        semester.setWeekdays(new ArrayList<>());
        semester.setSlotTypes(new ArrayList<>());
        semester.setHolidays(new ArrayList<>());

        // Setup valid config request
        validConfigRequest = SemesterConfigRequest.builder()
                .maxSlotsPerDay(5)
                .slotsPerSubjectPerWeek(2)
                .slotDuration(90)
                .isPublished(false)
                .selectedDays(List.of("MON", "TUE", "WED", "THU", "FRI"))
                .slots(List.of(
                        new SemesterConfigRequest.SlotTypeRequest("08:00", "09:30"),
                        new SemesterConfigRequest.SlotTypeRequest("09:45", "11:15"),
                        new SemesterConfigRequest.SlotTypeRequest("13:00", "14:30"),
                        new SemesterConfigRequest.SlotTypeRequest("14:45", "16:15"),
                        new SemesterConfigRequest.SlotTypeRequest("16:30", "18:00"),
                        new SemesterConfigRequest.SlotTypeRequest("18:15", "19:45")))
                .holidays(List.of(
                        new SemesterConfigRequest.HolidayRequest("2024-09-02", "Quốc Khánh")))
                .build();
    }

    @Nested
    @DisplayName("saveSemesterConfig() Tests")
    class SaveSemesterConfigTests {

        /**
         * UTCID01 - Normal: Lưu cấu hình đầy đủ với tất cả các trường hợp lệ
         * Type: Normal
         * Input: code = "FA24", full valid configRequest
         * Expected: Success, all entities saved correctly
         */
        @Test
        @DisplayName("UTCID01 (Normal): Lưu cấu hình đầy đủ với tất cả dữ liệu hợp lệ")
        void saveSemesterConfig_FullValidData_Success() {
            // Arrange
            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", validConfigRequest);

            // Assert - Verify repository calls
            verify(semesterConfigRepository).save(any(SemesterConfig.class));
            verify(semesterWeekdayRepository).deleteBySemesterId(1L);
            verify(slotTypeRepository).deleteBySemesterId(1L);
            verify(holidayRepository).deleteBySemesterId(1L);
            verify(semesterRepository).save(semester);

            // Assert - Verify entity state
            assertEquals(5, semester.getWeekdays().size());
            assertEquals(6, semester.getSlotTypes().size());
            assertEquals(1, semester.getHolidays().size());

            // Assert - Verify slot duration mapping
            for (SlotType slotType : semester.getSlotTypes()) {
                assertEquals(SlotType.SlotDuration.MINUTES_90, slotType.getDuration());
            }
        }

        /**
         * UTCID02 - Abnormal: Semester không tồn tại
         * Type: Abnormal
         * Input: code = "NOTEXIST"
         * Expected: RuntimeException with message "Semester not found with code:
         * NOTEXIST"
         */
        @Test
        @DisplayName("UTCID02 (Abnormal): Semester không tồn tại - throw RuntimeException")
        void saveSemesterConfig_SemesterNotFound_ThrowsException() {
            // Arrange
            when(semesterRepository.findByCode("NOTEXIST")).thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> semesterService.saveSemesterConfig("NOTEXIST", validConfigRequest));

            assertEquals("Semester not found with code: NOTEXIST", exception.getMessage());

            // Verify no DB changes
            verify(semesterConfigRepository, never()).save(any());
            verify(semesterRepository, never()).save(any(Semester.class));
        }

        /**
         * UTCID03 - Normal: Cập nhật cấu hình với 3 ngày học (MON, WED, FRI)
         * Type: Normal
         * Input: selectedDays = ["MON", "WED", "FRI"]
         * Expected: 3 SemesterWeekday records created with weekday = 2, 4, 6
         */
        @Test
        @DisplayName("UTCID03 (Normal): Cấu hình với 3 ngày học (MON, WED, FRI)")
        void saveSemesterConfig_PartialDays_Success() {
            // Arrange
            SemesterConfigRequest request = SemesterConfigRequest.builder()
                    .maxSlotsPerDay(5)
                    .slotsPerSubjectPerWeek(2)
                    .slotDuration(90)
                    .isPublished(false)
                    .selectedDays(List.of("MON", "WED", "FRI"))
                    .slots(List.of(
                            new SemesterConfigRequest.SlotTypeRequest("08:00", "09:30"),
                            new SemesterConfigRequest.SlotTypeRequest("09:45", "11:15")))
                    .holidays(new ArrayList<>())
                    .build();

            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", request);

            // Assert
            assertEquals(3, semester.getWeekdays().size());

            // Verify weekday mapping: MON=2, WED=4, FRI=6
            List<Integer> weekdayValues = semester.getWeekdays().stream()
                    .map(SemesterWeekday::getWeekday)
                    .sorted()
                    .toList();
            assertEquals(List.of(2, 4, 6), weekdayValues);
        }

        /**
         * UTCID04 - Normal: Cấu hình với slotDuration = 135 phút
         * Type: Normal
         * Input: slotDuration = 135
         * Expected: All SlotType.duration = MINUTES_135
         */
        @Test
        @DisplayName("UTCID04 (Normal): slotDuration = 135 → MINUTES_135")
        void saveSemesterConfig_SlotDuration135_MapsCorrectly() {
            // Arrange
            SemesterConfigRequest request = SemesterConfigRequest.builder()
                    .maxSlotsPerDay(5)
                    .slotsPerSubjectPerWeek(2)
                    .slotDuration(135) // 135 minutes
                    .isPublished(false)
                    .selectedDays(List.of("MON", "TUE", "WED"))
                    .slots(List.of(
                            new SemesterConfigRequest.SlotTypeRequest("08:00", "10:15"),
                            new SemesterConfigRequest.SlotTypeRequest("10:30", "12:45")))
                    .holidays(new ArrayList<>())
                    .build();

            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", request);

            // Assert - All slots have MINUTES_135 duration
            for (SlotType slotType : semester.getSlotTypes()) {
                assertEquals(SlotType.SlotDuration.MINUTES_135, slotType.getDuration());
            }
        }

        /**
         * UTCID05 - Boundary: maxSlotsPerDay = 1 (Minimum boundary)
         * Type: Boundary
         * Input: maxSlotsPerDay = 1
         * Expected: Config saved with maxSlotPerDay = 1
         */
        @Test
        @DisplayName("UTCID05 (Boundary): maxSlotsPerDay = 1 (Minimum)")
        void saveSemesterConfig_MinMaxSlotsPerDay_Success() {
            // Arrange
            SemesterConfigRequest request = SemesterConfigRequest.builder()
                    .maxSlotsPerDay(1) // Boundary min
                    .slotsPerSubjectPerWeek(2)
                    .slotDuration(90)
                    .isPublished(false)
                    .selectedDays(List.of("MON", "WED", "FRI"))
                    .slots(List.of(new SemesterConfigRequest.SlotTypeRequest("08:00", "09:30")))
                    .holidays(new ArrayList<>())
                    .build();

            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", request);

            // Assert
            ArgumentCaptor<SemesterConfig> configCaptor = ArgumentCaptor.forClass(SemesterConfig.class);
            verify(semesterConfigRepository).save(configCaptor.capture());
            assertEquals(1, configCaptor.getValue().getMaxSlotPerDay());
        }

        /**
         * UTCID06 - Boundary: maxSlotsPerDay = 10 (Maximum boundary)
         * Type: Boundary
         * Input: maxSlotsPerDay = 10
         * Expected: Config saved with maxSlotPerDay = 10
         */
        @Test
        @DisplayName("UTCID06 (Boundary): maxSlotsPerDay = 10 (Maximum)")
        void saveSemesterConfig_MaxMaxSlotsPerDay_Success() {
            // Arrange
            SemesterConfigRequest request = SemesterConfigRequest.builder()
                    .maxSlotsPerDay(10) // Boundary max
                    .slotsPerSubjectPerWeek(2)
                    .slotDuration(90)
                    .isPublished(false)
                    .selectedDays(List.of("MON", "WED", "FRI"))
                    .slots(List.of(new SemesterConfigRequest.SlotTypeRequest("08:00", "09:30")))
                    .holidays(new ArrayList<>())
                    .build();

            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", request);

            // Assert
            ArgumentCaptor<SemesterConfig> configCaptor = ArgumentCaptor.forClass(SemesterConfig.class);
            verify(semesterConfigRepository).save(configCaptor.capture());
            assertEquals(10, configCaptor.getValue().getMaxSlotPerDay());
        }

        /**
         * UTCID07 - Normal: Cấu hình với danh sách rỗng (no weekdays, slots, holidays)
         * Type: Normal
         * Input: selectedDays = [], slots = [], holidays = []
         * Expected: Config saved, no child entities created
         */
        @Test
        @DisplayName("UTCID07 (Normal): Danh sách rỗng - không tạo entities con")
        void saveSemesterConfig_EmptyLists_Success() {
            // Arrange
            SemesterConfigRequest request = SemesterConfigRequest.builder()
                    .maxSlotsPerDay(5)
                    .slotsPerSubjectPerWeek(2)
                    .slotDuration(90)
                    .isPublished(false)
                    .selectedDays(new ArrayList<>()) // Empty
                    .slots(new ArrayList<>()) // Empty
                    .holidays(new ArrayList<>()) // Empty
                    .build();

            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", request);

            // Assert
            verify(semesterConfigRepository).save(any(SemesterConfig.class));
            verify(semesterRepository).save(semester);

            // No child entities created
            assertTrue(semester.getWeekdays().isEmpty());
            assertTrue(semester.getSlotTypes().isEmpty());
            assertTrue(semester.getHolidays().isEmpty());
        }

        /**
         * UTCID08 - Normal: Publish cấu hình học kỳ (isPublished = true)
         * Type: Normal
         * Input: isPublished = true
         * Expected: Config saved with isPublished = true
         */
        @Test
        @DisplayName("UTCID08 (Normal): isPublished = true")
        void saveSemesterConfig_Published_Success() {
            // Arrange
            SemesterConfigRequest request = SemesterConfigRequest.builder()
                    .maxSlotsPerDay(5)
                    .slotsPerSubjectPerWeek(2)
                    .slotDuration(90)
                    .isPublished(true) // Published
                    .selectedDays(List.of("MON", "TUE", "WED", "THU", "FRI"))
                    .slots(List.of(
                            new SemesterConfigRequest.SlotTypeRequest("08:00", "09:30"),
                            new SemesterConfigRequest.SlotTypeRequest("09:45", "11:15")))
                    .holidays(List.of(new SemesterConfigRequest.HolidayRequest("2024-12-25", "Giáng Sinh")))
                    .build();

            when(semesterRepository.findByCode("FA24")).thenReturn(Optional.of(semester));
            when(semesterRepository.save(any(Semester.class))).thenReturn(semester);

            // Act
            semesterService.saveSemesterConfig("FA24", request);

            // Assert
            ArgumentCaptor<SemesterConfig> configCaptor = ArgumentCaptor.forClass(SemesterConfig.class);
            verify(semesterConfigRepository).save(configCaptor.capture());
            assertTrue(configCaptor.getValue().getIsPublished());

            // Verify all entities saved
            assertEquals(5, semester.getWeekdays().size());
            assertEquals(2, semester.getSlotTypes().size());
            assertEquals(1, semester.getHolidays().size());
        }
    }
}
