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
public class StudentMyGradeResponse {
    private String className;
    private String courseName;
    private String courseCode;
    private String semesterName;
    private String semesterCode;
    private List<GradeCategoryDTO> gradeCategories;
    private Double courseAverage;
    private String courseStatus; // PASSED, FAILED, PENDING
    private Boolean gradesPublished;
    private String lastUpdatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GradeCategoryDTO {
        private String categoryName;
        private List<GradeItemDTO> items;
        private Double totalWeight;
        private Double totalValue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GradeItemDTO {
        private String itemName;
        private Double weight;
        private Double value;
        private String comment;
        private Boolean isPublished;
    }
}
