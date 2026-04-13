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
    private List<DashboardNotificationResponse> notifications;
    private Integer unreadNotificationsCount;
    private AttendanceStatsDTO attendanceStats;
    private List<RunningRoomDTO> runningRooms;
    private Integer totalRunningRooms;
    private List<WeeklyAttendanceDTO> weeklyAttendance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RunningRoomDTO {
        private String roomName;
        private String lecturerName;
        private Double attendancePercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardStats {
        private Long totalStudents;
        private Long totalLecturers;
        private Long totalRequests;
        private List<GroupedStatDTO> studentStats;
        private List<GroupedStatDTO> lecturerStats;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
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
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceStatsDTO {
        private Integer present;
        private Integer absent;
        private String date;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyAttendanceDTO {
        private String day; // "Thứ 2", "Thứ 3", etc.
        private String date; // "dd/MM"
        private Double absencePercentage;
    }
}
