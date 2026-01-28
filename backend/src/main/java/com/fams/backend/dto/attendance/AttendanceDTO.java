package com.fams.backend.dto.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
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
        private String qrCodeData;
        private LocalDateTime qrExpiresAt;
        private LocalDateTime openedAt;
        private LocalDateTime closedAt;
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
        private LocalDateTime checkInTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckInRequest {
        private String qrCode;
        private Double latitude;
        private Double longitude;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckInResponse {
        private String status; // SUCCESS, LATE, etc.
        private String message;
        private String courseName;
        private String sessionTime;
    }
}
