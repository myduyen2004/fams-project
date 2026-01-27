package com.fams.backend.service.timetable;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.timetable.ga.core.GeneticAlgorithm;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * TimetableGenerationService - Service chính để tạo thời khóa biểu
 * 
 * Kiến trúc:
 * 1. Preprocessing (load data)
 * 2. Slot Assignment GA (Hard-safe)
 * 3. Soft Optimization GA
 * 4. Room Assignment
 * 5. Final Polish & Save
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableGenerationService {

    private final TimetableDataLoader dataLoader;
    private final TimetableSlotRepository timetableSlotRepository;
    private final RoomRepository roomRepository;
    private final ClassSectionRepository classSectionRepository;
    private final SlotTypeRepository slotTypeRepository;
    private final SemesterRepository semesterRepository;

    // Track running jobs
    private final Map<String, GenerationJob> runningJobs = new ConcurrentHashMap<>();

    /**
     * Generate timetable cho một học kỳ
     * 
     * @param jobId Job ID from controller (for consistent tracking)
     */
    @Async
    public CompletableFuture<GenerationResult> generateTimetable(
            String jobId,
            String semesterCode,
            GAConfig config,
            Consumer<GeneticAlgorithm.GAProgress> progressCallback) {

        // Use provided jobId or generate new one
        String actualJobId = jobId != null ? jobId : UUID.randomUUID().toString();

        try {
            log.info("Starting timetable generation for semester: {}", semesterCode);

            // Create job tracker
            GenerationJob job = GenerationJob.builder()
                    .jobId(actualJobId)
                    .semesterCode(semesterCode)
                    .status(JobStatus.RUNNING)
                    .startTime(System.currentTimeMillis())
                    .build();
            runningJobs.put(actualJobId, job);

            // Phase 1: Load data
            job.setPhase("Loading data");
            TimetableData data = dataLoader.loadDataForSemester(semesterCode);

            if (data.getClasses().isEmpty()) {
                job.setStatus(JobStatus.FAILED);
                job.setErrorMessage("Chưa có lớp học phần. Vui lòng nhập lớp học phần.");
                job.setEndTime(System.currentTimeMillis());
                return CompletableFuture.completedFuture(
                        GenerationResult.builder()
                                .success(false)
                                .jobId(actualJobId)
                                .message("Chưa có lớp học phần. Vui lòng nhập lớp học phần.")
                                .build());
            }

            // Phase 2: Run GA
            job.setPhase("Running Genetic Algorithm");
            GeneticAlgorithm ga = new GeneticAlgorithm(data, config != null ? config : GAConfig.defaultConfig());

            // Set progress callback
            ga.setProgressCallback(progress -> {
                job.setCurrentGeneration(progress.getGeneration());
                job.setBestFitness(progress.getBestFitness());
                job.setPercentComplete(progress.getPercentComplete());

                if (progressCallback != null) {
                    progressCallback.accept(progress);
                }
            });

            GeneticAlgorithm.GAResult gaResult = ga.run();

            if (!gaResult.isSuccess()) {
                job.setStatus(JobStatus.FAILED);
                return CompletableFuture.completedFuture(
                        GenerationResult.builder()
                                .success(false)
                                .jobId(jobId)
                                .message(gaResult.getMessage())
                                .build());
            }

            // Phase 3: Room Assignment
            job.setPhase("Assigning rooms");
            Chromosome bestSolution = gaResult.getBestChromosome();
            Map<String, Map<Integer, Long>> roomAssignments = assignRooms(data, bestSolution);

            // Phase 4: Save to database
            job.setPhase("Saving timetable");
            saveTimetable(semesterCode, data, bestSolution, roomAssignments);

            // Complete
            job.setStatus(JobStatus.COMPLETED);
            job.setEndTime(System.currentTimeMillis());

            log.info("Timetable generation completed for semester: {}. Fitness: {}",
                    semesterCode, gaResult.getBestFitness());

            return CompletableFuture.completedFuture(
                    GenerationResult.builder()
                            .success(true)
                            .jobId(actualJobId)
                            .message("Timetable generated successfully")
                            .fitness(gaResult.getBestFitness())
                            .totalGenerations(gaResult.getTotalGenerations())
                            .durationMs(gaResult.getDuration().toMillis())
                            .totalSlots(countTotalSlots(bestSolution))
                            .totalClasses(data.getClasses().size())
                            .build());

        } catch (Exception e) {
            log.error("Error generating timetable for semester: " + semesterCode, e);

            GenerationJob job = runningJobs.get(actualJobId);
            if (job != null) {
                job.setStatus(JobStatus.FAILED);
                job.setErrorMessage(e.getMessage());
            }

            return CompletableFuture.completedFuture(
                    GenerationResult.builder()
                            .success(false)
                            .jobId(actualJobId)
                            .message("Error: " + e.getMessage())
                            .build());
        } finally {
            // Cleanup after some time
            // runningJobs.remove(jobId);
        }
    }

    /**
     * Room Assignment - Gán phòng cho các slot
     */
    private Map<String, Map<Integer, Long>> assignRooms(TimetableData data, Chromosome chromosome) {
        Map<String, Map<Integer, Long>> assignments = new HashMap<>();

        // Build room availability map: slotIndex -> Set<roomId>
        Map<Integer, Set<Long>> slotRoomAvailability = new HashMap<>();
        for (int slot : data.getValidSlotIndices()) {
            Set<Long> availableRooms = data.getRooms().stream()
                    .map(TimetableData.RoomInfo::getId)
                    .collect(java.util.stream.Collectors.toSet());
            slotRoomAvailability.put(slot, availableRooms);
        }

        // Sort classes by enrollment size (descending) to prioritize larger classes
        List<TimetableData.ClassInfo> sortedClasses = new ArrayList<>(data.getClasses());
        sortedClasses.sort((c1, c2) -> Integer.compare(c2.getCurrentEnrollment(), c1.getCurrentEnrollment()));

        // Assign rooms to each class
        for (TimetableData.ClassInfo classInfo : sortedClasses) {
            String className = classInfo.getClassName();
            Set<Integer> slots = chromosome.getSlotsForClass(className);
            Map<Integer, Long> classRoomAssignment = new HashMap<>();

            for (Integer slotIndex : slots) {
                Long assignedRoom = findBestRoom(
                        data,
                        slotRoomAvailability.get(slotIndex),
                        classInfo.getCurrentEnrollment());

                if (assignedRoom != null) {
                    classRoomAssignment.put(slotIndex, assignedRoom);
                    slotRoomAvailability.get(slotIndex).remove(assignedRoom);
                } else {
                    // No room available - use first available room as fallback
                    Set<Long> available = slotRoomAvailability.get(slotIndex);
                    if (!available.isEmpty()) {
                        assignedRoom = available.iterator().next();
                        classRoomAssignment.put(slotIndex, assignedRoom);
                        available.remove(assignedRoom);
                    }
                }
            }

            assignments.put(className, classRoomAssignment);
        }

        return assignments;
    }

    /**
     * Tìm phòng phù hợp nhất
     */
    private Long findBestRoom(TimetableData data, Set<Long> availableRooms, int requiredCapacity) {
        if (availableRooms == null || availableRooms.isEmpty()) {
            return null;
        }

        // Find room with smallest capacity that fits
        return data.getRooms().stream()
                .filter(r -> availableRooms.contains(r.getId()))
                .filter(r -> r.getCapacity() >= requiredCapacity)
                .min(Comparator.comparingInt(TimetableData.RoomInfo::getCapacity))
                .map(TimetableData.RoomInfo::getId)
                .orElse(null);
    }

    /**
     * Save timetable vào database
     * Phân bổ slots đều ra tất cả các tuần trong học kỳ
     */
    @Transactional
    public void saveTimetable(
            String semesterCode,
            TimetableData data,
            Chromosome chromosome,
            Map<String, Map<Integer, Long>> roomAssignments) {

        log.info("Saving timetable for semester: {}", semesterCode);

        // Get semester entity
        Semester semester = semesterRepository.findAll().stream()
                .filter(s -> s.getCode().equals(semesterCode))
                .findFirst()
                .orElseThrow();

        // Load slot types
        List<SlotType> slotTypes = slotTypeRepository.findAll().stream()
                .filter(st -> st.getSemester().getId().equals(semester.getId()))
                .toList();

        // Delete existing timetable for this semester
        timetableSlotRepository.deleteBySemesterCode(semesterCode);

        // Calculate number of weeks in semester
        int weeksInSemester = calculateWeeksInSemester(semester.getStartDate(), semester.getEndDate());
        log.info("Weeks in semester: {}", weeksInSemester);

        List<TimetableSlot> slotsToSave = new ArrayList<>();

        for (String className : chromosome.getAllClassNames()) {
            Set<Integer> weeklySlots = chromosome.getSlotsForClass(className);
            Map<Integer, Long> roomMap = roomAssignments.getOrDefault(className, Collections.emptyMap());

            ClassSection classSection = classSectionRepository.findByClassName(className).orElse(null);
            if (classSection == null)
                continue;

            // Validate and filter weekly slots to ensure day-gap constraint
            List<Integer> validatedWeeklySlots = filterDayGapViolations(weeklySlots, data);

            int slotsPerWeek = validatedWeeklySlots.size();
            int numberOfSlots = classSection.getNumberOfSlots();
            int totalSlotsFromPattern = slotsPerWeek * weeksInSemester;

            List<Integer> sortedWeeklySlots = new ArrayList<>(validatedWeeklySlots);
            Collections.sort(sortedWeeklySlots);

            // Case 1: Pattern exactly matches or exceeds requirement
            if (totalSlotsFromPattern >= numberOfSlots) {
                // Calculate how many weeks we need
                int weeksNeeded = (int) Math.ceil((double) numberOfSlots / slotsPerWeek);
                int slotsInLastWeek = numberOfSlots % slotsPerWeek;
                if (slotsInLastWeek == 0)
                    slotsInLastWeek = slotsPerWeek;

                for (int week = 0; week < weeksNeeded; week++) {
                    List<Integer> slotsForThisWeek = sortedWeeklySlots;

                    // Last week: only take required number of slots
                    if (week == weeksNeeded - 1 && slotsInLastWeek < slotsPerWeek) {
                        slotsForThisWeek = sortedWeeklySlots.subList(0, slotsInLastWeek);
                    }

                    for (Integer slotIndex : slotsForThisWeek) {
                        TimetableSlot slot = createTimetableSlot(
                                classSection, slotIndex, week, roomMap, slotTypes,
                                semester.getStartDate(), data);
                        if (slot != null) {
                            slotsToSave.add(slot);
                        }
                    }
                }
            }
            // Case 2: Pattern generates fewer slots than required
            else {
                // Distribute extra slots evenly across weeks
                int extraSlots = numberOfSlots - totalSlotsFromPattern;
                int[] slotsPerWeekArray = distributeExtraSlots(weeksInSemester, slotsPerWeek, extraSlots);

                // Get list of all valid slots for extra assignment
                List<Integer> allValidSlots = new ArrayList<>(data.getValidSlotIndices());
                allValidSlots.removeAll(weeklySlots);
                Collections.shuffle(allValidSlots);

                int extraSlotPointer = 0;

                for (int week = 0; week < weeksInSemester; week++) {
                    // Save base weekly pattern
                    for (Integer slotIndex : sortedWeeklySlots) {
                        TimetableSlot slot = createTimetableSlot(
                                classSection, slotIndex, week, roomMap, slotTypes,
                                semester.getStartDate(), data);
                        if (slot != null) {
                            slotsToSave.add(slot);
                        }
                    }

                    // Save extra slots for this week (if any)
                    int extraForThisWeek = slotsPerWeekArray[week] - slotsPerWeek;
                    for (int i = 0; i < extraForThisWeek && extraSlotPointer < allValidSlots.size(); i++) {
                        Integer extraSlotIndex = allValidSlots.get(extraSlotPointer++);
                        TimetableSlot slot = createTimetableSlot(
                                classSection, extraSlotIndex, week, roomMap, slotTypes,
                                semester.getStartDate(), data);
                        if (slot != null) {
                            slotsToSave.add(slot);
                        }
                    }
                }
            }
        }

        // Remove duplicate slots (same class, date, slotNumber)
        slotsToSave = removeDuplicateSlots(slotsToSave);

        timetableSlotRepository.saveAll(slotsToSave);
        log.info("Saved {} timetable slots for {} classes", slotsToSave.size(), chromosome.getAllClassNames().size());
    }

    /**
     * Remove duplicate slots (same class, date, slotNumber)
     * Keep the first occurrence
     */
    private List<TimetableSlot> removeDuplicateSlots(List<TimetableSlot> slots) {
        Set<String> seen = new java.util.HashSet<>();
        List<TimetableSlot> unique = new ArrayList<>();
        int duplicateCount = 0;

        for (TimetableSlot slot : slots) {
            // Create unique key: className + date + slotNumber
            String key = slot.getClassSection().getClassName() + "_" +
                    slot.getDate() + "_" +
                    slot.getSlotNumber();

            if (seen.add(key)) {
                unique.add(slot);
            } else {
                duplicateCount++;
            }
        }

        if (duplicateCount > 0) {
            log.warn("Removed {} duplicate slots (same class, date, slotNumber)", duplicateCount);
        }

        return unique;
    }

    /**
     * Tạo TimetableSlot cho một slot cụ thể
     */
    private TimetableSlot createTimetableSlot(
            ClassSection classSection,
            int slotIndex,
            int week,
            Map<Integer, Long> roomMap,
            List<SlotType> slotTypes,
            LocalDate semesterStart,
            TimetableData data) {

        int dayIndex = data.getDayFromSlot(slotIndex);
        int periodIndex = data.getPeriodFromSlot(slotIndex);

        // Get room - try multiple strategies
        Long roomId = roomMap.get(slotIndex);
        Room room = null;

        if (roomId != null) {
            room = roomRepository.findById(roomId).orElse(null);
        }

        // Strategy 1: If no room, find room from same day/period pattern
        if (room == null) {
            roomId = findRoomByPattern(roomMap, dayIndex, periodIndex, data);
            if (roomId != null) {
                room = roomRepository.findById(roomId).orElse(null);
            }
        }

        // Strategy 2: If still no room, use any room from this class's assignments
        if (room == null && !roomMap.isEmpty()) {
            roomId = roomMap.values().iterator().next();
            room = roomRepository.findById(roomId).orElse(null);
        }

        // Strategy 3: Last resort - find any available room
        if (room == null) {
            room = roomRepository.findAll().stream()
                    .findFirst()
                    .orElse(null);
        }

        // Get slot type
        SlotType slotType = slotTypes.stream()
                .filter(st -> st.getSlotIndex() == periodIndex + 1)
                .findFirst()
                .orElse(slotTypes.isEmpty() ? null : slotTypes.get(0));

        if (room == null || slotType == null) {
            log.error("CRITICAL: Cannot create slot for class {} week {} slot {} - missing room or slotType",
                    classSection.getClassName(), week, slotIndex);
            return null; // Only return null if absolutely cannot create slot
        }

        // Calculate actual date for this week
        LocalDate slotDate = calculateDateForWeek(semesterStart, week, dayIndex);

        // Validate date within semester bounds (prevent slots before start date)
        if (slotDate.isBefore(semesterStart)) {
            return null;
        }

        // Check if this date is a holiday - skip if so
        if (data.getHolidays() != null && data.getHolidays().contains(slotDate)) {
            log.debug("Skipping slot on holiday: {} for class {}", slotDate, classSection.getClassName());
            return null;
        }

        return TimetableSlot.builder()
                .classSection(classSection)
                .room(room)
                .slotType(slotType)
                .date(slotDate)
                .dayOfWeek(dayIndex + 2) // Convert to DB format (2=Mon)
                .slotNumber(periodIndex + 1)
                .status(TimetableSlot.TimetableSlotStatus.SCHEDULED)
                .build();
    }

    /**
     * Find room by pattern: look for room assigned to same day/period combination
     */
    private Long findRoomByPattern(Map<Integer, Long> roomMap, int targetDay, int targetPeriod, TimetableData data) {
        for (Map.Entry<Integer, Long> entry : roomMap.entrySet()) {
            int slotIndex = entry.getKey();
            int day = data.getDayFromSlot(slotIndex);
            int period = data.getPeriodFromSlot(slotIndex);

            if (day == targetDay && period == targetPeriod) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Filter weekly slots to remove day-gap violations
     * Keeps slots that are at least 1 day apart from each other
     */
    List<Integer> filterDayGapViolations(Set<Integer> weeklySlots, TimetableData data) {
        if (weeklySlots == null || weeklySlots.isEmpty()) {
            return new ArrayList<>();
        }

        // Sort slots by day, then period
        List<Integer> sortedSlots = new ArrayList<>(weeklySlots);
        sortedSlots.sort((a, b) -> {
            int dayA = data.getDayFromSlot(a);
            int dayB = data.getDayFromSlot(b);
            if (dayA != dayB)
                return Integer.compare(dayA, dayB);
            return Integer.compare(a, b);
        });

        // Greedy selection: keep slots that are at least 2 days apart
        List<Integer> validSlots = new ArrayList<>();
        Set<Integer> usedDays = new java.util.HashSet<>();

        for (Integer slot : sortedSlots) {
            int day = data.getDayFromSlot(slot);

            // Check if this day is at least 2 away from all used days
            boolean valid = true;
            for (Integer usedDay : usedDays) {
                if (Math.abs(day - usedDay) < 2) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                validSlots.add(slot);
                usedDays.add(day);
            }
        }

        if (validSlots.size() < weeklySlots.size()) {
            log.warn("Filtered {} day-gap violations from weekly slots (kept {}/{})",
                    weeklySlots.size() - validSlots.size(), validSlots.size(), weeklySlots.size());
        }

        return validSlots;
    }

    /**
     * Tính số tuần trong học kỳ
     */
    int calculateWeeksInSemester(LocalDate start, LocalDate end) {
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(start, end);
        return (int) Math.ceil(totalDays / 7.0);
    }

    /**
     * Tính ngày cho một tuần và ngày cụ thể
     */
    LocalDate calculateDateForWeek(LocalDate semesterStart, int weekNumber, int dayIndex) {
        // Calculate the Monday of the first week
        int startDayOfWeek = semesterStart.getDayOfWeek().getValue() - 1; // 0=Mon
        LocalDate firstMonday = semesterStart.minusDays(startDayOfWeek);

        // Add weeks and day offset
        return firstMonday.plusWeeks(weekNumber).plusDays(dayIndex);
    }

    /**
     * Phân bổ slots thừa đều vào các tuần
     * VD: 10 tuần, 3 slots/tuần base, 5 extra → [4,4,4,4,4,3,3,3,3,3]
     */
    int[] distributeExtraSlots(int weeks, int baseSlots, int extraSlots) {
        int[] distribution = new int[weeks];
        Arrays.fill(distribution, baseSlots);

        // Distribute extra slots evenly (first N weeks get 1 extra each)
        for (int i = 0; i < extraSlots && i < weeks; i++) {
            distribution[i]++;
        }

        return distribution;
    }

    /**
     * Count total slots in chromosome
     */
    private int countTotalSlots(Chromosome chromosome) {
        return chromosome.getGenes().values().stream()
                .mapToInt(Set::size)
                .sum();
    }

    /**
     * Get job status
     */
    public GenerationJob getJobStatus(String jobId) {
        return runningJobs.get(jobId);
    }

    /**
     * Cancel running job
     */
    public boolean cancelJob(String jobId) {
        GenerationJob job = runningJobs.get(jobId);
        if (job != null && job.getStatus() == JobStatus.RUNNING) {
            job.setStatus(JobStatus.CANCELLED);
            return true;
        }
        return false;
    }

    // ==================== Result Classes ====================

    @Data
    @Builder
    public static class GenerationResult {
        private boolean success;
        private String jobId;
        private String message;
        private double fitness;
        private int totalGenerations;
        private long durationMs;
        private int totalSlots;
        private int totalClasses;
    }

    @Data
    @Builder
    public static class GenerationJob {
        private String jobId;
        private String semesterCode;
        private JobStatus status;
        private String phase;
        private int currentGeneration;
        private double bestFitness;
        private double percentComplete;
        private long startTime;
        private long endTime;
        private String errorMessage;
    }

    public enum JobStatus {
        PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    }
}
