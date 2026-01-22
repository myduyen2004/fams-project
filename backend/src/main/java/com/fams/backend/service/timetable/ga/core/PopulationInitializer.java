package com.fams.backend.service.timetable.ga.core;

import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * PopulationInitializer - Tạo quần thể ban đầu
 * 
 * Nguyên tắc:
 * - Xếp class có nhiều xung đột trước
 * - Gán slot từng bước
 * - KHÔNG BAO GIỜ sinh cá thể sai (vi phạm hard constraint)
 */
@Slf4j
@RequiredArgsConstructor
public class PopulationInitializer {

    private final TimetableData data;
    private final GAConfig config;
    private final Random random = new Random();

    /**
     * Tạo quần thể ban đầu
     * 
     * @return List các chromosome hợp lệ
     */
    public List<Chromosome> initialize() {
        List<Chromosome> population = new ArrayList<>();

        // Sắp xếp classes theo độ xung đột giảm dần
        List<TimetableData.ClassInfo> sortedClasses = getSortedClasses();

        log.info("Initializing population of {} individuals", config.getPopulationSize());
        log.info("Classes sorted by conflict potential: {}", sortedClasses.size());

        // Step 1: Generate greedy chromosomes (20% of population)
        int greedyCount = (int) (config.getPopulationSize() * 0.2);
        log.info("Generating {} greedy chromosomes", greedyCount);

        for (int i = 0; i < greedyCount; i++) {
            Chromosome greedy = createGreedyChromosome();
            if (greedy != null && greedy.isValid()) {
                greedy.setGeneration(0);
                population.add(greedy);
            }
        }
        log.info("Created {} greedy chromosomes", population.size());

        // Step 2: Generate random chromosomes for remaining slots
        int attempts = 0;
        int maxAttempts = config.getPopulationSize() * 10; // Tránh infinite loop

        while (population.size() < config.getPopulationSize() && attempts < maxAttempts) {
            attempts++;

            Chromosome chromosome = createValidChromosome(sortedClasses);
            if (chromosome != null && chromosome.isValid()) {
                chromosome.setGeneration(0);
                population.add(chromosome);

                if (population.size() % 10 == 0) {
                    log.debug("Created {} valid chromosomes", population.size());
                }
            }
        }

        if (population.size() < config.getPopulationSize()) {
            log.warn("Could only create {} valid chromosomes out of {} requested",
                    population.size(), config.getPopulationSize());
        }

        log.info("Population initialized with {} chromosomes ({} greedy + {} random)",
                population.size(), Math.min(greedyCount, population.size()),
                population.size() - Math.min(greedyCount, population.size()));
        return population;
    }

    /**
     * Tạo một chromosome hợp lệ
     */
    private Chromosome createValidChromosome(List<TimetableData.ClassInfo> sortedClasses) {
        ScheduleState state = new ScheduleState(data);
        Chromosome chromosome = new Chromosome();

        // Shuffle một chút để tạo đa dạng (nhưng vẫn ưu tiên class xung đột cao)
        List<TimetableData.ClassInfo> classes = new ArrayList<>(sortedClasses);
        partialShuffle(classes, 0.3); // Shuffle 30% vị trí

        for (TimetableData.ClassInfo classInfo : classes) {
            String className = classInfo.getClassName();
            int slotsNeeded = data.getSlotPerSubjectPerWeek();

            // Lấy các slot khả dụng
            List<Integer> availableSlots = state.getAvailableSlots(className);

            if (availableSlots.size() < slotsNeeded) {
                // Không đủ slot khả dụng -> chromosome không hợp lệ
                log.trace("Cannot assign {} slots to class {}, only {} available",
                        slotsNeeded, className, availableSlots.size());
                return null;
            }

            // Chọn ngẫu nhiên các slot với day-gap constraint
            Collections.shuffle(availableSlots, random);
            Set<Integer> selectedSlots = new HashSet<>();
            Set<Integer> usedDays = new HashSet<>(); // Track days already used

            for (int slotIndex : availableSlots) {
                if (selectedSlots.size() >= slotsNeeded)
                    break;

                int dayIndex = data.getDayFromSlot(slotIndex);

                // Check day-gap constraint: must be at least 1 day apart
                if (!hasMinimumDayGap(dayIndex, usedDays)) {
                    continue; // Skip this slot, too close to existing slot
                }

                // Double check constraint trước khi gán
                if (state.canAssignSlot(className, slotIndex)) {
                    state.assignSlot(className, slotIndex);
                    selectedSlots.add(slotIndex);
                    usedDays.add(dayIndex); // Mark this day as used
                }
            }

            if (selectedSlots.size() < slotsNeeded) {
                // Không thể gán đủ slot
                return null;
            }

            chromosome.getGenes().put(className, selectedSlots);
        }

        chromosome.setValid(state.isComplete());
        return chromosome;
    }

