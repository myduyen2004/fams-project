package com.fams.backend.service.timetable.ga;

import com.fams.backend.service.timetable.ga.core.GeneticAlgorithm;
import com.fams.backend.service.timetable.ga.core.PopulationInitializer;
import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
import com.fams.backend.service.timetable.ga.datastructure.SlotMask;
import com.fams.backend.service.timetable.ga.fitness.FitnessEvaluator;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for Genetic Algorithm Timetable Generation
 */
class GeneticAlgorithmTest {

    private TimetableData testData;
    private GAConfig testConfig;

    @BeforeEach
    void setUp() {
        testData = createTestData();
        testConfig = GAConfig.builder()
                .populationSize(20)
                .maxGenerations(50)
                .stagnationLimit(10)
                .enableLocalSearch(false)
                .verbose(false)
                .build();
    }

    /**
     * Create simple test data
     */
    private TimetableData createTestData() {
        TimetableData.TimetableDataBuilder builder = TimetableData.builder();

        // Basic config
        builder.semesterCode("TEST01")
                .semesterStartDate(LocalDate.of(2026, 1, 5))
                .semesterEndDate(LocalDate.of(2026, 5, 15))
                .maxSlotPerDay(4)
                .slotPerSubjectPerWeek(2)
                .periodsPerDay(6)
                .daysPerWeek(6);

        // Valid weekdays (Mon-Sat = 0-5)
        Set<Integer> validWeekdays = new HashSet<>(Arrays.asList(0, 1, 2, 3, 4, 5));
        builder.validWeekdays(validWeekdays);

        // Valid slot indices
        Set<Integer> validSlots = new HashSet<>();
        for (int day = 0; day < 6; day++) {
            for (int period = 0; period < 6; period++) {
                validSlots.add(day * 6 + period);
            }
        }
        builder.validSlotIndices(validSlots);

        // Create 3 classes
        List<TimetableData.ClassInfo> classes = new ArrayList<>();
        classes.add(TimetableData.ClassInfo.builder()
                .className("CLASS-A")
                .courseCode("CS101")
                .courseName("Intro to CS")
                .lecturerId(1L)
                .slotsPerWeek(2)
                .currentEnrollment(25)
                .build());
        classes.add(TimetableData.ClassInfo.builder()
                .className("CLASS-B")
                .courseCode("CS102")
                .courseName("Data Structures")
                .lecturerId(1L)
                .slotsPerWeek(2)
                .currentEnrollment(20)
                .build());
        classes.add(TimetableData.ClassInfo.builder()
                .className("CLASS-C")
                .courseCode("CS103")
                .courseName("Algorithms")
                .lecturerId(2L)
                .slotsPerWeek(2)
                .currentEnrollment(30)
                .build());
        builder.classes(classes);

        // Student enrollments
        Map<Long, Set<String>> studentEnrollments = new HashMap<>();
        studentEnrollments.put(1L, new HashSet<>(Arrays.asList("CLASS-A", "CLASS-B")));
        studentEnrollments.put(2L, new HashSet<>(Arrays.asList("CLASS-A", "CLASS-C")));
        studentEnrollments.put(3L, new HashSet<>(Arrays.asList("CLASS-B", "CLASS-C")));
        builder.studentEnrollments(studentEnrollments);

        // Class students
        Map<String, Set<Long>> classStudents = new HashMap<>();
        classStudents.put("CLASS-A", new HashSet<>(Arrays.asList(1L, 2L)));
        classStudents.put("CLASS-B", new HashSet<>(Arrays.asList(1L, 3L)));
        classStudents.put("CLASS-C", new HashSet<>(Arrays.asList(2L, 3L)));
        builder.classStudents(classStudents);

        // Lecturer assignments
        Map<String, Long> classLecturer = new HashMap<>();
        classLecturer.put("CLASS-A", 1L);
        classLecturer.put("CLASS-B", 1L);
        classLecturer.put("CLASS-C", 2L);
        builder.classLecturer(classLecturer);

        Map<Long, Set<String>> lecturerClasses = new HashMap<>();
        lecturerClasses.put(1L, new HashSet<>(Arrays.asList("CLASS-A", "CLASS-B")));
        lecturerClasses.put(2L, new HashSet<>(Collections.singletonList("CLASS-C")));
        builder.lecturerClasses(lecturerClasses);

        // Rooms
        List<TimetableData.RoomInfo> rooms = new ArrayList<>();
        rooms.add(TimetableData.RoomInfo.builder()
                .id(1L).code("R101").name("Room 101").capacity(40).type("LECTURE").build());
        rooms.add(TimetableData.RoomInfo.builder()
                .id(2L).code("R102").name("Room 102").capacity(30).type("LECTURE").build());
        builder.rooms(rooms);

        return builder.build();
    }

    // ==================== SlotMask Tests ====================

    @Nested
    @DisplayName("SlotMask Tests")
    class SlotMaskTests {

