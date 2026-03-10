package com.fams.backend.service.timetable.ga.core;

import com.fams.backend.service.timetable.ga.fitness.FitnessEvaluator;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import com.fams.backend.service.timetable.ga.operator.CrossoverOperator;
import com.fams.backend.service.timetable.ga.operator.LocalSearchOperator;
import com.fams.backend.service.timetable.ga.operator.MutationOperator;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * GeneticAlgorithm - Core GA Engine
 * 
 * Kiến trúc:
 * Preprocessing → Slot Assignment GA (Hard-safe) → Soft Optimization → Room
 * Assignment → Final Polish
 * 
 * Nguyên tắc cốt lõi: "Thời khóa biểu đúng trước – đẹp sau"
 */
@Slf4j
public class GeneticAlgorithm {

    private final TimetableData data;
    private final GAConfig config;

    private final PopulationInitializer initializer;
    private final SelectionOperator selector;
    private final CrossoverOperator crossover;
    private final MutationOperator mutation;
    private final LocalSearchOperator localSearch;
    private final FitnessEvaluator fitnessEvaluator;

    private final List<Chromosome> population;
    private final List<GenerationStats> history;

    private int currentGeneration;
    private int stagnationCounter;
    private double bestFitness;
    private Chromosome bestChromosome;

    private volatile boolean running;
    private Consumer<GAProgress> progressCallback;

    public GeneticAlgorithm(TimetableData data, GAConfig config) {
        this.data = data;
        this.config = config;

        this.initializer = new PopulationInitializer(data, config);
        this.selector = new SelectionOperator(config);
        this.crossover = new CrossoverOperator(data, config);
        this.mutation = new MutationOperator(data, config, config.getMutationRate());
        this.fitnessEvaluator = new FitnessEvaluator(data, config);
        this.localSearch = new LocalSearchOperator(data, config, fitnessEvaluator);

        this.population = new ArrayList<>();
        this.history = new ArrayList<>();

        this.currentGeneration = 0;
        this.stagnationCounter = 0;
        this.bestFitness = Double.MAX_VALUE;
        this.running = false;
    }

    /**
     * Chạy GA và trả về best solution
     */
    public GAResult run() {
        Instant startTime = Instant.now();
        running = true;

        log.info("Starting GA with {} classes, {} students",
                data.getClasses().size(),
                data.getStudentEnrollments().size());

        // Phase 1: Initialize population
        initializePopulation();

        if (population.isEmpty()) {
            log.error("Failed to create initial population");
            return GAResult.builder()
                    .success(false)
                    .message("Không thể tạo quần thể hợp lệ ban đầu")
                    .build();
        }

        // Evaluate initial population
        evaluatePopulation();
        updateBest();
        logGeneration();

        // Phase 2: Evolution loop
        while (shouldContinue()) {
            evolveGeneration();
            currentGeneration++;

            // Apply local search to best individuals periodically
            if (currentGeneration % 10 == 0 && config.isEnableLocalSearch()) {
                applyLocalSearch();
            }

            // Update progress
            reportProgress();

            if (currentGeneration % config.getLogInterval() == 0) {
                logGeneration();
            }
        }

        // Phase 3: Final polish
        if (bestChromosome != null && config.isEnableLocalSearch()) {
            bestChromosome = localSearch.improve(bestChromosome);
            fitnessEvaluator.evaluate(bestChromosome);
        }

        running = false;
        Duration duration = Duration.between(startTime, Instant.now());

        log.info("GA completed in {} ms. Best fitness: {}",
                duration.toMillis(), bestFitness);

        return GAResult.builder()
                .success(bestChromosome != null && bestChromosome.isValid())
                .bestChromosome(bestChromosome)
                .bestFitness(bestFitness)
                .totalGenerations(currentGeneration)
                .duration(duration)
                .history(new ArrayList<>(history))
                .message(bestChromosome != null && bestChromosome.isValid()
                        ? "Tạo thời khóa biểu thành công"
                        : "Không tìm thấy phương án thời khóa biểu hợp lệ")
                .build();
    }

    /**
     * Initialize population với valid chromosomes
     */
    private void initializePopulation() {
        log.info("Initializing population...");

        List<Chromosome> initial = initializer.initialize();
        population.addAll(initial);

        // Thêm một greedy chromosome để đảm bảo có solution tốt
        Chromosome greedy = initializer.createGreedyChromosome();
        if (greedy != null && greedy.isValid()) {
            population.add(greedy);
        }

        log.info("Initial population: {} chromosomes", population.size());
    }

    /**
     * Evaluate fitness cho toàn bộ population
     */
    private void evaluatePopulation() {
        fitnessEvaluator.evaluatePopulation(population);
    }

    /**
     * Cập nhật best chromosome
     */
    private void updateBest() {
        Chromosome currentBest = selector.getBest(population);

        if (currentBest != null && currentBest.getFitness() < bestFitness) {
            bestFitness = currentBest.getFitness();
            bestChromosome = currentBest.copy();
            stagnationCounter = 0;
        } else {
            stagnationCounter++;
        }

        // Adaptive mutation
        mutation.adaptMutationRate(bestFitness);
    }

