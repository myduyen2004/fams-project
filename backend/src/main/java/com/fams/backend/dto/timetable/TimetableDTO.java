package com.fams.backend.dto.timetable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * DTOs for Timetable Generation API
 */
public class TimetableDTO {

    // ==================== Request DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateRequest {
        private String semesterCode;
        private GAConfigDTO config;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateSlotRequest {
        @jakarta.validation.constraints.NotNull(message = "Date is required")
        private LocalDate date;

        @jakarta.validation.constraints.NotNull(message = "Slot number is required")
        private Integer slotNumber;

        @jakarta.validation.constraints.NotNull(message = "Room ID is required")
        private Long roomId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GAConfigDTO {
        private Integer populationSize;
        private Integer eliteCount;
        private Integer maxGenerations;
        private Integer stagnationLimit;
        private Double targetFitness;
        private Double crossoverRate;
        private String crossoverType; // DAY_BASED, CLASS_GROUP
        private Double mutationRate;
        private Double minMutationRate;
        private Double maxMutationRate;
        private String selectionType; // TOURNAMENT, ROULETTE
        private Integer tournamentSize;
        private Double saturdayPenaltyWeight;
        private Double gapPenaltyWeight;
        private Double overloadPenaltyWeight;
        private Integer studentWeeklyOverloadThreshold;
        private Integer lecturerWeeklyOverloadThreshold;
        private Boolean enableLocalSearch;
        private Boolean verbose;
    }

    // ==================== Response DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateResponse {
        private boolean success;
        private String jobId;
        private String message;
        private double fitness;
        private int totalGenerations;
        private long durationMs;
        private int totalSlots;
        private int totalClasses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobStatusResponse {
        private String jobId;
        private String semesterCode;
        private String status;
        private String phase;
        private int currentGeneration;
        private double bestFitness;
        private double percentComplete;
        private long startTime;
        private long endTime;
        private String errorMessage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimetableSlotDTO {
        private Long id;
        private String classSectionId; // For mobile app navigation
        private String className;
        private String courseCode;
        private String courseName;
        private String lecturerName;
        private String roomCode;
        private String roomName;
        private LocalDate date;
        private int dayOfWeek;
        private int slotNumber;
        private LocalTime startTime;
        private LocalTime endTime;
        private String status;
        private String attendanceStatus;
        private java.time.LocalDateTime checkInTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyTimetableDTO {
        private LocalDate weekStartDate;
        private LocalDate weekEndDate;
        private List<DailyTimetableDTO> days;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTimetableDTO {
        private LocalDate date;
        private int dayOfWeek;
        private String dayName;
        private List<TimetableSlotDTO> slots;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimetableStatsDTO {
        private String semesterCode;
        private int totalClasses;
        private int totalSlots;
        private int totalStudents;
        private int totalLecturers;
        private int saturdaySlots;
        private double averageGapsPerStudent;
        private double overloadedStudentPercent;
        private double fitness;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConflictDTO {
        private String type; // STUDENT, LECTURER, ROOM
        private String entityName;
        private Long entityId;
        private List<TimetableSlotDTO> conflictingSlots;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationResultDTO {
        private boolean valid;
        private int hardViolations;
        private int softViolations;
        private double fitness;
        private List<String> violations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AvailabilityResponse {
        private List<Integer> availableSlots;
        private List<RoomDTO> allRooms;
        private java.util.Map<Integer, List<Long>> occupiedRoomIdsBySlot;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomDTO {
        private Long id;
        private String code;
        private String name;
        private Integer capacity;
    }
}
