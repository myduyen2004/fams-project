package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentGradeRowDTO {
    private Long enrollmentId;
    private String studentCode;
    private String studentName;
    private String studentEmail;
    private String enrollmentStatus;

    // Map of gradeComponentId -> score (null if not graded)
    private Map<Long, Double> grades;

    // Calculated final grade (weighted average)
    private Double finalGrade;

    // Pass/Fail status based on final grade
    private Boolean isPassing;
}