        @Test
        @DisplayName("Should correctly track occupied slots")
        void testOccupyAndRelease() {
            SlotMask mask = new SlotMask(36);

            mask.occupy(0);
            mask.occupy(5);
            mask.occupy(10);

            assertTrue(mask.isOccupied(0));
            assertTrue(mask.isOccupied(5));
            assertTrue(mask.isOccupied(10));
            assertFalse(mask.isOccupied(1));

            assertEquals(3, mask.countOccupied());

            mask.release(5);
            assertFalse(mask.isOccupied(5));
            assertEquals(2, mask.countOccupied());
        }

        @Test
        @DisplayName("Should detect conflicts between masks")
        void testConflictDetection() {
            SlotMask mask1 = new SlotMask(36);
            SlotMask mask2 = new SlotMask(36);

            mask1.occupy(0);
            mask1.occupy(5);

            mask2.occupy(3);
            mask2.occupy(5); // Conflict

            assertTrue(mask1.hasConflict(mask2));
        }

        @Test
        @DisplayName("Should count slots in specific day")
        void testCountInDay() {
            SlotMask mask = new SlotMask(36);

            // Day 0: slots 0-5
            mask.occupy(0);
            mask.occupy(2);
            mask.occupy(4);

            // Day 1: slots 6-11
            mask.occupy(7);

            assertEquals(3, mask.countOccupiedInDay(0, 6));
            assertEquals(1, mask.countOccupiedInDay(1, 6));
            assertEquals(0, mask.countOccupiedInDay(2, 6));
        }
    }

    // ==================== ScheduleState Tests ====================

    @Nested
    @DisplayName("ScheduleState Tests")
    class ScheduleStateTests {

        @Test
        @DisplayName("Should enforce hard constraints on slot assignment")
        void testConstraintEnforcement() {
            ScheduleState state = new ScheduleState(testData);

            // Should be able to assign valid slot
            assertTrue(state.canAssignSlot("CLASS-A", 0));
            state.assignSlot("CLASS-A", 0);

            // Same class, same slot - should fail
            assertFalse(state.canAssignSlot("CLASS-A", 0));

            // CLASS-B has same lecturer (1L) - should conflict at same slot
            assertFalse(state.canAssignSlot("CLASS-B", 0));

            // Different slot should work
            assertTrue(state.canAssignSlot("CLASS-B", 1));
        }

        @Test
        @DisplayName("Should track student conflicts correctly")
        void testStudentConflicts() {
            ScheduleState state = new ScheduleState(testData);

            // Assign CLASS-A to slot 0
            state.assignSlot("CLASS-A", 0);

            // Student 1 is in both CLASS-A and CLASS-B
            // CLASS-B at slot 0 should conflict
            assertFalse(state.canAssignSlot("CLASS-B", 0));

            // CLASS-C (different students) should be OK at slot 0
            // Actually CLASS-C has student 2 who is also in CLASS-A, so it will conflict
            assertFalse(state.canAssignSlot("CLASS-C", 0));
        }

        @Test
        @DisplayName("Should enforce max slots per day")
        void testMaxSlotsPerDay() {
            // Create data with small maxSlotPerDay
            TimetableData smallData = TimetableData.builder()
                    .semesterCode("TEST")
                    .maxSlotPerDay(2)
                    .slotPerSubjectPerWeek(2)
                    .periodsPerDay(6)
                    .daysPerWeek(6)
                    .validWeekdays(new HashSet<>(Arrays.asList(0, 1, 2, 3, 4, 5)))
                    .validSlotIndices(new HashSet<>(Arrays.asList(0, 1, 2, 3, 4, 5)))
                    .classes(Arrays.asList(
                            TimetableData.ClassInfo.builder().className("C1").slotsPerWeek(2).build(),
                            TimetableData.ClassInfo.builder().className("C2").slotsPerWeek(2).build(),
                            TimetableData.ClassInfo.builder().className("C3").slotsPerWeek(2).build()))
                    .studentEnrollments(Map.of(1L, new HashSet<>(Arrays.asList("C1", "C2", "C3"))))
                    .classStudents(Map.of(
                            "C1", Set.of(1L),
                            "C2", Set.of(1L),
                            "C3", Set.of(1L)))
                    .classLecturer(Map.of("C1", 1L, "C2", 2L, "C3", 3L))
                    .lecturerClasses(Map.of(1L, Set.of("C1"), 2L, Set.of("C2"), 3L, Set.of("C3")))
                    .build();

            ScheduleState state = new ScheduleState(smallData);

            // Assign 2 slots on day 0 for student 1
            state.assignSlot("C1", 0);
            state.assignSlot("C2", 1);

            // Third class on same day should fail (max 2 slots/day)
            assertFalse(state.canAssignSlot("C3", 2));

            // Different day should work
            assertTrue(state.canAssignSlot("C3", 6)); // Day 1, slot 0
        }
    }

    // ==================== Chromosome Tests ====================

    @Nested
    @DisplayName("Chromosome Tests")
    class ChromosomeTests {

