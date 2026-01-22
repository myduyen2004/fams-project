package com.fams.backend.service.timetable.ga.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.*;

/**
 * TimetableData - Dữ liệu đầu vào để tạo thời khóa biểu
 * Chứa tất cả thông tin cần thiết để GA hoạt động
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableData {

    // ==================== SEMESTER CONFIG ====================
    private String semesterCode;
    private LocalDate semesterStartDate;
    private LocalDate semesterEndDate;

    /**
     * Số slot tối đa mỗi sinh viên được học trong 1 ngày
     * HC-2: MAX_SLOT_PER_DAY
     */
    private int maxSlotPerDay;

    /**
     * Số slot mỗi môn học trong 1 tuần
     * HC-3: SLOT_PER_SUBJECT_PER_WEEK
     */
    private int slotPerSubjectPerWeek;

    /**
     * Số periods trong 1 ngày (6 slots thông thường)
     */
    private int periodsPerDay;

    /**
     * Số ngày học trong tuần (5 hoặc 6 ngày)
     */
    private int daysPerWeek;

    // ==================== CLASS SECTIONS ====================
    /**
     * Danh sách các class section cần xếp lịch
     */
    @Builder.Default
    private List<ClassInfo> classes = new ArrayList<>();

    // ==================== ENROLLMENTS ====================
    /**
     * Mapping: studentId -> Set<className>
     * Sinh viên đăng ký những lớp nào
     */
    @Builder.Default
    private Map<Long, Set<String>> studentEnrollments = new HashMap<>();

    /**
     * Mapping: className -> Set<studentId>
     * Lớp có những sinh viên nào
     */
    @Builder.Default
    private Map<String, Set<Long>> classStudents = new HashMap<>();

    // ==================== LECTURER ASSIGNMENTS ====================
    /**
     * Mapping: lecturerId -> Set<className>
     * Giảng viên dạy những lớp nào
     */
    @Builder.Default
    private Map<Long, Set<String>> lecturerClasses = new HashMap<>();

    /**
     * Mapping: className -> lecturerId
     * Lớp do giảng viên nào dạy
     */
    @Builder.Default
    private Map<String, Long> classLecturer = new HashMap<>();

    // ==================== VALID SLOTS ====================
    /**
     * Set các slotIndex hợp lệ trong tuần (HC-5)
     * Loại trừ các slot không nằm trong ngày học hợp lệ
     */
    @Builder.Default
    private Set<Integer> validSlotIndices = new HashSet<>();

    /**
     * Set các ngày (dayIndex) được phép học trong tuần
     * 0=Monday, ..., 6=Sunday
     */
    @Builder.Default
    private Set<Integer> validWeekdays = new HashSet<>();

    // ==================== HOLIDAYS ====================
    /**
     * Set các ngày nghỉ (LocalDate) trong học kỳ (HC-4)
     */
    @Builder.Default
    private Set<LocalDate> holidays = new HashSet<>();

    // ==================== ROOMS (for later assignment) ====================
    /**
     * Danh sách phòng học có sẵn
     */
    @Builder.Default
    private List<RoomInfo> rooms = new ArrayList<>();

    // ==================== HELPER METHODS ====================

    /**
     * Tổng số slot trong 1 tuần
     */
    public int getTotalSlotsPerWeek() {
        return daysPerWeek * periodsPerDay;
    }

    /**
     * Convert slotIndex -> dayIndex
     */
    public int getDayFromSlot(int slotIndex) {
        return slotIndex / periodsPerDay;
    }

    /**
     * Convert slotIndex -> periodIndex
     */
    public int getPeriodFromSlot(int slotIndex) {
        return slotIndex % periodsPerDay;
    }

    /**
     * Convert (day, period) -> slotIndex
     */
    public int getSlotIndex(int dayIndex, int periodIndex) {
        return dayIndex * periodsPerDay + periodIndex;
    }

    /**
     * Kiểm tra slot có hợp lệ không
     */
    public boolean isValidSlot(int slotIndex) {
        return validSlotIndices.contains(slotIndex);
    }

    /**
     * Lấy tất cả sinh viên của một lớp
     */
    public Set<Long> getStudentsOfClass(String className) {
        return classStudents.getOrDefault(className, Collections.emptySet());
    }

    /**
     * Lấy tất cả lớp của một sinh viên
     */
    public Set<String> getClassesOfStudent(Long studentId) {
        return studentEnrollments.getOrDefault(studentId, Collections.emptySet());
    }

    /**
     * Lấy giảng viên của một lớp
     */
    public Long getLecturerOfClass(String className) {
        return classLecturer.get(className);
    }

    /**
     * Lấy tất cả lớp của một giảng viên
     */
    public Set<String> getClassesOfLecturer(Long lecturerId) {
        return lecturerClasses.getOrDefault(lecturerId, Collections.emptySet());
    }

    /**
     * Đếm số xung đột tiềm năng cho một lớp
     * (số sinh viên * số lớp khác sinh viên đó học)
     */
    public int getConflictPotential(String className) {
        Set<Long> students = classStudents.get(className);
        if (students == null)
            return 0;

        int conflicts = 0;
        for (Long studentId : students) {
            Set<String> otherClasses = studentEnrollments.get(studentId);
            if (otherClasses != null) {
                conflicts += otherClasses.size() - 1; // -1 vì không tính chính nó
            }
        }
        return conflicts;
    }

    // ==================== INNER CLASSES ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassInfo {
        private String className;
        private String courseCode;
        private String courseName;
        private Long lecturerId;
        private String lecturerName;
        private int numberOfSlots; // Tổng slot trong kỳ
        private int slotsPerWeek; // Slot/tuần
        private int currentEnrollment; // Số SV đăng ký
        private int maxStudents;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomInfo {
        private Long id;
        private String code;
        private String name;
        private int capacity;
        private String type;
        private String building;
    }
}
