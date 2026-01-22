package com.fams.backend.service.timetable.ga.operator;

import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * CrossoverOperator - Toán tử lai ghép
 * 
 * Hỗ trợ:
 * - Day-based crossover: trao đổi tất cả slot của các ngày
 * - Class-group based crossover: trao đổi tất cả slot của nhóm lớp
 * 
 * NGUYÊN TẮC: Reject nếu vi phạm hard constraint
 */
@Slf4j
@RequiredArgsConstructor
public class CrossoverOperator {

    private final TimetableData data;
    private final GAConfig config;
    private final Random random = new Random();

    /**
     * Thực hiện crossover giữa 2 parents
     * 
     * @return List 2 offspring (hoặc copies của parents nếu crossover thất bại)
     */
    public List<Chromosome> crossover(Chromosome parent1, Chromosome parent2) {
        // Kiểm tra random có nên crossover không
        if (random.nextDouble() > config.getCrossoverRate()) {
            return List.of(parent1.copy(), parent2.copy());
        }

        return switch (config.getCrossoverType()) {
            case DAY_BASED -> dayBasedCrossover(parent1, parent2);
            case CLASS_GROUP -> classGroupCrossover(parent1, parent2);
        };
    }

    /**
     * Day-based Crossover
     * - Chọn ngẫu nhiên một số ngày
     * - Trao đổi tất cả slots của các ngày đó giữa 2 parents
     */
    private List<Chromosome> dayBasedCrossover(Chromosome parent1, Chromosome parent2) {
        Chromosome child1 = parent1.copy();
        Chromosome child2 = parent2.copy();

        // Chọn random 1-3 ngày để trao đổi
        int daysToSwap = random.nextInt(3) + 1;
        Set<Integer> swapDays = new HashSet<>();

        while (swapDays.size() < daysToSwap) {
            swapDays.add(random.nextInt(data.getDaysPerWeek()));
        }

        // Trao đổi slots cho từng class
        for (String className : data.getClassLecturer().keySet()) {
            Set<Integer> slots1 = new HashSet<>(child1.getSlotsForClass(className));
            Set<Integer> slots2 = new HashSet<>(child2.getSlotsForClass(className));

            Set<Integer> newSlots1 = new HashSet<>();
            Set<Integer> newSlots2 = new HashSet<>();

            for (Integer slot : slots1) {
                int day = data.getDayFromSlot(slot);
                if (swapDays.contains(day)) {
                    newSlots2.add(slot); // Chuyển sang child2
                } else {
                    newSlots1.add(slot); // Giữ ở child1
                }
            }

            for (Integer slot : slots2) {
                int day = data.getDayFromSlot(slot);
                if (swapDays.contains(day)) {
                    newSlots1.add(slot); // Chuyển sang child1
                } else {
                    newSlots2.add(slot); // Giữ ở child2
                }
            }

            child1.getGenes().put(className, newSlots1);
            child2.getGenes().put(className, newSlots2);
        }

        // Validate và repair nếu cần
        child1 = repairIfNeeded(child1);
        child2 = repairIfNeeded(child2);

        return List.of(child1, child2);
    }

    /**
     * Class-group Crossover
     * - Chia classes thành 2 nhóm
     * - Trao đổi tất cả slots của một nhóm giữa 2 parents
     */
    private List<Chromosome> classGroupCrossover(Chromosome parent1, Chromosome parent2) {
        Chromosome child1 = new Chromosome();
        Chromosome child2 = new Chromosome();

        List<String> allClasses = new ArrayList<>(data.getClassLecturer().keySet());
        Collections.shuffle(allClasses, random);

        // Chia thành 2 nhóm tại crossover point
        int crossoverPoint = random.nextInt(allClasses.size());

        for (int i = 0; i < allClasses.size(); i++) {
            String className = allClasses.get(i);

            if (i < crossoverPoint) {
                // Nhóm 1: child1 lấy từ parent1, child2 lấy từ parent2
                child1.getGenes().put(className, new HashSet<>(parent1.getSlotsForClass(className)));
                child2.getGenes().put(className, new HashSet<>(parent2.getSlotsForClass(className)));
            } else {
                // Nhóm 2: đổi ngược lại
                child1.getGenes().put(className, new HashSet<>(parent2.getSlotsForClass(className)));
                child2.getGenes().put(className, new HashSet<>(parent1.getSlotsForClass(className)));
            }
        }

        // Validate và repair
        child1 = repairIfNeeded(child1);
        child2 = repairIfNeeded(child2);

        return List.of(child1, child2);
    }

    /**
     * Kiểm tra và repair chromosome nếu vi phạm hard constraint
     * Trả về chromosome gốc nếu không thể repair
     */
    private Chromosome repairIfNeeded(Chromosome chromosome) {
        ScheduleState state = new ScheduleState(data);
        Chromosome repaired = new Chromosome();
        repaired.setId(chromosome.getId());
        repaired.setGeneration(chromosome.getGeneration());

        // Sắp xếp classes theo conflict potential
        List<TimetableData.ClassInfo> sortedClasses = new ArrayList<>(data.getClasses());
        sortedClasses.sort((c1, c2) -> Integer.compare(
                data.getConflictPotential(c2.getClassName()),
                data.getConflictPotential(c1.getClassName())));

        for (TimetableData.ClassInfo classInfo : sortedClasses) {
            String className = classInfo.getClassName();
            Set<Integer> originalSlots = chromosome.getSlotsForClass(className);
            Set<Integer> assignedSlots = new HashSet<>();

            // Thử gán các slot ban đầu
            for (Integer slot : originalSlots) {
                if (state.canAssignSlot(className, slot)) {
                    state.assignSlot(className, slot);
                    assignedSlots.add(slot);
                }
            }

            // Nếu thiếu slot, thử gán thêm
            int slotsNeeded = data.getSlotPerSubjectPerWeek();
            if (assignedSlots.size() < slotsNeeded) {
                List<Integer> available = state.getAvailableSlots(className);
                Collections.shuffle(available, random);

                for (Integer slot : available) {
                    if (assignedSlots.size() >= slotsNeeded)
                        break;

                    if (state.canAssignSlot(className, slot)) {
                        state.assignSlot(className, slot);
                        assignedSlots.add(slot);
                    }
                }
            }

            // Nếu vẫn không đủ -> chromosome không hợp lệ
            if (assignedSlots.size() < slotsNeeded) {
                repaired.setValid(false);
                // Vẫn gán những gì có
            }

            repaired.getGenes().put(className, assignedSlots);
        }

        repaired.setValid(state.isComplete());
        return repaired;
    }

    /**
     * Uniform Crossover (alternative method)
     * Mỗi class có 50% chance được lấy từ parent1 hoặc parent2
     */
    public List<Chromosome> uniformCrossover(Chromosome parent1, Chromosome parent2) {
        Chromosome child1 = new Chromosome();
        Chromosome child2 = new Chromosome();

        for (String className : data.getClassLecturer().keySet()) {
            if (random.nextBoolean()) {
                child1.getGenes().put(className, new HashSet<>(parent1.getSlotsForClass(className)));
                child2.getGenes().put(className, new HashSet<>(parent2.getSlotsForClass(className)));
            } else {
                child1.getGenes().put(className, new HashSet<>(parent2.getSlotsForClass(className)));
                child2.getGenes().put(className, new HashSet<>(parent1.getSlotsForClass(className)));
            }
        }

        child1 = repairIfNeeded(child1);
        child2 = repairIfNeeded(child2);

        return List.of(child1, child2);
    }
}
