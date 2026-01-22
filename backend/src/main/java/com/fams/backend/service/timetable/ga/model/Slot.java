package com.fams.backend.service.timetable.ga.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Slot - Đơn vị thời gian nhỏ nhất trong thời khóa biểu
 * Slot = (dayIndex, periodIndex) → ánh xạ sang slotIndex tuyến tính
 * 
 * dayIndex: 0-6 (Monday=0, ..., Sunday=6)
 * periodIndex: 0-N (các tiết trong ngày)
 * slotIndex = dayIndex * periodsPerDay + periodIndex
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Slot {

    private int slotIndex;
    private int dayIndex; // 0 = Monday, 6 = Sunday
    private int periodIndex; // 0-based slot trong ngày

    /**
     * Factory method: tạo Slot từ slotIndex
     */
    public static Slot fromIndex(int slotIndex, int periodsPerDay) {
        int dayIndex = slotIndex / periodsPerDay;
        int periodIndex = slotIndex % periodsPerDay;
        return new Slot(slotIndex, dayIndex, periodIndex);
    }

    /**
     * Factory method: tạo Slot từ (day, period)
     */
    public static Slot from(int dayIndex, int periodIndex, int periodsPerDay) {
        int slotIndex = dayIndex * periodsPerDay + periodIndex;
        return new Slot(slotIndex, dayIndex, periodIndex);
    }

    /**
     * Tính slotIndex từ day và period
     */
    public static int toIndex(int dayIndex, int periodIndex, int periodsPerDay) {
        return dayIndex * periodsPerDay + periodIndex;
    }

    /**
     * Kiểm tra có phải thứ 7 không (dayIndex = 5, vì 0=Monday)
     */
    public boolean isSaturday() {
        return dayIndex == 5;
    }

    /**
     * Kiểm tra có phải chủ nhật không (dayIndex = 6)
     */
    public boolean isSunday() {
        return dayIndex == 6;
    }

    /**
     * Lấy tên ngày trong tuần
     */
    public String getDayName() {
        return switch (dayIndex) {
            case 0 -> "Monday";
            case 1 -> "Tuesday";
            case 2 -> "Wednesday";
            case 3 -> "Thursday";
            case 4 -> "Friday";
            case 5 -> "Saturday";
            case 6 -> "Sunday";
            default -> "Unknown";
        };
    }

    @Override
    public String toString() {
        return String.format("Slot[%d](%s, P%d)", slotIndex, getDayName(), periodIndex + 1);
    }
}
