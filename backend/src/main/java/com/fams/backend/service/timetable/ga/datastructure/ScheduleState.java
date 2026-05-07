package com.fams.backend.service.timetable.ga.datastructure;

import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * ScheduleState - Trạng thái hiện tại của thời khóa biểu
 * Lưu trữ và cập nhật các bitmask để kiểm tra constraint nhanh
 * 
 * Data structures (như yêu cầu):
 * - student_slot_mask[student_id]: BitSet theo slot
 * - student_day_count[student_id][day]: Số slot học trong ngày
 * - lecturer_slot_mask[lecturer_id]: BitSet theo slot
 * - class_slot_count[class_id]: Số slot đã gán cho lớp
 */
@Slf4j
@Getter
public class ScheduleState {

    private final TimetableData data;
    private final int totalSlots;
    private final int periodsPerDay;
    private final int daysPerWeek;

    // student_slot_mask[studentId] -> SlotMask
    private final Map<Long, SlotMask> studentSlotMasks;

    // student_day_count[studentId][dayIndex] -> count
    private final Map<Long, int[]> studentDayCounts;

    // lecturer_slot_mask[lecturerId] -> SlotMask
    private final Map<Long, SlotMask> lecturerSlotMasks;

    // class_slot_count[className] -> count
    private final Map<String, Integer> classSlotCounts;

    // class -> assigned slots
    private final Map<String, Set<Integer>> classSlots;

    /**
     * Constructor - khởi tạo state rỗng
     */
    public ScheduleState(TimetableData data) {
        this.data = data;
        this.periodsPerDay = data.getPeriodsPerDay();
        this.daysPerWeek = data.getDaysPerWeek();
        this.totalSlots = data.getTotalSlotsPerWeek();

        this.studentSlotMasks = new HashMap<>();
        this.studentDayCounts = new HashMap<>();
        this.lecturerSlotMasks = new HashMap<>();
        this.classSlotCounts = new HashMap<>();
        this.classSlots = new HashMap<>();

        // Khởi tạo masks cho tất cả students
        for (Long studentId : data.getStudentEnrollments().keySet()) {
            studentSlotMasks.put(studentId, new SlotMask(totalSlots));
            studentDayCounts.put(studentId, new int[daysPerWeek]);
        }

        // Khởi tạo masks cho tất cả lecturers
        for (Long lecturerId : data.getLecturerClasses().keySet()) {
            lecturerSlotMasks.put(lecturerId, new SlotMask(totalSlots));
        }

        // Khởi tạo slot counts cho tất cả classes
        for (TimetableData.ClassInfo classInfo : data.getClasses()) {
            classSlotCounts.put(classInfo.getClassName(), 0);
            classSlots.put(classInfo.getClassName(), new HashSet<>());
        }
    }

    /**
     * Copy constructor - deep copy
     */
    public ScheduleState(ScheduleState other) {
        this.data = other.data;
        this.periodsPerDay = other.periodsPerDay;
        this.daysPerWeek = other.daysPerWeek;
        this.totalSlots = other.totalSlots;

        // Deep copy student masks
        this.studentSlotMasks = new HashMap<>();
        for (Map.Entry<Long, SlotMask> entry : other.studentSlotMasks.entrySet()) {
            studentSlotMasks.put(entry.getKey(), entry.getValue().copy());
        }

        // Deep copy student day counts
        this.studentDayCounts = new HashMap<>();
        for (Map.Entry<Long, int[]> entry : other.studentDayCounts.entrySet()) {
            studentDayCounts.put(entry.getKey(), entry.getValue().clone());
        }

        // Deep copy lecturer masks
        this.lecturerSlotMasks = new HashMap<>();
        for (Map.Entry<Long, SlotMask> entry : other.lecturerSlotMasks.entrySet()) {
            lecturerSlotMasks.put(entry.getKey(), entry.getValue().copy());
        }

        // Deep copy class slot counts
        this.classSlotCounts = new HashMap<>(other.classSlotCounts);

        // Deep copy class slots
        this.classSlots = new HashMap<>();
        for (Map.Entry<String, Set<Integer>> entry : other.classSlots.entrySet()) {
            classSlots.put(entry.getKey(), new HashSet<>(entry.getValue()));
        }
    }

    // ==================== SLOT ASSIGNMENT ====================

