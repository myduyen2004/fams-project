package com.fams.backend.service.timetable.ga.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GAConfig - Cấu hình tham số cho Genetic Algorithm
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GAConfig {

    // ==================== POPULATION ====================

    /**
     * Kích thước quần thể (reduced for better performance)
     */
    @Builder.Default
    private int populationSize = 50;

    /**
     * Số elite được giữ lại qua các thế hệ
     */
    @Builder.Default
    private int eliteCount = 5;

    // ==================== EVOLUTION ====================

    /**
     * Số thế hệ tối đa
     */
    @Builder.Default
    private int maxGenerations = 500;

    /**
     * Điều kiện dừng: không cải thiện sau N thế hệ
     */
    @Builder.Default
    private int stagnationLimit = 50;

    /**
     * Fitness target (dừng nếu đạt được)
     */
    @Builder.Default
    private double targetFitness = 0.0;

    // ==================== CROSSOVER ====================

    /**
     * Tỷ lệ crossover (0.0 - 1.0)
     */
    @Builder.Default
    private double crossoverRate = 0.8;

    /**
     * Loại crossover: DAY_BASED, CLASS_GROUP
     */
    @Builder.Default
    private CrossoverType crossoverType = CrossoverType.DAY_BASED;

    // ==================== MUTATION ====================

    /**
     * Tỷ lệ mutation ban đầu (0.0 - 1.0)
     */
    @Builder.Default
    private double mutationRate = 0.1;

    /**
     * Tỷ lệ mutation tối thiểu (adaptive)
     */
    @Builder.Default
    private double minMutationRate = 0.01;

    /**
     * Tỷ lệ mutation tối đa (adaptive)
     */
    @Builder.Default
    private double maxMutationRate = 0.3;

    /**
     * Số lần thử mutation tối đa trước khi rollback
     */
    @Builder.Default
    private int maxMutationAttempts = 10;

    // ==================== SELECTION ====================

    /**
     * Loại selection: TOURNAMENT, ROULETTE
     */
    @Builder.Default
    private SelectionType selectionType = SelectionType.TOURNAMENT;

    /**
     * Tournament size (cho TOURNAMENT selection)
     */
    @Builder.Default
    private int tournamentSize = 3;

    // ==================== SOFT CONSTRAINT WEIGHTS ====================

    /**
     * W1: Penalty weight cho slot thứ 7 (SC-1)
     */
    @Builder.Default
    private double saturdayPenaltyWeight = 10.0;

    /**
     * W2: Penalty weight cho gap trong ngày (SC-2)
     */
    @Builder.Default
    private double gapPenaltyWeight = 5.0;

    /**
     * W3: Penalty weight cho quá tải tuần (SC-3)
     */
    @Builder.Default
    private double overloadPenaltyWeight = 15.0;

    /**
     * Ngưỡng overload sinh viên (slot/tuần)
     */
    @Builder.Default
    private int studentWeeklyOverloadThreshold = 15;

    /**
     * Ngưỡng overload giảng viên (slot/tuần)
     */
    @Builder.Default
    private int lecturerWeeklyOverloadThreshold = 20;

    // ==================== LOCAL SEARCH ====================

    /**
     * Có áp dụng local search không
     */
    @Builder.Default
    private boolean enableLocalSearch = true;

    /**
     * Số iteration local search mỗi thế hệ
     */
    @Builder.Default
    private int localSearchIterations = 5;

    // ==================== PARALLEL PROCESSING ====================

    /**
     * Số thread cho parallel fitness evaluation
     */
    @Builder.Default
    private int parallelThreads = 4;

    // ==================== LOGGING ====================

    /**
     * Log tiến độ mỗi N thế hệ
     */
    @Builder.Default
    private int logInterval = 10;

    /**
     * Verbose mode
     */
    @Builder.Default
    private boolean verbose = true;

    // ==================== ENUMS ====================

    public enum CrossoverType {
        DAY_BASED, // Crossover theo ngày
        CLASS_GROUP // Crossover theo nhóm lớp
    }

    public enum SelectionType {
        TOURNAMENT, // Tournament selection
        ROULETTE // Roulette wheel selection
    }

    // ==================== FACTORY METHODS ====================

    /**
     * Cấu hình mặc định
     */
    public static GAConfig defaultConfig() {
        return GAConfig.builder().build();
    }

    /**
     * Cấu hình cho dataset nhỏ (< 50 classes)
     */
    public static GAConfig smallDatasetConfig() {
        return GAConfig.builder()
                .populationSize(50)
                .maxGenerations(200)
                .stagnationLimit(30)
                .build();
    }

    /**
     * Cấu hình cho dataset lớn (> 200 classes)
     */
    public static GAConfig largeDatasetConfig() {
        return GAConfig.builder()
                .populationSize(200)
                .maxGenerations(1000)
                .stagnationLimit(100)
                .parallelThreads(8)
                .build();
    }

    /**
     * Cấu hình tối ưu hóa nhanh (chất lượng thấp hơn)
     */
    public static GAConfig fastConfig() {
        return GAConfig.builder()
                .populationSize(30)
                .maxGenerations(100)
                .stagnationLimit(20)
                .enableLocalSearch(false)
                .build();
    }
}
