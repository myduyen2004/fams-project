package com.fams.backend.util;

import org.junit.jupiter.api.Test;
import java.util.HashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class GradeCalculatorTest {

    @Test
    void testCalculateAverage_AllPresent() {
        Map<Long, Double> scores = new HashMap<>();
        scores.put(1L, 10.0);
        scores.put(2L, 10.0);

        Map<Long, Double> weights = new HashMap<>();
        weights.put(1L, 50.0);
        weights.put(2L, 50.0);

        Double result = GradeCalculator.calculateAverage(scores, weights);
        assertEquals(10.0, result);
    }

    @Test
    void testCalculateAverage_SomeMissing() {
        // Only 50% weight is present with score 10.0
        // Expected: (10 * 50) / 100 = 5.0
        Map<Long, Double> scores = new HashMap<>();
        scores.put(1L, 10.0);

        Map<Long, Double> weights = new HashMap<>();
        weights.put(1L, 50.0);
        weights.put(2L, 50.0);

        Double result = GradeCalculator.calculateAverage(scores, weights);
        assertEquals(5.0, result);
    }

    @Test
    void testCalculateAverage_Rounding() {
        // (8.5 * 30 + 7.2 * 70) / 100 = (255 + 504) / 1000 = 7.59 -> 7.6
        Map<Long, Double> scores = new HashMap<>();
        scores.put(1L, 8.5);
        scores.put(2L, 7.2);

        Map<Long, Double> weights = new HashMap<>();
        weights.put(1L, 30.0);
        weights.put(2L, 70.0);

        Double result = GradeCalculator.calculateAverage(scores, weights);
        assertEquals(7.6, result);
    }

    @Test
    void testCalculateAverage_Empty() {
        Map<Long, Double> scores = new HashMap<>();
        Map<Long, Double> weights = new HashMap<>();

        Double result = GradeCalculator.calculateAverage(scores, weights);
        assertNull(result);
    }

    @Test
    void testRoundToFirstDecimal() {
        assertEquals(7.6, GradeCalculator.roundToFirstDecimal(7.59));
        assertEquals(7.5, GradeCalculator.roundToFirstDecimal(7.54));
        // Standard Math.round(75.5)/10 = 76/10 = 7.6
        assertEquals(7.6, GradeCalculator.roundToFirstDecimal(7.55));
    }
}
