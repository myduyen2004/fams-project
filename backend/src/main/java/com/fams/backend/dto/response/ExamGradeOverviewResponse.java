package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for exam grade overview by course and semester
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamGradeOverviewResponse {
    private String courseCode;
    private String courseName;
    private String semesterCode;
    private String semesterName;
    private Integer totalStudents;
    private Double averageGrade;
    private Double passRate;
    private String lastUpdated;

    // Grade components (ME, FE, PE for EXAM type; Resit for RESIT type)
    private List<ExamGradeComponentInfo> gradeComponents;

    // Student grades
    private List<ExamStudentGradeRow> studentGrades;

    // Publish status (grades visible to students - context aware)
    private Boolean gradesPublished;
    private String gradesPublishedAt;
    private String gradesPublishedBy;

    // Explicit statuses for both exam types
    private Boolean examGradesPublished;
    private Boolean resitGradesPublished;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamGradeComponentInfo {
        private Long id;
        private String name;
        private String type; // MID_TERM, FINAL_EXAM, PRACTICAL_EXAM, RESIT, PROGRESS_TEST, ASSIGNMENT, etc.
        private Double weight;
        private Boolean isResit;
        private Long referenceComponentId; // For resit, reference to original FE
        private Boolean isEditable; // true for ME, FE, PE - these can be imported by academic staff
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExamStudentGradeRow {
        private Long enrollmentId;
        private String studentCode;
        private String studentName;
        private String className; // Class section name
        private Map<Long, Double> grades; // componentId -> score
        private Double finalGrade; // Weighted average
        private String status; // PASSED, FAILED, PENDING
    }
}