    /**
     * Check if new day has minimum gap (at least 1 day) from all used days
     * Example: If used days are [0, 2] (Mon, Wed), then day 1 (Tue) is invalid
     */
    private boolean hasMinimumDayGap(int newDay, Set<Integer> usedDays) {
        for (Integer usedDay : usedDays) {
            if (Math.abs(newDay - usedDay) < 2) {
                return false; // Too close, need at least 1 day gap
            }
        }
        return true; // Valid gap
    }

    /**
     * Sắp xếp classes theo conflict potential giảm dần
     * Class có nhiều xung đột tiềm năng sẽ được xếp trước
     */
    private List<TimetableData.ClassInfo> getSortedClasses() {
        List<TimetableData.ClassInfo> sorted = new ArrayList<>(data.getClasses());

        sorted.sort((c1, c2) -> {
            int conflict1 = data.getConflictPotential(c1.getClassName());
            int conflict2 = data.getConflictPotential(c2.getClassName());
            return Integer.compare(conflict2, conflict1); // Giảm dần
        });

        return sorted;
    }

    /**
     * Partial shuffle để tạo đa dạng nhưng vẫn giữ thứ tự ưu tiên
     */
    private void partialShuffle(List<TimetableData.ClassInfo> list, double shuffleRatio) {
        int swapCount = (int) (list.size() * shuffleRatio);

        for (int i = 0; i < swapCount; i++) {
            int idx1 = random.nextInt(list.size());
            int idx2 = random.nextInt(list.size());

            // Swap
            TimetableData.ClassInfo temp = list.get(idx1);
            list.set(idx1, list.get(idx2));
            list.set(idx2, temp);
        }
    }

    /**
     * Tạo chromosome với greedy heuristic (ưu tiên slot ít xung đột)
     */
    public Chromosome createGreedyChromosome() {
        ScheduleState state = new ScheduleState(data);
        Chromosome chromosome = new Chromosome();

        List<TimetableData.ClassInfo> sortedClasses = getSortedClasses();

        for (TimetableData.ClassInfo classInfo : sortedClasses) {
            String className = classInfo.getClassName();
            int slotsNeeded = data.getSlotPerSubjectPerWeek();

            List<Integer> availableSlots = state.getAvailableSlots(className);

            if (availableSlots.size() < slotsNeeded) {
                return null;
            }

            // Sắp xếp slot theo "độ tốt" (ít ảnh hưởng đến các class còn lại)
            availableSlots.sort((s1, s2) -> {
                int score1 = evaluateSlotScore(state, className, s1);
                int score2 = evaluateSlotScore(state, className, s2);
                return Integer.compare(score1, score2); // Tăng dần (score thấp = tốt hơn)
            });

            Set<Integer> selectedSlots = new HashSet<>();

            for (int slotIndex : availableSlots) {
                if (selectedSlots.size() >= slotsNeeded)
                    break;

                if (state.canAssignSlot(className, slotIndex)) {
                    state.assignSlot(className, slotIndex);
                    selectedSlots.add(slotIndex);
                }
            }

            if (selectedSlots.size() < slotsNeeded) {
                return null;
            }

            chromosome.getGenes().put(className, selectedSlots);
        }

        chromosome.setValid(state.isComplete());
        return chromosome;
    }

    /**
     * Đánh giá điểm cho một slot (thấp hơn = tốt hơn)
     * Xem xét ảnh hưởng đến soft constraints
     */
    private int evaluateSlotScore(ScheduleState state, String className, int slotIndex) {
        int score = 0;
        int dayIndex = data.getDayFromSlot(slotIndex);

        // Penalty cho Saturday (dayIndex = 5)
        if (dayIndex == 5) {
            score += 100;
        }

        // Penalty cho slot đã đông (nhiều người học slot này)
        Set<Long> students = data.getStudentsOfClass(className);
        for (Long studentId : students) {
            int slotsInDay = state.getStudentSlotsInDay(studentId, dayIndex);
            score += slotsInDay * 10; // Ưu tiên phân bố đều
        }

        return score;
    }
}
