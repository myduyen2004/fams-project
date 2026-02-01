package com.fams.backend.service.timetable.ga.fitness;

import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * FitnessEvaluator - Đánh giá độ "đẹp" của thời khóa biểu
 * 
 * NGUYÊN TẮC:
 * - KHÔNG kiểm tra hard constraint (đã đảm bảo ở bước generation)
 * - Chỉ đo độ tối ưu soft constraints
 * 
 * Công thức Fitness (LOWER IS BETTER):
 * Fitness = W1 × SaturdaySlots + W2 × DailyGaps + W3 × WeeklyOverload
 * 
 * SC-1: Hạn chế học Thứ 7
 * SC-2: Giảm khoảng trống trong ngày (Gap)
 * SC-3: Quá tải theo tuần
 */
@Slf4j
@RequiredArgsConstructor
public class FitnessEvaluator {

    private final TimetableData data;
    private final GAConfig config;

    /**
     * Đánh giá fitness cho chromosome
     * 
     * @return fitness score (lower is better)
     */
    public double evaluate(Chromosome chromosome) {
        FitnessBreakdown breakdown = evaluateDetailed(chromosome);

        // Lưu breakdown vào chromosome
        Map<String, Double> penaltyMap = new HashMap<>();
        penaltyMap.put("saturday", breakdown.saturdayPenalty);
        penaltyMap.put("gap", breakdown.gapPenalty);
        penaltyMap.put("overload", breakdown.overloadPenalty);
        chromosome.setPenaltyBreakdown(penaltyMap);

        double fitness = breakdown.getTotalFitness();
        chromosome.setFitness(fitness);

        return fitness;
    }

    /**
     * Đánh giá chi tiết - OPTIMIZED: No ScheduleState creation
     */
    public FitnessBreakdown evaluateDetailed(Chromosome chromosome) {
        FitnessBreakdown breakdown = new FitnessBreakdown();

        // SC-1: Saturday penalty - direct calculation
        breakdown.saturdayPenalty = calculateSaturdayPenalty(chromosome)
                * config.getSaturdayPenaltyWeight();

        // SC-2: Gap penalty - direct calculation from chromosome
        breakdown.gapPenalty = calculateGapPenaltyDirect(chromosome)
                * config.getGapPenaltyWeight();

        // SC-3: Overload penalty - direct calculation from chromosome
        breakdown.overloadPenalty = calculateOverloadPenaltyDirect(chromosome)
                * config.getOverloadPenaltyWeight();

        return breakdown;
    }

    /**
     * SC-1: Tính penalty cho các slot vào thứ 7
     * Mỗi slot thứ 7 = 1 điểm penalty
     */
    private double calculateSaturdayPenalty(Chromosome chromosome) {
        int saturdaySlots = 0;

        for (Set<Integer> slots : chromosome.getGenes().values()) {
            for (Integer slotIndex : slots) {
                int dayIndex = data.getDayFromSlot(slotIndex);
                if (dayIndex == 5) { // Saturday = 5 (0-indexed, Mon=0)
                    saturdaySlots++;
                }
            }
        }

        return saturdaySlots;
    }

    /**
     * SC-2: Tính penalty cho khoảng trống trong ngày - OPTIMIZED
     * Gap = số slot trống giữa slot đầu và slot cuối trong ngày của mỗi sinh viên
     * Direct calculation from Chromosome without ScheduleState
     */
    private double calculateGapPenaltyDirect(Chromosome chromosome) {
        double totalGaps = 0;

        // Pre-compute student -> slots mapping from chromosome
        Map<Long, List<Integer>> studentSlots = new HashMap<>();

        for (Map.Entry<String, Set<Integer>> entry : chromosome.getGenes().entrySet()) {
            String className = entry.getKey();
            Set<Integer> slots = entry.getValue();
            Set<Long> students = data.getStudentsOfClass(className);

            for (Long studentId : students) {
                studentSlots.computeIfAbsent(studentId, k -> new ArrayList<>()).addAll(slots);
            }
        }

        // Calculate gaps for each student
        for (Map.Entry<Long, List<Integer>> entry : studentSlots.entrySet()) {
            List<Integer> slots = entry.getValue();

            // Group slots by day
            Map<Integer, List<Integer>> slotsByDay = new HashMap<>();
            for (Integer slot : slots) {
                int day = data.getDayFromSlot(slot);
                slotsByDay.computeIfAbsent(day, k -> new ArrayList<>()).add(slot);
            }

            // Calculate gaps for each day
            for (List<Integer> daySlots : slotsByDay.values()) {
                if (daySlots.size() < 2)
                    continue;

                // Sort by period
                daySlots.sort(Comparator.comparingInt(s -> data.getPeriodFromSlot(s)));

                for (int i = 1; i < daySlots.size(); i++) {
                    int periodDiff = data.getPeriodFromSlot(daySlots.get(i))
                            - data.getPeriodFromSlot(daySlots.get(i - 1));
                    if (periodDiff > 1) {
                        totalGaps += (periodDiff - 1);
                    }
                }
            }
        }

        return totalGaps;
    }

