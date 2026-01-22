package com.fams.backend.service.timetable.ga.core;

import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * SelectionOperator - Toán tử chọn lọc
 * 
 * Hỗ trợ:
 * - Tournament Selection
 * - Roulette Wheel Selection
 * - Elite Selection (giữ lại N cá thể tốt nhất)
 */
@Slf4j
@RequiredArgsConstructor
public class SelectionOperator {

    private final GAConfig config;
    private final Random random = new Random();

    /**
     * Chọn lọc parents từ population
     * 
     * @param population Quần thể hiện tại
     * @param count      Số lượng cần chọn
     * @return Danh sách parents được chọn
     */
    public List<Chromosome> select(List<Chromosome> population, int count) {
        return switch (config.getSelectionType()) {
            case TOURNAMENT -> tournamentSelection(population, count);
            case ROULETTE -> rouletteSelection(population, count);
        };
    }

    /**
     * Tournament Selection
     * - Chọn ngẫu nhiên K cá thể
     * - Chọn cá thể tốt nhất trong K cá thể đó
     */
    private List<Chromosome> tournamentSelection(List<Chromosome> population, int count) {
        List<Chromosome> selected = new ArrayList<>();
        int tournamentSize = config.getTournamentSize();

        for (int i = 0; i < count; i++) {
            Chromosome winner = null;

            for (int j = 0; j < tournamentSize; j++) {
                int idx = random.nextInt(population.size());
                Chromosome candidate = population.get(idx);

                if (winner == null || candidate.getFitness() < winner.getFitness()) {
                    winner = candidate;
                }
            }

            selected.add(winner);
        }

        return selected;
    }

    /**
     * Roulette Wheel Selection
     * - Xác suất chọn tỷ lệ nghịch với fitness (lower fitness = higher probability)
     */
    private List<Chromosome> rouletteSelection(List<Chromosome> population, int count) {
        List<Chromosome> selected = new ArrayList<>();

        // Tính tổng inverse fitness
        double maxFitness = population.stream()
                .mapToDouble(Chromosome::getFitness)
                .max()
                .orElse(1.0);

        double[] inverseFitness = new double[population.size()];
        double totalInverse = 0;

        for (int i = 0; i < population.size(); i++) {
            // Inverse: cá thể có fitness thấp sẽ có inverse cao
            inverseFitness[i] = maxFitness - population.get(i).getFitness() + 1;
            totalInverse += inverseFitness[i];
        }

        // Cumulative probabilities
        double[] cumulative = new double[population.size()];
        cumulative[0] = inverseFitness[0] / totalInverse;
        for (int i = 1; i < population.size(); i++) {
            cumulative[i] = cumulative[i - 1] + inverseFitness[i] / totalInverse;
        }

        // Chọn ngẫu nhiên
        for (int i = 0; i < count; i++) {
            double r = random.nextDouble();

            for (int j = 0; j < population.size(); j++) {
                if (r <= cumulative[j]) {
                    selected.add(population.get(j));
                    break;
                }
            }
        }

        return selected;
    }

    /**
     * Lấy elite - N cá thể tốt nhất
     * 
     * @param population Quần thể
     * @param eliteCount Số elite cần giữ
     * @return Danh sách elite (deep copy)
     */
    public List<Chromosome> getElite(List<Chromosome> population, int eliteCount) {
        return population.stream()
                .filter(Chromosome::isValid)
                .sorted()
                .limit(eliteCount)
                .map(Chromosome::copy)
                .toList();
    }

    /**
     * Lấy cá thể tốt nhất
     */
    public Chromosome getBest(List<Chromosome> population) {
        return population.stream()
                .filter(Chromosome::isValid)
                .min(Comparator.comparingDouble(Chromosome::getFitness))
                .orElse(null);
    }

    /**
     * Survivor selection - chọn cá thể sống sót cho thế hệ sau
     * Kết hợp elite và offspring
     */
    public List<Chromosome> selectSurvivors(
            List<Chromosome> oldPopulation,
            List<Chromosome> offspring,
            int targetSize) {

        List<Chromosome> survivors = new ArrayList<>();

        // Giữ lại elite từ population cũ
        List<Chromosome> elite = getElite(oldPopulation, config.getEliteCount());
        survivors.addAll(elite);

        // Thêm offspring (ưu tiên valid)
        List<Chromosome> validOffspring = offspring.stream()
                .filter(Chromosome::isValid)
                .sorted()
                .toList();

        for (Chromosome child : validOffspring) {
            if (survivors.size() >= targetSize)
                break;
            survivors.add(child);
        }

        // Nếu chưa đủ, thêm từ population cũ
        List<Chromosome> remaining = oldPopulation.stream()
                .filter(c -> !elite.contains(c))
                .filter(Chromosome::isValid)
                .sorted()
                .toList();

        for (Chromosome c : remaining) {
            if (survivors.size() >= targetSize)
                break;
            survivors.add(c.copy());
        }

        return survivors;
    }
}