    /**
     * Gán slot cho một class - cập nhật tất cả state
     * Giả định đã kiểm tra constraint trước khi gọi
     */
    public void assignSlot(String className, int slotIndex) {
        int dayIndex = slotIndex / periodsPerDay;

        // Cập nhật class slots
        classSlots.computeIfAbsent(className, k -> new HashSet<>()).add(slotIndex);
        classSlotCounts.merge(className, 1, Integer::sum);

        // Cập nhật student masks
        Set<Long> students = data.getStudentsOfClass(className);
        for (Long studentId : students) {
            SlotMask mask = studentSlotMasks.get(studentId);
            if (mask != null) {
                mask.occupy(slotIndex);
            }

            int[] dayCounts = studentDayCounts.get(studentId);
            if (dayCounts != null && dayIndex < dayCounts.length) {
                dayCounts[dayIndex]++;
            }
        }

        // Cập nhật lecturer mask
        Long lecturerId = data.getLecturerOfClass(className);
        if (lecturerId != null) {
            SlotMask mask = lecturerSlotMasks.get(lecturerId);
            if (mask != null) {
                mask.occupy(slotIndex);
            }
        }
    }

    /**
     * Xóa slot khỏi một class - rollback state
     */
    public void removeSlot(String className, int slotIndex) {
        int dayIndex = slotIndex / periodsPerDay;

        // Cập nhật class slots
        Set<Integer> slots = classSlots.get(className);
        if (slots != null) {
            slots.remove(slotIndex);
        }
        classSlotCounts.merge(className, -1, Integer::sum);

        // Cập nhật student masks
        Set<Long> students = data.getStudentsOfClass(className);
        for (Long studentId : students) {
            // Chỉ release nếu không có class khác của student ở slot này
            if (!hasOtherClassAtSlot(studentId, className, slotIndex)) {
                SlotMask mask = studentSlotMasks.get(studentId);
                if (mask != null) {
                    mask.release(slotIndex);
                }

                int[] dayCounts = studentDayCounts.get(studentId);
                if (dayCounts != null && dayIndex < dayCounts.length) {
                    dayCounts[dayIndex] = Math.max(0, dayCounts[dayIndex] - 1);
                }
            }
        }

        // Cập nhật lecturer mask
        Long lecturerId = data.getLecturerOfClass(className);
        if (lecturerId != null) {
            // Chỉ release nếu giảng viên không có lớp khác ở slot này
            if (!hasOtherLecturerClassAtSlot(lecturerId, className, slotIndex)) {
                SlotMask mask = lecturerSlotMasks.get(lecturerId);
                if (mask != null) {
                    mask.release(slotIndex);
                }
            }
        }
    }