    /**
     * SC-3: Tính penalty cho quá tải tuần - OPTIMIZED
     * - Sinh viên học > 15 slot/tuần
     * - Giảng viên dạy > 20 slot/tuần
     * Direct calculation from Chromosome without ScheduleState
     */
    private double calculateOverloadPenaltyDirect(Chromosome chromosome) {
        double penalty = 0;

        // Pre-compute student -> slot count and lecturer -> slot count
        Map<Long, Integer> studentSlotCount = new HashMap<>();
        Map<Long, Integer> lecturerSlotCount = new HashMap<>();

        for (Map.Entry<String, Set<Integer>> entry : chromosome.getGenes().entrySet()) {
            String className = entry.getKey();
            int slotCount = entry.getValue().size();

            // Student slots
            Set<Long> students = data.getStudentsOfClass(className);
            for (Long studentId : students) {
                studentSlotCount.merge(studentId, slotCount, Integer::sum);
            }

            // Lecturer slots
            Long lecturerId = data.getLecturerOfClass(className);
            if (lecturerId != null) {
                lecturerSlotCount.merge(lecturerId, slotCount, Integer::sum);
            }
        }

        // Student overload
        int studentThreshold = config.getStudentWeeklyOverloadThreshold();
        for (int weeklySlots : studentSlotCount.values()) {
            if (weeklySlots > studentThreshold) {
                penalty += (weeklySlots - studentThreshold);
            }
        }

        // Lecturer overload
        int lecturerThreshold = config.getLecturerWeeklyOverloadThreshold();
        for (int weeklySlots : lecturerSlotCount.values()) {
            if (weeklySlots > lecturerThreshold) {
                penalty += (weeklySlots - lecturerThreshold) * 2; // Giảng viên có weight cao hơn
            }
        }

        return penalty;
    }

    /**
     * Incremental fitness update khi thay đổi 1 slot
     * Chỉ tính lại các phần bị ảnh hưởng
     */
    public double updateFitnessIncremental(
            Chromosome chromosome,
            String className,
            int oldSlot,
            int newSlot) {

        Map<String, Double> penalties = chromosome.getPenaltyBreakdown();
        double currentFitness = chromosome.getFitness();

        // Tính delta cho mỗi loại penalty
        double saturdayDelta = calculateSaturdayDelta(oldSlot, newSlot);
        double gapDelta = calculateGapDelta(chromosome, className, oldSlot, newSlot);

        // Cập nhật penalties
        double newSaturday = penalties.getOrDefault("saturday", 0.0)
                + saturdayDelta * config.getSaturdayPenaltyWeight();
        double newGap = penalties.getOrDefault("gap", 0.0)
                + gapDelta * config.getGapPenaltyWeight();

        penalties.put("saturday", newSaturday);
        penalties.put("gap", newGap);

        double newFitness = newSaturday + newGap + penalties.getOrDefault("overload", 0.0);
        chromosome.setFitness(newFitness);

        return newFitness;
    }

    /**
     * Tính delta Saturday penalty
     */
    private double calculateSaturdayDelta(int oldSlot, int newSlot) {
        int oldDay = data.getDayFromSlot(oldSlot);
        int newDay = data.getDayFromSlot(newSlot);

        int delta = 0;
        if (oldDay == 5)
            delta--; // Bỏ slot thứ 7
        if (newDay == 5)
            delta++; // Thêm slot thứ 7

        return delta;
    }

    /**
     * Tính delta Gap penalty (simplified)
     */
    private double calculateGapDelta(Chromosome chromosome, String className, int oldSlot, int newSlot) {
        // Simplified: re-evaluate gap cho các sinh viên của class này
        // Trong thực tế có thể optimize thêm
        return 0; // TODO: implement incremental gap calculation
    }

    /**
     * Evaluate nhiều chromosomes song song
     */
    public void evaluatePopulation(List<Chromosome> population) {
        population.parallelStream().forEach(this::evaluate);
    }

    /**
     * Fitness breakdown structure
     */
    @Getter
    public static class FitnessBreakdown {
        private double saturdayPenalty = 0;
        private double gapPenalty = 0;
        private double overloadPenalty = 0;

        public double getTotalFitness() {
            return saturdayPenalty + gapPenalty + overloadPenalty;
        }

        @Override
        public String toString() {
            return String.format("Fitness[sat=%.2f, gap=%.2f, overload=%.2f, total=%.2f]",
                    saturdayPenalty, gapPenalty, overloadPenalty, getTotalFitness());
        }
    }
}
