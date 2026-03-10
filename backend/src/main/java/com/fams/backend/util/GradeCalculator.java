package com.fams.backend.util;

import java.util.Map;

/**
 * Utility for grade-related calculations
 */
public class GradeCalculator {

    /**
     * Calculate weighted average from a map of scores and weights.
     * Denominator is 100.0 (total weight of a course).
     * 
     * @param scoresMap  Map of componentId -> score
     * @param weightsMap Map of componentId -> weight
     * @return Calculated average OR null if no scores are present
     */
    public static Double calculateAverage(Map<Long, Double> scoresMap, Map<Long, Double> weightsMap) {
        if (scoresMap == null || scoresMap.isEmpty() || weightsMap == null) {
            return null;
        }

        double weightedSum = 0;
        boolean hasAnyGrade = false;

        for (Map.Entry<Long, Double> entry : scoresMap.entrySet()) {
            Long componentId = entry.getKey();
            Double score = entry.getValue();
            Double weight = weightsMap.get(componentId);

            if (score != null && weight != null) {
                weightedSum += score * weight;
                hasAnyGrade = true;
            }
        }

        if (!hasAnyGrade) {
            return null;
        }

        // Standard calculation: Sum(Score * Weight) / 100.0
        // This ensures missing components weigh down the average.
        double rawAverage = weightedSum / 100.0;

        return roundToFirstDecimal(rawAverage);
    }

    /**
     * Round a double value to one decimal place
     */
    public static Double roundToFirstDecimal(Double value) {
        if (value == null)
            return null;
        return Math.round(value * 10.0) / 10.0;
    }
}
