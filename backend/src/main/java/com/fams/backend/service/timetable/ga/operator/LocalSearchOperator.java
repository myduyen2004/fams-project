package com.fams.backend.service.timetable.ga.operator;

import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
import com.fams.backend.service.timetable.ga.fitness.FitnessEvaluator;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * LocalSearchOperator - Tìm kiếm cục bộ để cải thiện chromosome
 * 
 * Các kỹ thuật:
 * - Swap slot gần nhau
 * - Hill-climbing nhẹ
 * - First-improvement vs Best-improvement
 */
@Slf4j
@RequiredArgsConstructor
public class LocalSearchOperator {

    private final TimetableData data;
    private final GAConfig config;
    private final FitnessEvaluator fitnessEvaluator;
    private final Random random = new Random();

    /**
     * Áp dụng local search để cải thiện chromosome
     * 
     * @return Improved chromosome
     */
    public Chromosome improve(Chromosome chromosome) {
        if (!config.isEnableLocalSearch()) {
            return chromosome;
        }

        Chromosome best = chromosome.copy();
        double bestFitness = fitnessEvaluator.evaluate(best);

        for (int iter = 0; iter < config.getLocalSearchIterations(); iter++) {
            Chromosome improved = firstImprovementSearch(best);
            double newFitness = fitnessEvaluator.evaluate(improved);

            if (newFitness < bestFitness) {
                best = improved;
                bestFitness = newFitness;
            } else {
                break; // Không cải thiện được nữa
            }
        }

        return best;
    }

    /**
     * First-improvement local search
     * Trả về ngay khi tìm được improvement đầu tiên
     */
    private Chromosome firstImprovementSearch(Chromosome chromosome) {
        double currentFitness = chromosome.getFitness();

        List<String> classes = new ArrayList<>(chromosome.getAllClassNames());
        Collections.shuffle(classes, random);

        for (String className : classes) {
            Set<Integer> currentSlots = chromosome.getSlotsForClass(className);

            for (Integer oldSlot : currentSlots) {
                Chromosome neighbor = trySwapSlot(chromosome, className, oldSlot);

                if (neighbor != null && neighbor.isValid()) {
                    double neighborFitness = fitnessEvaluator.evaluate(neighbor);

                    if (neighborFitness < currentFitness) {
                        return neighbor; // First improvement
                    }
                }
            }
        }

        return chromosome; // Không tìm được improvement
    }

    /**
     * Best-improvement local search
     * Kiểm tra tất cả neighbors và chọn best
     */
    public Chromosome bestImprovementSearch(Chromosome chromosome) {
        double currentFitness = chromosome.getFitness();
        Chromosome best = chromosome;
        double bestFitness = currentFitness;

        for (String className : chromosome.getAllClassNames()) {
            Set<Integer> currentSlots = chromosome.getSlotsForClass(className);

            for (Integer oldSlot : currentSlots) {
                Chromosome neighbor = trySwapSlot(chromosome, className, oldSlot);

                if (neighbor != null && neighbor.isValid()) {
                    double neighborFitness = fitnessEvaluator.evaluate(neighbor);

                    if (neighborFitness < bestFitness) {
                        best = neighbor;
                        bestFitness = neighborFitness;
                    }
                }
            }
        }

        return best;
    }

    /**
     * Thử đổi một slot của một class sang slot tốt hơn
     */
    private Chromosome trySwapSlot(Chromosome chromosome, String className, int oldSlot) {
        ScheduleState state = new ScheduleState(data);
        state.loadFromChromosome(chromosome);

        // Remove old slot
        state.removeSlot(className, oldSlot);

        // Tìm slot thay thế tốt nhất
        List<Integer> candidates = state.getAvailableSlots(className);
        Set<Integer> currentSlots = chromosome.getSlotsForClass(className);
        candidates.removeAll(currentSlots);

        if (candidates.isEmpty()) {
            return null;
        }

        // Đánh giá và chọn slot tốt nhất
        int bestNewSlot = -1;
        double bestScore = Double.MAX_VALUE;

        for (Integer candidateSlot : candidates) {
            if (!state.canAssignSlot(className, candidateSlot)) {
                continue;
            }

            double score = evaluateSlotScore(candidateSlot);
            if (score < bestScore) {
                bestScore = score;
                bestNewSlot = candidateSlot;
            }
        }

        if (bestNewSlot == -1) {
            return null;
        }

        // Tạo chromosome mới
        Chromosome newChromosome = chromosome.copy();
        Set<Integer> newSlots = new HashSet<>(currentSlots);
        newSlots.remove(oldSlot);
        newSlots.add(bestNewSlot);
        newChromosome.getGenes().put(className, newSlots);
        newChromosome.setValid(true);

        return newChromosome;
    }

