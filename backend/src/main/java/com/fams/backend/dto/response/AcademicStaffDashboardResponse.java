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
public class AcademicStaffDashboardResponse {
    private DashboardStats stats;
    private List<TopStudentDTO> topStudents;
    private List<NotificationResponse> notifications;
    private AttendanceStatsDTO attendanceStats;

    @Data
    @Builder
    public static class DashboardStats {
        private Integer totalStudents;
        private Integer totalLecturers;
    }

    @Data
    @Builder
    public static class TopStudentDTO {
        private Integer rank;
        private String name;
        private String className;
        private String email;
        private String course;
        private Double gpa;
        private Integer attendance;
    }

    @Data
    @Builder
    public static class AttendanceStatsDTO {
        private Integer present;
        private Integer absent;
        private String date;
    }
}
