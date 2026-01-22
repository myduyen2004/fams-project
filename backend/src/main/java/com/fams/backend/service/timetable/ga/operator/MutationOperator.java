package com.fams.backend.service.timetable.ga.operator;

import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * MutationOperator - Toán tử đột biến
 * 
 * Các loại mutation:
 * - Swap mutation: đổi 1 slot sang slot khác
 * - Multi-swap: đổi nhiều slot cùng lúc
 * 
 * NGUYÊN TẮC:
 * - Thử tối đa K lần
 * - Fail → rollback
 * - KHÔNG BAO GIỜ tạo ra chromosome sai
 * 
 * Adaptive Mutation:
 * - Fitness đứng yên → tăng mutation rate
 * - Fitness tốt → giảm mutation rate
 */
@Slf4j
@RequiredArgsConstructor
public class MutationOperator {

    private final TimetableData data;
    private final GAConfig config;
    private final Random random = new Random();

    @Getter
    @Setter
    private double currentMutationRate;

    // Tracking cho adaptive mutation
    private double lastBestFitness = Double.MAX_VALUE;
    private int stagnationCount = 0;

    public MutationOperator(TimetableData data, GAConfig config, double initialRate) {
        this.data = data;
        this.config = config;
        this.currentMutationRate = initialRate;
    }

    /**
     * Mutate một chromosome
     * 
     * @return Mutated chromosome (hoặc bản gốc nếu mutation thất bại)
     */
    public Chromosome mutate(Chromosome chromosome) {
        if (random.nextDouble() > currentMutationRate) {
            return chromosome; // Không mutate
        }

        Chromosome mutated = chromosome.copy();

        // Chọn ngẫu nhiên 1-3 classes để mutate
        List<String> classes = new ArrayList<>(chromosome.getAllClassNames());
        int classesToMutate = Math.min(random.nextInt(3) + 1, classes.size());
        Collections.shuffle(classes, random);

        for (int i = 0; i < classesToMutate; i++) {
            String className = classes.get(i);
            mutated = mutateClass(mutated, className);

            if (!mutated.isValid()) {
                // Rollback nếu mutation làm hỏng chromosome
                return chromosome;
            }
        }

        return mutated;
    }

    /**
     * Mutate slots của một class cụ thể
     */
    private Chromosome mutateClass(Chromosome chromosome, String className) {
        Set<Integer> currentSlots = new HashSet<>(chromosome.getSlotsForClass(className));

        if (currentSlots.isEmpty()) {
            return chromosome;
        }

        // Chọn ngẫu nhiên 1 slot để thay thế
        List<Integer> slotList = new ArrayList<>(currentSlots);
        int oldSlot = slotList.get(random.nextInt(slotList.size()));

        // Build state để kiểm tra constraint
        ScheduleState state = new ScheduleState(data);
        state.loadFromChromosome(chromosome);

        // Remove old slot
        state.removeSlot(className, oldSlot);

        // Tìm slot mới
        List<Integer> availableSlots = state.getAvailableSlots(className);

        // Loại bỏ các slot đã có
        availableSlots.removeAll(currentSlots);

        if (availableSlots.isEmpty()) {
            // Không có slot khả dụng, rollback
            state.assignSlot(className, oldSlot);
            return chromosome;
        }

        // Thử gán slot mới
        boolean success = false;
        for (int attempt = 0; attempt < config.getMaxMutationAttempts(); attempt++) {
            int newSlot = availableSlots.get(random.nextInt(availableSlots.size()));

            if (state.canAssignSlot(className, newSlot)) {
                state.assignSlot(className, newSlot);

                // Cập nhật chromosome
                Chromosome mutated = chromosome.copy();
                Set<Integer> newSlots = new HashSet<>(currentSlots);
                newSlots.remove(oldSlot);
                newSlots.add(newSlot);
                mutated.getGenes().put(className, newSlots);
                mutated.setValid(true);

                return mutated;
            }

            // Remove từ available để không thử lại
            availableSlots.remove(Integer.valueOf(newSlot));
            if (availableSlots.isEmpty())
                break;
        }

        // Mutation thất bại, giữ nguyên
        return chromosome;
    }

    /**
     * Multi-swap mutation: đổi nhiều slot cùng lúc
     */
    public Chromosome multiSwapMutation(Chromosome chromosome, int swapCount) {
        Chromosome mutated = chromosome.copy();

        List<String> classes = new ArrayList<>(chromosome.getAllClassNames());
        Collections.shuffle(classes, random);

        ScheduleState state = new ScheduleState(data);
        state.loadFromChromosome(mutated);

        int successfulSwaps = 0;

        for (String className : classes) {
            if (successfulSwaps >= swapCount)
                break;

            Set<Integer> currentSlots = mutated.getSlotsForClass(className);
            if (currentSlots.isEmpty())
                continue;

            List<Integer> slotList = new ArrayList<>(currentSlots);
            int oldSlot = slotList.get(random.nextInt(slotList.size()));

            // Remove và tìm slot mới
            state.removeSlot(className, oldSlot);
            List<Integer> available = state.getAvailableSlots(className);
            available.removeAll(currentSlots);

            if (!available.isEmpty()) {
                int newSlot = available.get(random.nextInt(available.size()));

                if (state.canAssignSlot(className, newSlot)) {
                    state.assignSlot(className, newSlot);

                    Set<Integer> newSlots = new HashSet<>(currentSlots);
                    newSlots.remove(oldSlot);
                    newSlots.add(newSlot);
                    mutated.getGenes().put(className, newSlots);

                    successfulSwaps++;
                } else {
                    // Rollback
                    state.assignSlot(className, oldSlot);
                }
            } else {
                // Rollback
                state.assignSlot(className, oldSlot);
            }
        }

        mutated.setValid(state.isComplete());
        return mutated.isValid() ? mutated : chromosome;
    }

    /**
     * Adaptive mutation: điều chỉnh mutation rate dựa trên progress
     */
    public void adaptMutationRate(double currentBestFitness) {
        if (currentBestFitness >= lastBestFitness) {
            // Không cải thiện -> tăng mutation rate
            stagnationCount++;

            if (stagnationCount >= 5) {
                currentMutationRate = Math.min(
                        currentMutationRate * 1.2,
                        config.getMaxMutationRate());
                log.debug("Stagnation detected, increasing mutation rate to {}", currentMutationRate);
            }
        } else {
            // Cải thiện -> giảm mutation rate
            stagnationCount = 0;
            currentMutationRate = Math.max(
                    currentMutationRate * 0.95,
                    config.getMinMutationRate());
        }

        lastBestFitness = currentBestFitness;
    }

    /**
     * Reset mutation rate về giá trị ban đầu
     */
    public void resetMutationRate() {
        currentMutationRate = config.getMutationRate();
        stagnationCount = 0;
        lastBestFitness = Double.MAX_VALUE;
    }

    /**
     * Mutate toàn bộ population
     */
    public List<Chromosome> mutatePopulation(List<Chromosome> population) {
        return population.stream()
                .map(this::mutate)
                .toList();
    }
}
