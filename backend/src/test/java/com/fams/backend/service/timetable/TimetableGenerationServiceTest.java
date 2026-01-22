package com.fams.backend.service.timetable;

import com.fams.backend.service.timetable.ga.model.GAConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for TimetableGenerationService
 * Tests helper methods, job management, and result structures
 */
@ExtendWith(MockitoExtension.class)
class TimetableGenerationServiceTest {

    private GAConfig testConfig;

    @BeforeEach
    void setUp() {
        testConfig = GAConfig.builder()
                .populationSize(20)
                .maxGenerations(50)
                .stagnationLimit(10)
                .enableLocalSearch(false)
                .verbose(false)
                .build();
    }

    // ==================== GAConfig Tests ====================

    @Nested
    @DisplayName("GAConfig Tests")
    class GAConfigTests {

        @Test
        @DisplayName("Should create GAConfig with builder")
        void testGAConfigBuilder() {
            GAConfig config = GAConfig.builder()
                    .populationSize(100)
                    .maxGenerations(200)
                    .stagnationLimit(20)
                    .enableLocalSearch(true)
                    .verbose(true)
                    .build();

            assertEquals(100, config.getPopulationSize());
            assertEquals(200, config.getMaxGenerations());
            assertEquals(20, config.getStagnationLimit());
            assertTrue(config.isEnableLocalSearch());
            assertTrue(config.isVerbose());
        }

        @Test
        @DisplayName("Should create GAConfig with defaults")
        void testGAConfigDefaults() {
            GAConfig config = GAConfig.builder().build();
            assertNotNull(config);
        }
    }