    /**
     * Đánh giá điểm cho một slot (lower = better)
     */
    private double evaluateSlotScore(int slotIndex) {
        double score = 0;
        int dayIndex = data.getDayFromSlot(slotIndex);

        // Penalty cho Saturday
        if (dayIndex == 5) {
            score += config.getSaturdayPenaltyWeight();
        }

        // Ưu tiên slots ở giữa ngày (không quá sớm, không quá muộn)
        int periodIndex = data.getPeriodFromSlot(slotIndex);
        int midPeriod = data.getPeriodsPerDay() / 2;
        score += Math.abs(periodIndex - midPeriod) * 0.5;

        return score;
    }

    /**
     * Gap reduction local search
     * Cố gắng giảm gaps cho từng sinh viên
     */
    public Chromosome reduceGaps(Chromosome chromosome) {
        Chromosome improved = chromosome.copy();
        ScheduleState state = new ScheduleState(data);
        state.loadFromChromosome(improved);

        // Với mỗi sinh viên, tìm gaps và cố gắng compact
        for (Long studentId : data.getStudentEnrollments().keySet()) {
            for (int dayIndex = 0; dayIndex < data.getDaysPerWeek(); dayIndex++) {
                improved = compactStudentDay(improved, state, studentId, dayIndex);
            }
        }

        return improved;
    }

    /**
     * Compact slots của sinh viên trong một ngày để giảm gaps
     */
    private Chromosome compactStudentDay(
            Chromosome chromosome,
            ScheduleState state,
            Long studentId,
            int dayIndex) {

        int[] slotsInDay = state.getStudentSlotMasks().get(studentId)
                .getOccupiedSlotsInDay(dayIndex, data.getPeriodsPerDay());

        if (slotsInDay.length < 2) {
            return chromosome; // Không có gap
        }

        // Tìm classes có slot ở ngày này
        Set<String> studentClasses = data.getClassesOfStudent(studentId);

        // TODO: Implement slot compaction
        // Đây là phần phức tạp vì cần xem xét tất cả constraints

        return chromosome;
    }

    /**
     * Simulated Annealing inspired local search
     * Cho phép di chuyển đến solution tệ hơn với xác suất giảm dần
     */
    public Chromosome simulatedAnnealingSearch(Chromosome chromosome, double initialTemp, double coolingRate) {
        Chromosome current = chromosome.copy();
        Chromosome best = current.copy();

        double currentFitness = fitnessEvaluator.evaluate(current);
        double bestFitness = currentFitness;
        double temperature = initialTemp;

        int maxIterations = 100;

        for (int iter = 0; iter < maxIterations && temperature > 0.1; iter++) {
            // Tạo neighbor ngẫu nhiên
            Chromosome neighbor = generateRandomNeighbor(current);

            if (neighbor != null && neighbor.isValid()) {
                double neighborFitness = fitnessEvaluator.evaluate(neighbor);
                double delta = neighborFitness - currentFitness;

                // Chấp nhận nếu tốt hơn hoặc theo xác suất Boltzmann
                if (delta < 0 || random.nextDouble() < Math.exp(-delta / temperature)) {
                    current = neighbor;
                    currentFitness = neighborFitness;

                    if (currentFitness < bestFitness) {
                        best = current.copy();
                        bestFitness = currentFitness;
                    }
                }
            }

            temperature *= coolingRate;
        }

        return best;
    }

    /**
     * Tạo neighbor ngẫu nhiên
     */
    private Chromosome generateRandomNeighbor(Chromosome chromosome) {
        List<String> classes = new ArrayList<>(chromosome.getAllClassNames());
        String randomClass = classes.get(random.nextInt(classes.size()));

        Set<Integer> currentSlots = chromosome.getSlotsForClass(randomClass);
        if (currentSlots.isEmpty())
            return null;

        List<Integer> slotList = new ArrayList<>(currentSlots);
        int randomSlot = slotList.get(random.nextInt(slotList.size()));

        return trySwapSlot(chromosome, randomClass, randomSlot);
    }
}
