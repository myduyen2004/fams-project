package com.fams.backend.service.timetable.ga.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.*;

/**
 * Chromosome - Một phương án thời khóa biểu hoàn chỉnh
 * Encoding: Map<className, Set<slotIndex>>
 * 
 * Mỗi chromosome đại diện cho một bộ lịch học của toàn bộ các lớp trong học kỳ.
 * Điều kiện:
 * - Mỗi class có chính xác SLOT_PER_SUBJECT_PER_WEEK slot/tuần
 * - Không vi phạm bất kỳ hard constraint nào
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Chromosome implements Comparable<Chromosome> {

    /**
     * Gene encoding: className -> Set of slotIndex
     * Mỗi lớp học phần được gán một tập các slot trong tuần
     */
    @Builder.Default
    private Map<String, Set<Integer>> genes = new HashMap<>();

    /**
     * Fitness score (lower is better)
     * Đây chỉ là điểm soft constraint, không bao gồm hard constraint
     */
    private double fitness;

    /**
     * Đánh dấu chromosome này có hợp lệ không
     * true = không vi phạm hard constraint nào
     */
    @Builder.Default
    private boolean valid = true;

    /**
     * Penalty breakdown theo loại (để incremental update)
     */
    @Builder.Default
    private Map<String, Double> penaltyBreakdown = new HashMap<>();

    /**
     * Generation mà chromosome này được tạo ra
     */
    private int generation;

    /**
     * ID unique để tracking
     */
    @Builder.Default
    private String id = UUID.randomUUID().toString().substring(0, 8);

    /**
     * Deep copy constructor
     */
    public Chromosome copy() {
        Chromosome copy = new Chromosome();
        copy.setId(UUID.randomUUID().toString().substring(0, 8));
        copy.setGeneration(this.generation);
        copy.setFitness(this.fitness);
        copy.setValid(this.valid);

        // Deep copy genes
        Map<String, Set<Integer>> genesCopy = new HashMap<>();
        for (Map.Entry<String, Set<Integer>> entry : this.genes.entrySet()) {
            genesCopy.put(entry.getKey(), new HashSet<>(entry.getValue()));
        }
        copy.setGenes(genesCopy);

        // Copy penalty breakdown
        copy.setPenaltyBreakdown(new HashMap<>(this.penaltyBreakdown));

        return copy;
    }

    /**
     * Lấy các slot được gán cho một lớp
     */
    public Set<Integer> getSlotsForClass(String className) {
        return genes.getOrDefault(className, Collections.emptySet());
    }

    /**
     * Gán slot cho lớp
     */
    public void assignSlot(String className, int slotIndex) {
        genes.computeIfAbsent(className, k -> new HashSet<>()).add(slotIndex);
    }

    /**
     * Xóa slot khỏi lớp
     */
    public void removeSlot(String className, int slotIndex) {
        Set<Integer> slots = genes.get(className);
        if (slots != null) {
            slots.remove(slotIndex);
        }
    }

    /**
     * Đếm tổng số slot được gán
     */
    public int getTotalAssignedSlots() {
        return genes.values().stream()
                .mapToInt(Set::size)
                .sum();
    }

    /**
     * Kiểm tra lớp có đủ slot chưa
     */
    public boolean hasEnoughSlots(String className, int requiredSlots) {
        Set<Integer> slots = genes.get(className);
        return slots != null && slots.size() >= requiredSlots;
    }

    /**
     * Lấy danh sách tất cả class names
     */
    public Set<String> getAllClassNames() {
        return genes.keySet();
    }

    @Override
    public int compareTo(Chromosome other) {
        // Lower fitness is better
        return Double.compare(this.fitness, other.fitness);
    }

    @Override
    public String toString() {
        return String.format("Chromosome[%s](gen=%d, fitness=%.2f, valid=%b, classes=%d)",
                id, generation, fitness, valid, genes.size());
    }
}