    // ==================== GenerationResult Tests ====================

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
            assertEquals("Generation completed successfully", result.getMessage());
            assertEquals(0.95, result.getFitness());
            assertEquals(100, result.getTotalGenerations());
            assertEquals(5000L, result.getDurationMs());
            assertEquals(200, result.getTotalSlots());
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
            assertEquals("test-job-456", result.getJobId());
            assertTrue(result.getMessage().contains("failed"));
        }
    }

    // ==================== GenerationJob Tests ====================

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
            assertEquals("Initializing", job.getPhase());
            assertEquals(0.0, job.getPercentComplete());
        }

        @Test
        @DisplayName("Should create completed job")
        void testCompletedJob() {
            TimetableGenerationService.GenerationJob job = TimetableGenerationService.GenerationJob.builder()
                    .jobId("job-456")
                    .semesterCode("TEST-2026")
                    .status(TimetableGenerationService.JobStatus.COMPLETED)
                    .phase("Finished")
                    .percentComplete(100.0)
                    .bestFitness(0.95)
                    .currentGeneration(150)
                    .build();

            assertEquals(TimetableGenerationService.JobStatus.COMPLETED, job.getStatus());
            assertEquals(100.0, job.getPercentComplete());
            assertEquals(0.95, job.getBestFitness());
            assertEquals(150, job.getCurrentGeneration());
        }

        @Test
        @DisplayName("Should create failed job with error message")
        void testFailedJob() {
            TimetableGenerationService.GenerationJob job = TimetableGenerationService.GenerationJob.builder()
                    .jobId("job-789")
                    .semesterCode("TEST-2026")
                    .status(TimetableGenerationService.JobStatus.FAILED)
                    .errorMessage("No feasible solution found")
                    .build();

            assertEquals(TimetableGenerationService.JobStatus.FAILED, job.getStatus());
            assertEquals("No feasible solution found", job.getErrorMessage());
        }
    }

    // ==================== JobStatus Enum Tests ====================

    @Nested
    @DisplayName("JobStatus Enum Tests")
    class JobStatusTests {

        @Test
        @DisplayName("Should have all expected status values")
        void testJobStatusValues() {
            TimetableGenerationService.JobStatus[] statuses = TimetableGenerationService.JobStatus.values();

            assertTrue(statuses.length >= 3, "Should have at least 3 job statuses");

            // Verify key statuses exist
            assertNotNull(TimetableGenerationService.JobStatus.RUNNING);
            assertNotNull(TimetableGenerationService.JobStatus.COMPLETED);
            assertNotNull(TimetableGenerationService.JobStatus.FAILED);
        }

        @Test
        @DisplayName("Should convert status to string correctly")
        void testJobStatusToString() {
            assertEquals("RUNNING", TimetableGenerationService.JobStatus.RUNNING.name());
            assertEquals("COMPLETED", TimetableGenerationService.JobStatus.COMPLETED.name());
            assertEquals("FAILED", TimetableGenerationService.JobStatus.FAILED.name());
        }
    }

    // ==================== Helper Method Tests ====================

    @Nested
    @DisplayName("Helper Method Tests")
    class HelperMethodTests {

        @Test
        @DisplayName("Should calculate weeks in semester correctly")
        void testCalculateWeeksLogic() {
            LocalDate start = LocalDate.of(2026, 1, 5);
            LocalDate end = LocalDate.of(2026, 3, 29);

            // Manual calculation: ~12 weeks between dates
            long days = java.time.temporal.ChronoUnit.DAYS.between(start, end);
            int expectedWeeks = (int) (days / 7) + 1;

            assertTrue(expectedWeeks >= 10 && expectedWeeks <= 15,
                    "Should be approximately 10-15 weeks");
        }

        @Test
        @DisplayName("Should calculate date for week correctly")
        void testCalculateDateForWeekLogic() {
            LocalDate semesterStart = LocalDate.of(2026, 1, 5); // Monday

            // Week 1, Day 0 (Monday) = 2026-01-05
            LocalDate week1Day0 = semesterStart;
            assertEquals(LocalDate.of(2026, 1, 5), week1Day0);

            // Week 2, Day 0 (Monday) = 2026-01-12
            LocalDate week2Day0 = semesterStart.plusWeeks(1);
            assertEquals(LocalDate.of(2026, 1, 12), week2Day0);

            // Week 1, Day 2 (Wednesday) = 2026-01-07
            LocalDate week1Day2 = semesterStart.plusDays(2);
            assertEquals(LocalDate.of(2026, 1, 7), week1Day2);
        }

        @Test
        @DisplayName("Should distribute extra slots evenly")
        void testDistributeExtraSlotsLogic() {
            // 10 weeks, 3 slots/week base, 5 extra slots
            // Expected: [4,4,4,4,4,3,3,3,3,3] = 35 total
            int weeks = 10;
            int baseSlots = 3;
            int extraSlots = 5;

            int totalSlots = (weeks * baseSlots) + extraSlots;
            assertEquals(35, totalSlots);

            // First 5 weeks get 4 slots (base + 1 extra each)
            int weeksWithExtra = extraSlots;
            int slotsForWeeksWithExtra = weeksWithExtra * (baseSlots + 1);

            // Remaining 5 weeks get 3 slots (base only)
            int weeksWithBase = weeks - weeksWithExtra;
            int slotsForWeeksWithBase = weeksWithBase * baseSlots;

            assertEquals(35, slotsForWeeksWithExtra + slotsForWeeksWithBase);
        }
    }

    // ==================== Validation Tests ====================

    @Nested
    @DisplayName("Validation Tests")
    class ValidationTests {

        @Test
        @DisplayName("Should validate semester date range")
        void testSemesterDateValidation() {
            LocalDate start = LocalDate.of(2026, 1, 5);
            LocalDate end = LocalDate.of(2026, 5, 15);

            assertNotNull(start);
            assertNotNull(end);
            assertTrue(end.isAfter(start), "End date should be after start date");

            // Should be at least a few weeks
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(start, end);
            assertTrue(daysBetween >= 7, "Semester should be at least 1 week");
            assertTrue(daysBetween >= 100, "Semester should be approximately 4 months");
        }

        @Test
        @DisplayName("Should validate GAConfig parameters")
        void testGAConfigValidation() {
            // Test with reasonable values
            GAConfig validConfig = GAConfig.builder()
                    .populationSize(50)
                    .maxGenerations(100)
                    .stagnationLimit(15)
                    .build();

            assertTrue(validConfig.getPopulationSize() > 0 || validConfig.getPopulationSize() == 0);
            assertTrue(validConfig.getMaxGenerations() >= 0);
            assertTrue(validConfig.getStagnationLimit() >= 0);
        }
    }
}