        @Test
        @DisplayName("Should correctly copy chromosome")
        void testChromosomeCopy() {
            Chromosome original = new Chromosome();
            original.assignSlot("CLASS-A", 0);
            original.assignSlot("CLASS-A", 1);
            original.assignSlot("CLASS-B", 2);
            original.setFitness(10.5);

            Chromosome copy = original.copy();

            // Should have same values
            assertEquals(original.getSlotsForClass("CLASS-A"), copy.getSlotsForClass("CLASS-A"));
            assertEquals(original.getFitness(), copy.getFitness());

            // But be independent
            copy.assignSlot("CLASS-A", 3);
            assertNotEquals(original.getSlotsForClass("CLASS-A").size(),
                    copy.getSlotsForClass("CLASS-A").size());
        }
    }

    // ==================== Population Initializer Tests ====================

    @Nested
    @DisplayName("PopulationInitializer Tests")
    class PopulationInitializerTests {

        @Test
        @DisplayName("Should create valid initial population")
        void testInitialization() {
            PopulationInitializer initializer = new PopulationInitializer(testData, testConfig);
            List<Chromosome> population = initializer.initialize();

            assertFalse(population.isEmpty());

            // All chromosomes should be valid
            for (Chromosome chromosome : population) {
                assertTrue(chromosome.isValid(),
                        "Chromosome should be valid: " + chromosome);

                // Each class should have correct number of slots
                for (TimetableData.ClassInfo classInfo : testData.getClasses()) {
                    Set<Integer> slots = chromosome.getSlotsForClass(classInfo.getClassName());
                    assertEquals(testData.getSlotPerSubjectPerWeek(), slots.size(),
                            "Class " + classInfo.getClassName() + " should have " +
                                    testData.getSlotPerSubjectPerWeek() + " slots");
                }
            }
        }
    }

    // ==================== Fitness Evaluator Tests ====================

    @Nested
    @DisplayName("FitnessEvaluator Tests")
    class FitnessEvaluatorTests {

        @Test
        @DisplayName("Should calculate Saturday penalty")
        void testSaturdayPenalty() {
            FitnessEvaluator evaluator = new FitnessEvaluator(testData, testConfig);

            Chromosome noSaturday = new Chromosome();
            noSaturday.assignSlot("CLASS-A", 0); // Monday
            noSaturday.assignSlot("CLASS-A", 6); // Tuesday
            noSaturday.assignSlot("CLASS-B", 1); // Monday
            noSaturday.assignSlot("CLASS-B", 7); // Tuesday
            noSaturday.assignSlot("CLASS-C", 2); // Monday
            noSaturday.assignSlot("CLASS-C", 8); // Tuesday

            Chromosome withSaturday = new Chromosome();
            withSaturday.assignSlot("CLASS-A", 30); // Saturday (day 5 * 6 periods = 30)
            withSaturday.assignSlot("CLASS-A", 31);
            withSaturday.assignSlot("CLASS-B", 32);
            withSaturday.assignSlot("CLASS-B", 33);
            withSaturday.assignSlot("CLASS-C", 34);
            withSaturday.assignSlot("CLASS-C", 35);

            double fitNoSat = evaluator.evaluate(noSaturday);
            double fitWithSat = evaluator.evaluate(withSaturday);

            // Saturday schedule should have higher (worse) fitness
            assertTrue(fitWithSat > fitNoSat,
                    "Saturday schedule should have worse fitness");
        }
    }

    // ==================== Full GA Tests ====================

    @Nested
    @DisplayName("Full GA Tests")
    class FullGATests {

        @Test
        @DisplayName("Should generate valid timetable")
        void testGAGeneration() {
            GeneticAlgorithm ga = new GeneticAlgorithm(testData, testConfig);
            GeneticAlgorithm.GAResult result = ga.run();

            assertTrue(result.isSuccess(), "GA should succeed");
            assertNotNull(result.getBestChromosome());
            assertTrue(result.getBestChromosome().isValid());

            // Verify no hard constraint violations
            Chromosome best = result.getBestChromosome();
            ScheduleState state = new ScheduleState(testData);

            for (String className : best.getAllClassNames()) {
                Set<Integer> slots = best.getSlotsForClass(className);
                assertEquals(testData.getSlotPerSubjectPerWeek(), slots.size(),
                        "Class " + className + " should have correct slot count");
            }

            System.out.println("GA Result: " + result);
            System.out.println("Best Fitness: " + result.getBestFitness());
            System.out.println("Generations: " + result.getTotalGenerations());
        }

        @Test
        @DisplayName("Should improve fitness over generations")
        void testFitnessImprovement() {
            GeneticAlgorithm ga = new GeneticAlgorithm(testData, testConfig);
            GeneticAlgorithm.GAResult result = ga.run();

            List<GeneticAlgorithm.GenerationStats> history = result.getHistory();

            if (history.size() > 1) {
                double initialFitness = history.get(0).getBestFitness();
                double finalFitness = history.get(history.size() - 1).getBestFitness();

                assertTrue(finalFitness <= initialFitness,
                        "Fitness should improve (decrease) over generations");
            }
        }
    }
}
