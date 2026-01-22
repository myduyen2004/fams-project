package com.fams.backend.service.timetable.ga.fitness;

import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
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
     * Đánh giá chi tiết
     */
    public FitnessBreakdown evaluateDetailed(Chromosome chromosome) {
        FitnessBreakdown breakdown = new FitnessBreakdown();

        // Build state để tính toán
        ScheduleState state = new ScheduleState(data);
        state.loadFromChromosome(chromosome);

        // SC-1: Saturday penalty
        breakdown.saturdayPenalty = calculateSaturdayPenalty(chromosome)
                * config.getSaturdayPenaltyWeight();

        // SC-2: Gap penalty
        breakdown.gapPenalty = calculateGapPenalty(state)
                * config.getGapPenaltyWeight();

        // SC-3: Overload penalty
        breakdown.overloadPenalty = calculateOverloadPenalty(state)
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
     * SC-2: Tính penalty cho khoảng trống trong ngày
     * Gap = số slot trống giữa slot đầu và slot cuối trong ngày của mỗi sinh viên
     */
    private double calculateGapPenalty(ScheduleState state) {
        double totalGaps = 0;

        for (Long studentId : data.getStudentEnrollments().keySet()) {
            for (int dayIndex = 0; dayIndex < data.getDaysPerWeek(); dayIndex++) {
                int gaps = calculateStudentGapsInDay(state, studentId, dayIndex);
                totalGaps += gaps;
            }
        }

        return totalGaps;
    }

    /**
     * Tính số gap của sinh viên trong một ngày
     */
    private int calculateStudentGapsInDay(ScheduleState state, Long studentId, int dayIndex) {
        int[] slotsInDay = state.getStudentSlotMasks().get(studentId)
                .getOccupiedSlotsInDay(dayIndex, data.getPeriodsPerDay());

        if (slotsInDay.length < 2) {
            return 0; // Không có gap nếu < 2 slots
        }

        // Sắp xếp các slot
        Arrays.sort(slotsInDay);

        // Đếm gaps
        int gaps = 0;
        for (int i = 1; i < slotsInDay.length; i++) {
            int periodDiff = (slotsInDay[i] % data.getPeriodsPerDay())
                    - (slotsInDay[i - 1] % data.getPeriodsPerDay());
            if (periodDiff > 1) {
                gaps += (periodDiff - 1);
            }
        }

        return gaps;
    }

    /**
     * SC-3: Tính penalty cho quá tải tuần
     * - Sinh viên học > 15 slot/tuần
     * - Giảng viên dạy > 20 slot/tuần
     */
    private double calculateOverloadPenalty(ScheduleState state) {
        double penalty = 0;

        // Student overload
        int studentThreshold = config.getStudentWeeklyOverloadThreshold();
        for (Long studentId : data.getStudentEnrollments().keySet()) {
            int weeklySlots = state.getStudentWeeklySlots(studentId);
            if (weeklySlots > studentThreshold) {
                penalty += (weeklySlots - studentThreshold);
            }
        }

        // Lecturer overload
        int lecturerThreshold = config.getLecturerWeeklyOverloadThreshold();
        for (Long lecturerId : data.getLecturerClasses().keySet()) {
            int weeklySlots = state.getLecturerWeeklySlots(lecturerId);
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
