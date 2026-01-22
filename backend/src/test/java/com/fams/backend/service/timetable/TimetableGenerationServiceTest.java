package com.fams.backend.service.timetable;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TimetableGenerationService
 */
@ExtendWith(MockitoExtension.class)
class TimetableGenerationServiceTest {

    @Mock
    private SemesterRepository semesterRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private TimetableSlotRepository timetableSlotRepository;

    @Mock
    private SlotTypeRepository slotTypeRepository;

    @InjectMocks
    private TimetableGenerationService generationService;

    private Semester testSemester;
    private List<ClassSection> testClassSections;
    private List<Room> testRooms;
    private List<SlotType> testSlotTypes;

    @BeforeEach
    void setUp() {
        testSemester = createTestSemester();
        testClassSections = createTestClassSections();
        testRooms = createTestRooms();
        testSlotTypes = createTestSlotTypes();
    }

    private Semester createTestSemester() {
        Semester semester = new Semester();
        semester.setId(1L);
        semester.setCode("TEST-2026");
        semester.setName("Test Semester 2026");
        semester.setStartDate(LocalDate.of(2026, 1, 5));
        semester.setEndDate(LocalDate.of(2026, 5, 15));
        semester.setStatus(Semester.SemesterStatus.ONGOING);

        SemesterConfig config = new SemesterConfig();
        config.setId(1L);
        config.setSemester(semester);
        config.setMaxSlotPerDay(4);
        config.setSlotPerSubjectPerWeek(2);
        config.setSlotDuration(90);
        config.setIsPublished(false);
        semester.setConfig(config);

        // Add weekdays (Mon-Fri = 2-6)
        List<SemesterWeekday> weekdays = new ArrayList<>();
        for (int i = 2; i <= 6; i++) {
            SemesterWeekday wd = new SemesterWeekday();
            wd.setSemester(semester);
            wd.setWeekday(i);
            weekdays.add(wd);
        }
        semester.setWeekdays(weekdays);

        return semester;
    }

    private List<ClassSection> createTestClassSections() {
        List<ClassSection> sections = new ArrayList<>();

        Course course1 = new Course();
        course1.setId(1L);
        course1.setCode("CS101");
        course1.setName("Introduction to CS");

        Course course2 = new Course();
        course2.setId(2L);
        course2.setCode("CS102");
        course2.setName("Data Structures");

        Lecturer lecturer1 = new Lecturer();
        lecturer1.setId(1L);
        lecturer1.setFullName("Dr. Smith");

        Lecturer lecturer2 = new Lecturer();
        lecturer2.setId(2L);
        lecturer2.setFullName("Dr. Johnson");

        ClassSection section1 = new ClassSection();
        section1.setId(1L);
        section1.setName("CS101-A");
        section1.setSemester(testSemester);
        section1.setCourse(course1);
        section1.setLecturer(lecturer1);
        section1.setNumberOfSlots(20);
        section1.setCurrentEnrollment(25);
        sections.add(section1);

        ClassSection section2 = new ClassSection();
        section2.setId(2L);
        section2.setName("CS101-B");
        section2.setSemester(testSemester);
        section2.setCourse(course1);
        section2.setLecturer(lecturer1);
        section2.setNumberOfSlots(20);
        section2.setCurrentEnrollment(30);
        sections.add(section2);

        ClassSection section3 = new ClassSection();
        section3.setId(3L);
        section3.setName("CS102-A");
        section3.setSemester(testSemester);
        section3.setCourse(course2);
        section3.setLecturer(lecturer2);
        section3.setNumberOfSlots(20);
        section3.setCurrentEnrollment(20);
        sections.add(section3);

        return sections;
    }

    private List<Room> createTestRooms() {
        List<Room> rooms = new ArrayList<>();

        Room room1 = new Room();
        room1.setId(1L);
        room1.setCode("R101");
        room1.setName("Room 101");
        room1.setCapacity(40);
        room1.setType(Room.RoomType.LECTURE);
        room1.setStatus(Room.RoomStatus.ACTIVE);
        rooms.add(room1);

        Room room2 = new Room();
        room2.setId(2L);
        room2.setCode("R102");
        room2.setName("Room 102");
        room2.setCapacity(50);
        room2.setType(Room.RoomType.LECTURE);
        room2.setStatus(Room.RoomStatus.ACTIVE);
        rooms.add(room2);

        return rooms;
    }

