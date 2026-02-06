package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeOverviewResponse {
    // Class information
    private String className;
    private String courseName;
    private String courseCode;
    private String semesterName;
    private String status;
    private Integer totalStudents;

    // Grade components for this course (column headers)
    private List<GradeComponentInfo> gradeComponents;

    // Student grades (rows)
    private List<StudentGradeRowDTO> studentGrades;

    // Statistics
    private Double averageGrade;
    private Double passRate;
    private String lastUpdated;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GradeComponentInfo {
        private Long id;
        private String name;
        private String type;
        private Double weight;
        private Boolean isRequired;
        private Boolean isResit;
    }
}
