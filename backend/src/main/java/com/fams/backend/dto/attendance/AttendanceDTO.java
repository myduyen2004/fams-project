package com.fams.backend.dto.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class AttendanceDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StartSessionRequest {
        private Long slotId;
        private Double latitude;
        private Double longitude;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionDetailResponse {
        private Long sessionId;
        private Long slotId;
        private String courseCode;
        private String courseName;
        private String className;
        private String roomCode;
        private String lecturerName;
        private String status; // OPEN, CLOSED
        private LocalDateTime openedAt;
        private LocalDateTime closedAt;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer totalStudents;
        private Integer presentCount;
        private List<StudentAttendanceResponse> students;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentAttendanceResponse {
        private Long studentId;
        private String studentCode;
        private String fullName;
        private String avatarUrl; // Optional
        private String status; // PRESENT, ABSENT, etc.
        private String checkInMethod; // FACE, MANUAL, etc.
        private LocalDateTime checkInTime;
        private String capturedFaceUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualAttendanceRequest {
        private Long sessionId;
        private Long slotId;
        private Long studentId;
        private String status; // PRESENT, ABSENT, EXCUSED
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassAttendanceReportResponse {
        private String className;
        private String courseCode;
        private String courseName;
        private String semesterName;
        private List<SlotInfo> slots;
        private List<StudentReport> studentReports;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotInfo {
        private Long slotId;
        private Integer slotIndex;
        private LocalDate date;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentReport {
        private Long studentId;
        private String studentCode;
        private String studentName;
        private String avatarUrl;
        private Double absentPercentage;
        private List<AttendanceDetail> attendanceDetails;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceDetail {
        private Long slotId;
        private Integer slotIndex;
        private String status; // 'P', 'A', 'E' or null
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentAttendanceSummaryResponse {
        private String studentName;
        private String studentCode;
        private String semesterName;
        private List<ClassAttendanceSummary> classSummaries;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassAttendanceSummary {
        private String className;
        private String courseCode;
        private String courseName;
        private String lecturerName;
        private Integer totalSlots;
        private Integer totalSessionsHeld; // Sessions already occurred
        private Integer presentCount;
        private Integer unexcusedAbsentCount; // Unexcused
        private Integer excusedAbsentCount; // Excused
        private Double attendancePercentage; // (Present + Excused) / TotalHeld
        private Double absentPercentage; // Unexcused / TotalSlots (Threshold check)
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IndividualAttendanceDetail {
        private String className;
        private String courseCode;
        private String courseName;
        private List<IndividualSlotAttendance> slots;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IndividualSlotAttendance {
        private Long slotId;
        private Integer slotIndex;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private String roomCode;
        private String status; // 'PRESENT', 'ABSENT', 'EXCUSED', 'FUTURE'
        private String lecturerName;
    }
}