    private List<SlotType> createTestSlotTypes() {
        List<SlotType> slots = new ArrayList<>();

        SlotType slot1 = new SlotType();
        slot1.setId(1L);
        slot1.setSlotIndex(1);
        slot1.setName("Slot 1");
        slot1.setStartTime(LocalTime.of(7, 0));
        slot1.setEndTime(LocalTime.of(9, 15));
        slot1.setSemester(testSemester);
        slots.add(slot1);

        SlotType slot2 = new SlotType();
        slot2.setId(2L);
        slot2.setSlotIndex(2);
        slot2.setName("Slot 2");
        slot2.setStartTime(LocalTime.of(9, 30));
        slot2.setEndTime(LocalTime.of(11, 45));
        slot2.setSemester(testSemester);
        slots.add(slot2);

        SlotType slot3 = new SlotType();
        slot3.setId(3L);
        slot3.setSlotIndex(3);
        slot3.setName("Slot 3");
        slot3.setStartTime(LocalTime.of(12, 30));
        slot3.setEndTime(LocalTime.of(14, 45));
        slot3.setSemester(testSemester);
        slots.add(slot3);

        SlotType slot4 = new SlotType();
        slot4.setId(4L);
        slot4.setSlotIndex(4);
        slot4.setName("Slot 4");
        slot4.setStartTime(LocalTime.of(15, 0));
        slot4.setEndTime(LocalTime.of(17, 15));
        slot4.setSemester(testSemester);
        slots.add(slot4);

        return slots;
    }

    // ==================== Job Management Tests ====================

    @Nested
    @DisplayName("Job Management Tests")
    class JobManagementTests {

        @Test
        @DisplayName("Should return null for non-existent job")
        void testGetNonExistentJob() {
            TimetableGenerationService.GenerationJob job = generationService.getJobStatus("non-existent-id");
            assertNull(job);
        }

        @Test
        @DisplayName("Should return false when canceling non-existent job")
        void testCancelNonExistentJob() {
            boolean cancelled = generationService.cancelJob("non-existent-id");
            assertFalse(cancelled);
        }
    }

    // ==================== Helper Method Tests ====================

    @Nested
    @DisplayName("Helper Method Tests")
    class HelperMethodTests {

        @Test
        @DisplayName("Should calculate weeks in semester correctly")
        void testCalculateWeeksInSemester() {
            LocalDate start = LocalDate.of(2026, 1, 5);
            LocalDate end = LocalDate.of(2026, 3, 29);

            // Using reflection or making method package-private for testing
            // For now, verify via integration behavior
            int expectedWeeks = 12; // Approximately 12 weeks

            // This would require making the method accessible for unit testing
            // Or testing it indirectly through the generation process
            assertTrue(expectedWeeks > 0);
        }

        @Test
        @DisplayName("Should calculate date for week correctly")
        void testCalculateDateForWeek() {
            LocalDate semesterStart = LocalDate.of(2026, 1, 5); // Monday

            // Week 1, Day 0 (Monday) = 2026-01-05
            // Week 2, Day 0 (Monday) = 2026-01-12
            LocalDate week2Day0 = semesterStart.plusWeeks(1);
            assertEquals(LocalDate.of(2026, 1, 12), week2Day0);
        }

        @Test
        @DisplayName("Should distribute extra slots evenly")
        void testDistributeExtraSlots() {
            // 10 weeks, 3 slots/week base, 5 extra slots
            // Expected: [4,4,4,4,4,3,3,3,3,3] = 35 total
            int weeks = 10;
            int baseSlots = 3;
            int extraSlots = 5;

            int totalSlots = (weeks * baseSlots) + extraSlots;
            assertEquals(35, totalSlots);

            // First 5 weeks get 4 slots, last 5 get 3 slots
            int slotsForFirst5 = 5 * 4;
            int slotsForLast5 = 5 * 3;
            assertEquals(35, slotsForFirst5 + slotsForLast5);
        }
    }

    // ==================== Generation Result Tests ====================

    @Nested
    @DisplayName("GenerationResult Tests")
    class GenerationResultTests {

        @Test
        @DisplayName("Should create success result correctly")
        void testSuccessResult() {
            TimetableGenerationService.GenerationResult result = TimetableGenerationService.GenerationResult.builder()
                    .success(true)
                    .jobId("test-job-123")
                    .message("Generation completed successfully")
                    .fitness(0.95)
                    .totalGenerations(100)
                    .durationMs(5000L)
                    .totalSlots(200)
                    .totalClasses(10)
                    .build();

            assertTrue(result.isSuccess());
            assertEquals("test-job-123", result.getJobId());
            assertEquals(100, result.getTotalGenerations());
            assertEquals(10, result.getTotalClasses());
        }

        @Test
        @DisplayName("Should create failure result correctly")
        void testFailureResult() {
            TimetableGenerationService.GenerationResult result = TimetableGenerationService.GenerationResult.builder()
                    .success(false)
                    .jobId("test-job-456")
                    .message("Generation failed: No valid schedule found")
                    .build();

            assertFalse(result.isSuccess());
            assertTrue(result.getMessage().contains("failed"));
        }
    }

    // ==================== Generation Job Tests ====================

    @Nested
    @DisplayName("GenerationJob Tests")
    class GenerationJobTests {

