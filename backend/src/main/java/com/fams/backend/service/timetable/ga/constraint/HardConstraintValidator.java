package com.fams.backend.service.timetable.ga.constraint;

import com.fams.backend.service.timetable.ga.datastructure.ScheduleState;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * HardConstraintValidator - Kiểm tra các ràng buộc cứng
 * 
 * NGUYÊN TẮC: VI PHẠM → LOẠI NGAY
 * 
 * HC-1: Không trùng slot (Time Conflict)
 * HC-2: Giới hạn số slot học của sinh viên trong 1 ngày
 * HC-3: Số slot mỗi class section trong tuần
 * HC-4: Không xếp lịch vào ngày nghỉ
 * HC-5: Chỉ xếp vào ngày học hợp lệ
 */
@Slf4j
@RequiredArgsConstructor
public class HardConstraintValidator {

    private final TimetableData data;

    /**
     * Validate toàn bộ chromosome
     * 
     * @return true nếu không vi phạm bất kỳ hard constraint nào
     */
    public boolean validate(Chromosome chromosome) {
        return getViolations(chromosome).isEmpty();
    }

    /**
     * Lấy danh sách tất cả violations
     */
    public List<Violation> getViolations(Chromosome chromosome) {
        List<Violation> violations = new ArrayList<>();

        // Tạo state từ chromosome để kiểm tra
        ScheduleState state = new ScheduleState(data);

        for (TimetableData.ClassInfo classInfo : data.getClasses()) {
            String className = classInfo.getClassName();
            Set<Integer> slots = chromosome.getSlotsForClass(className);

            // HC-3: Kiểm tra số slot
            int requiredSlots = data.getSlotPerSubjectPerWeek();
            if (slots.size() != requiredSlots) {
                violations.add(new Violation(
                        ViolationType.HC3_SLOT_COUNT,
                        className,
                        null,
                        String.format("Class %s has %d slots, required %d",
                                className, slots.size(), requiredSlots)));
            }

            for (Integer slotIndex : slots) {
                // HC-4 & HC-5: Kiểm tra slot hợp lệ
                if (!data.isValidSlot(slotIndex)) {
                    violations.add(new Violation(
                            ViolationType.HC5_INVALID_SLOT,
                            className,
                            slotIndex,
                            String.format("Class %s assigned to invalid slot %d", className, slotIndex)));
                }

                // Gán vào state để kiểm tra conflict
                int dayIndex = data.getDayFromSlot(slotIndex);

                // Kiểm tra students
                Set<Long> students = data.getStudentsOfClass(className);
                for (Long studentId : students) {
                    // HC-1: Kiểm tra conflict
                    if (state.getStudentSlotMasks().get(studentId) != null &&
                            state.getStudentSlotMasks().get(studentId).isOccupied(slotIndex)) {
                        violations.add(new Violation(
                                ViolationType.HC1_TIME_CONFLICT_STUDENT,
                                className,
                                slotIndex,
                                String.format("Student %d has conflict at slot %d", studentId, slotIndex)));
                    }

                    // HC-2: Kiểm tra max slot/day
                    int currentDaySlots = state.getStudentSlotsInDay(studentId, dayIndex);
                    if (currentDaySlots >= data.getMaxSlotPerDay()) {
                        violations.add(new Violation(
                                ViolationType.HC2_MAX_SLOT_PER_DAY,
                                className,
                                slotIndex,
                                String.format("Student %d exceeds max slots/day at slot %d", studentId, slotIndex)));
                    }
                }

                // HC-1: Kiểm tra lecturer conflict
                Long lecturerId = data.getLecturerOfClass(className);
                if (lecturerId != null) {
                    if (state.getLecturerSlotMasks().get(lecturerId) != null &&
                            state.getLecturerSlotMasks().get(lecturerId).isOccupied(slotIndex)) {
                        violations.add(new Violation(
                                ViolationType.HC1_TIME_CONFLICT_LECTURER,
                                className,
                                slotIndex,
                                String.format("Lecturer %d has conflict at slot %d", lecturerId, slotIndex)));
                    }
                }

                // Gán slot vào state
                state.assignSlot(className, slotIndex);
            }
        }

        return violations;
    }

    /**
     * Kiểm tra nhanh một slot assignment có hợp lệ không
     * Sử dụng existing state để kiểm tra
     */
    public boolean canAssign(ScheduleState state, String className, int slotIndex) {
        return state.canAssignSlot(className, slotIndex);
    }

    /**
     * Violation types
     */
    public enum ViolationType {
        HC1_TIME_CONFLICT_STUDENT("Student time conflict"),
        HC1_TIME_CONFLICT_LECTURER("Lecturer time conflict"),
        HC2_MAX_SLOT_PER_DAY("Max slot per day exceeded"),
        HC3_SLOT_COUNT("Incorrect slot count"),
        HC4_HOLIDAY("Scheduled on holiday"),
        HC5_INVALID_SLOT("Invalid slot");

        private final String description;

        ViolationType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * Violation record
     */
    public record Violation(
            ViolationType type,
            String className,
            Integer slotIndex,
            String message) {
        @Override
        public String toString() {
            return String.format("[%s] %s", type.name(), message);
        }
    }
}