    /**
     * Kiểm tra student có class khác ở slot này không
     */
    private boolean hasOtherClassAtSlot(Long studentId, String excludeClass, int slotIndex) {
        Set<String> studentClasses = data.getClassesOfStudent(studentId);
        for (String otherClass : studentClasses) {
            if (!otherClass.equals(excludeClass)) {
                Set<Integer> otherSlots = classSlots.get(otherClass);
                if (otherSlots != null && otherSlots.contains(slotIndex)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Kiểm tra lecturer có class khác ở slot này không
     */
    private boolean hasOtherLecturerClassAtSlot(Long lecturerId, String excludeClass, int slotIndex) {
        Set<String> lecturerClasses = data.getClassesOfLecturer(lecturerId);
        for (String otherClass : lecturerClasses) {
            if (!otherClass.equals(excludeClass)) {
                Set<Integer> otherSlots = classSlots.get(otherClass);
                if (otherSlots != null && otherSlots.contains(slotIndex)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Kiểm tra có thể gán slot cho class không
     * Trả về true nếu không vi phạm bất kỳ hard constraint nào
     */
    public boolean canAssignSlot(String className, int slotIndex) {
        // HC-5: Slot phải hợp lệ
        if (!data.isValidSlot(slotIndex)) {
            return false;
        }

        // HC-3: Class chưa đủ slot
        int requiredSlots = data.getSlotPerSubjectPerWeek();
        int currentSlots = classSlotCounts.getOrDefault(className, 0);
        if (currentSlots >= requiredSlots) {
            return false;
        }

        // Kiểm tra class đã có slot này chưa
        Set<Integer> existingSlots = classSlots.get(className);
        if (existingSlots != null && existingSlots.contains(slotIndex)) {
            return false;
        }

        int dayIndex = slotIndex / periodsPerDay;

        // HC-6: Day-gap constraint - slots của cùng class phải cách nhau ít nhất 1 ngày
        if (existingSlots != null && !existingSlots.isEmpty()) {
            for (Integer existingSlot : existingSlots) {
                int existingDay = existingSlot / periodsPerDay;
                // Kiểm tra khoảng cách ngày (cần ít nhất 2 để có gap 1 ngày)
                if (Math.abs(dayIndex - existingDay) < 2) {
                    return false; // Vi phạm: quá gần nhau
                }
            }
        }

        // HC-1 & HC-2: Kiểm tra students
        Set<Long> students = data.getStudentsOfClass(className);
        for (Long studentId : students) {
            // HC-1: Không trùng slot sinh viên
            SlotMask mask = studentSlotMasks.get(studentId);
            if (mask != null && mask.isOccupied(slotIndex)) {
                return false;
            }

            // HC-2: Không vượt max slot/ngày
            int[] dayCounts = studentDayCounts.get(studentId);
            if (dayCounts != null && dayIndex < dayCounts.length) {
                if (dayCounts[dayIndex] >= data.getMaxSlotPerDay()) {
                    return false;
                }
            }
        }

        // HC-1: Kiểm tra lecturer
        Long lecturerId = data.getLecturerOfClass(className);
        if (lecturerId != null) {
            SlotMask mask = lecturerSlotMasks.get(lecturerId);
            if (mask != null && mask.isOccupied(slotIndex)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Lấy tất cả các slot khả thi cho một class
     */
    public List<Integer> getAvailableSlots(String className) {
        List<Integer> available = new ArrayList<>();

        for (int slotIndex : data.getValidSlotIndices()) {
            if (canAssignSlot(className, slotIndex)) {
                available.add(slotIndex);
            }
        }

        return available;
    }

    /**
     * Lấy số slot còn thiếu cho class
     */
    public int getRemainingSlots(String className) {
        int required = data.getSlotPerSubjectPerWeek();
        int current = classSlotCounts.getOrDefault(className, 0);
        return Math.max(0, required - current);
    }

    /**
     * Kiểm tra class đã đủ slot chưa
     */
    public boolean isClassComplete(String className) {
        return getRemainingSlots(className) == 0;
    }

    /**
     * Kiểm tra toàn bộ schedule có complete không
     */
    public boolean isComplete() {
        for (TimetableData.ClassInfo classInfo : data.getClasses()) {
            if (!isClassComplete(classInfo.getClassName())) {
                return false;
            }
        }
        return true;
    }

    // ==================== QUERY METHODS ====================

    /**
     * Lấy số slot học của sinh viên trong ngày
     */
    public int getStudentSlotsInDay(Long studentId, int dayIndex) {
        int[] dayCounts = studentDayCounts.get(studentId);
        if (dayCounts != null && dayIndex >= 0 && dayIndex < dayCounts.length) {
            return dayCounts[dayIndex];
        }
        return 0;
    }

    /**
     * Lấy tổng số slot học của sinh viên trong tuần
     */
    public int getStudentWeeklySlots(Long studentId) {
        int[] dayCounts = studentDayCounts.get(studentId);
        if (dayCounts == null)
            return 0;

        int total = 0;
        for (int count : dayCounts) {
            total += count;
        }
        return total;
    }

    /**
     * Lấy tổng số slot dạy của giảng viên trong tuần
     */
    public int getLecturerWeeklySlots(Long lecturerId) {
        SlotMask mask = lecturerSlotMasks.get(lecturerId);
        return mask != null ? mask.countOccupied() : 0;
    }

    /**
     * Lấy các slots đã gán cho class
     */
    public Set<Integer> getClassSlots(String className) {
        return classSlots.getOrDefault(className, Collections.emptySet());
    }

    /**
     * Tạo bản copy của state này
     */
    public ScheduleState copy() {
        return new ScheduleState(this);
    }

    /**
     * Build chromosome từ state hiện tại
     */
    public Chromosome toChromosome() {
        Chromosome chromosome = new Chromosome();
        for (Map.Entry<String, Set<Integer>> entry : classSlots.entrySet()) {
            chromosome.getGenes().put(entry.getKey(), new HashSet<>(entry.getValue()));
        }
        chromosome.setValid(isComplete());
        return chromosome;
    }

    /**
     * Load state từ chromosome
     */
    public void loadFromChromosome(Chromosome chromosome) {
        // Clear current state
        clear();

        // Assign all slots from chromosome
        for (Map.Entry<String, Set<Integer>> entry : chromosome.getGenes().entrySet()) {
            String className = entry.getKey();
            for (Integer slotIndex : entry.getValue()) {
                assignSlot(className, slotIndex);
            }
        }
    }

    /**
     * Clear toàn bộ state
     */
    public void clear() {
        for (SlotMask mask : studentSlotMasks.values()) {
            mask.clear();
        }
        for (int[] counts : studentDayCounts.values()) {
            Arrays.fill(counts, 0);
        }
        for (SlotMask mask : lecturerSlotMasks.values()) {
            mask.clear();
        }
        classSlotCounts.replaceAll((k, v) -> 0);
        for (Set<Integer> slots : classSlots.values()) {
            slots.clear();
        }
    }

    @Override
    public String toString() {
        int totalAssigned = classSlots.values().stream()
                .mapToInt(Set::size)
                .sum();
        int totalRequired = data.getClasses().size() * data.getSlotPerSubjectPerWeek();

        return String.format("ScheduleState[%d/%d slots, %d classes]",
                totalAssigned, totalRequired, data.getClasses().size());
    }
}