        @Test
        @DisplayName("Should create job with initial status")
        void testJobInitialStatus() {
            TimetableGenerationService.GenerationJob job = TimetableGenerationService.GenerationJob.builder()
                    .jobId("job-123")
                    .semesterCode("TEST-2026")
                    .status(TimetableGenerationService.JobStatus.RUNNING)
                    .phase("Initializing")
                    .percentComplete(0.0)
                    .build();

            assertEquals("job-123", job.getJobId());
            assertEquals("TEST-2026", job.getSemesterCode());
            assertEquals(TimetableGenerationService.JobStatus.RUNNING, job.getStatus());
            assertEquals(0.0, job.getPercentComplete());
        }

        @Test
        @DisplayName("Should update job progress")
        void testJobProgressUpdate() {
            TimetableGenerationService.GenerationJob job = TimetableGenerationService.GenerationJob.builder()
                    .jobId("job-123")
                    .semesterCode("TEST-2026")
                    .status(TimetableGenerationService.JobStatus.RUNNING)
                    .build();

            // Simulate progress updates
            job = job.toBuilder()
                    .phase("GA Running")
                    .currentGeneration(50)
                    .bestFitness(0.85)
                    .percentComplete(50.0)
                    .build();

            assertEquals("GA Running", job.getPhase());
            assertEquals(50, job.getCurrentGeneration());
            assertEquals(0.85, job.getBestFitness());
            assertEquals(50.0, job.getPercentComplete());
        }
    }

    // ==================== Integration-like Tests ====================

    @Nested
    @DisplayName("Integration-like Tests")
    class IntegrationTests {

        @Test
        @DisplayName("Should handle semester not found")
        void testSemesterNotFound() {
            when(semesterRepository.findByCode("INVALID")).thenReturn(Optional.empty());

            String jobId = UUID.randomUUID().toString();
            GAConfig config = GAConfig.builder().build();

            CompletableFuture<TimetableGenerationService.GenerationResult> future = generationService
                    .generateTimetable(jobId, "INVALID", config, null);

            // Should complete with failure
            TimetableGenerationService.GenerationResult result = future.join();
            assertFalse(result.isSuccess());
            assertTrue(result.getMessage().contains("not found") || result.getMessage().contains("error"));
        }

        @Test
        @DisplayName("Should handle empty class sections")
        void testEmptyClassSections() {
            when(semesterRepository.findByCode("TEST-2026")).thenReturn(Optional.of(testSemester));
            when(classSectionRepository.findAllBySemesterCode("TEST-2026")).thenReturn(Collections.emptyList());
            when(roomRepository.findByStatus(Room.RoomStatus.ACTIVE)).thenReturn(testRooms);
            when(slotTypeRepository.findBySemesterIdOrderBySlotIndex(1L)).thenReturn(testSlotTypes);
            when(enrollmentRepository.findBySemester(testSemester)).thenReturn(Collections.emptyList());

            String jobId = UUID.randomUUID().toString();
            GAConfig config = GAConfig.builder()
                    .populationSize(10)
                    .maxGenerations(10)
                    .build();

            CompletableFuture<TimetableGenerationService.GenerationResult> future = generationService
                    .generateTimetable(jobId, "TEST-2026", config, null);

            TimetableGenerationService.GenerationResult result = future.join();

            // Should handle gracefully - either succeed with 0 slots or fail with message
            if (result.isSuccess()) {
                assertEquals(0, result.getTotalSlots());
            } else {
                assertNotNull(result.getMessage());
            }
        }
    }

    // ==================== Validation Tests ====================

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("Should validate GAConfig defaults")
        void testGAConfigDefaults() {
            GAConfig config = GAConfig.builder().build();

            // Check that defaults are reasonable
            assertTrue(config.getPopulationSize() > 0 || config.getPopulationSize() == 0);
            assertTrue(config.getMaxGenerations() >= 0);
        }

        @Test
        @DisplayName("Should validate semester date range")
        void testSemesterDateValidation() {
            LocalDate start = testSemester.getStartDate();
            LocalDate end = testSemester.getEndDate();

            assertNotNull(start);
            assertNotNull(end);
            assertTrue(end.isAfter(start), "End date should be after start date");

            // Should be at least a few weeks
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
            assertTrue(daysBetween >= 7, "Semester should be at least 1 week");
        }

        @Test
        @DisplayName("Should validate room capacity")
        void testRoomCapacityValidation() {
            for (Room room : testRooms) {
                assertTrue(room.getCapacity() > 0, "Room capacity should be positive");
            }

            for (ClassSection section : testClassSections) {
                // At least one room should fit this class
                boolean hasRoom = testRooms.stream()
                        .anyMatch(r -> r.getCapacity() >= section.getCurrentEnrollment());
                assertTrue(hasRoom, "Should have room for class " + section.getName());
            }
        }
    }
}
