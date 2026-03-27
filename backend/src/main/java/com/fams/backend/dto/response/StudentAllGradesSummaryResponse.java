package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for student's all grades summary across all semesters and
 * courses
 * Used for the comprehensive transcript view
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAllGradesSummaryResponse {
    private List<CourseGradeSummary> courses;
    private Integer totalCourses;
    private Integer passedCourses;
    private Integer failedCourses;
    private Integer pendingCourses;
    private Double gpa;  // Cumulative GPA hệ 10
    private Double gpa4; // Cumulative GPA hệ 4 (theo thang điểm chữ FPT)

    private String specializationName; // Tên chuyên ngành
    private String majorName; // Tên ngành

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseGradeSummary {
        private Integer no; // Row number (STT)
        private Integer term; // Term number (học kỳ thứ mấy)
        private String semesterCode; // Spring2023, Fall2022
        private String semesterName; // Tên học kỳ
        private String courseCode; // ENT503, VEV114...
        private String courseName; // Summit2, Vovinam 1...
        private Integer credits; // Số tín chỉ
        private String prerequisiteCodes; // Danh sách môn tiên quyết (codes)
        private String className; // Lớp
        private Double grade; // Điểm trung bình
        private String status; // PASSED / FAILED / PENDING / STUDYING
        private Boolean gradesPublished; // Đã công bố điểm chưa
        private Boolean isCalculatedInGpa; // Có tính GPA không
    }
}
