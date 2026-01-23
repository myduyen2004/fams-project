package com.fams.backend.service.timetable.ga.datastructure;

import java.util.BitSet;

/**
 * SlotMask - BitSet wrapper để quản lý slot occupancy
 * Mỗi bit tương ứng với một slotIndex
 * 
 * Sử dụng cho:
 * - student_slot_mask: kiểm tra sinh viên đã có lịch ở slot nào
 * - lecturer_slot_mask: kiểm tra giảng viên đã có lịch ở slot nào
 */
public class SlotMask {

    private final BitSet bits;
    private final int totalSlots;

    /**
     * Constructor với tổng số slot
     */
    public SlotMask(int totalSlots) {
        this.totalSlots = totalSlots;
        this.bits = new BitSet(totalSlots);
    }

    /**
     * Copy constructor
     */
    public SlotMask(SlotMask other) {
        this.totalSlots = other.totalSlots;
        this.bits = (BitSet) other.bits.clone();
    }

    /**
     * Đánh dấu slot đã được sử dụng
     */
    public void occupy(int slotIndex) {
        if (slotIndex >= 0 && slotIndex < totalSlots) {
            bits.set(slotIndex);
        }
    }

    /**
     * Bỏ đánh dấu slot
     */
    public void release(int slotIndex) {
        if (slotIndex >= 0 && slotIndex < totalSlots) {
            bits.clear(slotIndex);
        }
    }

    /**
     * Kiểm tra slot có bị chiếm không
     */
    public boolean isOccupied(int slotIndex) {
        if (slotIndex < 0 || slotIndex >= totalSlots) {
            return true; // Coi slot không hợp lệ như đã bị chiếm
        }
        return bits.get(slotIndex);
    }

    /**
     * Kiểm tra slot có trống không
     */
    public boolean isFree(int slotIndex) {
        return !isOccupied(slotIndex);
    }

    /**
     * Đếm số slot đã bị chiếm
     */
    public int countOccupied() {
        return bits.cardinality();
    }

    /**
     * Đếm số slot còn trống
     */
    public int countFree() {
        return totalSlots - bits.cardinality();
    }

    /**
     * Kiểm tra có conflict với mask khác không
     * (có slot nào cả 2 đều bị chiếm)
     */
    public boolean hasConflict(SlotMask other) {
        BitSet intersection = (BitSet) this.bits.clone();
        intersection.and(other.bits);
        return intersection.cardinality() > 0;
    }

    /**
     * Lấy các slot bị conflict
     */
    public BitSet getConflicts(SlotMask other) {
        BitSet intersection = (BitSet) this.bits.clone();
        intersection.and(other.bits);
        return intersection;
    }

    /**
     * Merge với mask khác (OR operation)
     */
    public void merge(SlotMask other) {
        this.bits.or(other.bits);
    }

    /**
     * Clear tất cả
     */
    public void clear() {
        bits.clear();
    }

    /**
     * Lấy BitSet gốc (cho advanced operations)
     */
    public BitSet getBitSet() {
        return bits;
    }

    /**
     * Đếm số slot trong một ngày cụ thể
     */
    public int countOccupiedInDay(int dayIndex, int periodsPerDay) {
        int startSlot = dayIndex * periodsPerDay;
        int endSlot = startSlot + periodsPerDay;
        int count = 0;

        for (int i = startSlot; i < endSlot && i < totalSlots; i++) {
            if (bits.get(i)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Lấy các slot trong một ngày cụ thể
     */
    public int[] getOccupiedSlotsInDay(int dayIndex, int periodsPerDay) {
        int startSlot = dayIndex * periodsPerDay;
        int endSlot = startSlot + periodsPerDay;

        return bits.stream()
                .filter(i -> i >= startSlot && i < endSlot)
                .toArray();
    }

    /**
     * Copy mask này
     */
    public SlotMask copy() {
        return new SlotMask(this);
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("SlotMask[");
        sb.append(countOccupied()).append("/").append(totalSlots);
        sb.append("]: ");

        for (int i = bits.nextSetBit(0); i >= 0; i = bits.nextSetBit(i + 1)) {
            sb.append(i).append(" ");
        }
        return sb.toString().trim();
    }
}