    /**
     * Kiểm tra điều kiện tiếp tục
     */
    private boolean shouldContinue() {
        if (!running)
            return false;
        if (currentGeneration >= config.getMaxGenerations())
            return false;
        if (stagnationCounter >= config.getStagnationLimit())
            return false;
        if (bestFitness <= config.getTargetFitness())
            return false;

        return true;
    }

    /**
     * Tiến hóa một thế hệ
     */
    private void evolveGeneration() {
        List<Chromosome> offspring = new ArrayList<>();

        // Selection + Crossover
        int offspringNeeded = config.getPopulationSize() - config.getEliteCount();

        while (offspring.size() < offspringNeeded) {
            // Select parents
            List<Chromosome> parents = selector.select(population, 2);

            // Crossover
            List<Chromosome> children = crossover.crossover(parents.get(0), parents.get(1));

            // Mutation
            for (Chromosome child : children) {
                Chromosome mutated = mutation.mutate(child);
                if (mutated.isValid()) {
                    offspring.add(mutated);
                }
            }
        }

        // Evaluate offspring
        fitnessEvaluator.evaluatePopulation(offspring);

        // Survivor selection
        List<Chromosome> survivors = selector.selectSurvivors(
                population, offspring, config.getPopulationSize());

        // Update generation
        for (Chromosome c : survivors) {
            c.setGeneration(currentGeneration + 1);
        }

        population.clear();
        population.addAll(survivors);

        // Update best
        updateBest();

        // Record stats
        recordStats();
    }

    /**
     * Áp dụng local search cho top individuals
     */
    private void applyLocalSearch() {
        List<Chromosome> elite = selector.getElite(population, 3);

        for (int i = 0; i < elite.size() && i < population.size(); i++) {
            Chromosome improved = localSearch.improve(elite.get(i));
            fitnessEvaluator.evaluate(improved);

            if (improved.getFitness() < population.get(i).getFitness()) {
                population.set(i, improved);
            }
        }

        updateBest();
    }

    /**
     * Record statistics cho generation hiện tại
     */
    private void recordStats() {
        DoubleSummaryStatistics stats = population.stream()
                .filter(Chromosome::isValid)
                .mapToDouble(Chromosome::getFitness)
                .summaryStatistics();

        GenerationStats genStats = GenerationStats.builder()
                .generation(currentGeneration)
                .bestFitness(stats.getMin())
                .avgFitness(stats.getAverage())
                .worstFitness(stats.getMax())
                .validCount((int) population.stream().filter(Chromosome::isValid).count())
                .mutationRate(mutation.getCurrentMutationRate())
                .build();

        history.add(genStats);
    }

    /**
     * Log generation info
     */
    private void logGeneration() {
        if (!config.isVerbose())
            return;

        DoubleSummaryStatistics stats = population.stream()
                .filter(Chromosome::isValid)
                .mapToDouble(Chromosome::getFitness)
                .summaryStatistics();

        log.info("Gen {}: best={:.2f}, avg={:.2f}, valid={}/{}, stag={}, mutRate={:.3f}",
                currentGeneration,
                stats.getMin(),
                stats.getAverage(),
                population.stream().filter(Chromosome::isValid).count(),
                population.size(),
                stagnationCounter,
                mutation.getCurrentMutationRate());
    }

    /**
     * Report progress qua callback
     */
    private void reportProgress() {
        if (progressCallback == null)
            return;

        GAProgress progress = GAProgress.builder()
                .generation(currentGeneration)
                .maxGenerations(config.getMaxGenerations())
                .bestFitness(bestFitness)
                .stagnationCounter(stagnationCounter)
                .percentComplete((double) currentGeneration / config.getMaxGenerations() * 100)
                .build();

        progressCallback.accept(progress);
    }

    /**
     * Set progress callback
     */
    public void setProgressCallback(Consumer<GAProgress> callback) {
        this.progressCallback = callback;
    }

    /**
     * Stop GA
     */
    public void stop() {
        running = false;
    }

    /**
     * Check if running
     */
    public boolean isRunning() {
        return running;
    }

    // ==================== Result Classes ====================

    @Data
    @Builder
    public static class GAResult {
        private boolean success;
        private String message;
        private Chromosome bestChromosome;
        private double bestFitness;
        private int totalGenerations;
        private Duration duration;
        private List<GenerationStats> history;
    }

    @Data
    @Builder
    public static class GenerationStats {
        private int generation;
        private double bestFitness;
        private double avgFitness;
        private double worstFitness;
        private int validCount;
        private double mutationRate;
    }

    @Data
    @Builder
    public static class GAProgress {
        private int generation;
        private int maxGenerations;
        private double bestFitness;
        private int stagnationCounter;
        private double percentComplete;
    }
}
