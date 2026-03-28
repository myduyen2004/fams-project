package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * TimetableSlot (Slot thời khóa biểu)
 * Represents a scheduled time slot for a class section
 */
@Entity
@Table(name = "timetable_slots", indexes = {
        @Index(name = "idx_timetable_slot_class", columnList = "class_name"),
        @Index(name = "idx_timetable_slot_room", columnList = "room_id"),
        @Index(name = "idx_timetable_slot_date", columnList = "date"),
        @Index(name = "idx_timetable_slot_day", columnList = "day_of_week")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lớp học phần - FK tới ClassSection(className)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_name", referencedColumnName = "className", nullable = false)
    private ClassSection classSection;

    // Phòng học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // Loại slot (giờ học)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_type_id", nullable = false)
    private SlotType slotType;

    // Ngày cụ thể
    @Column(nullable = false)
    private LocalDate date;

    // Thứ trong tuần (1=Monday, 7=Sunday)
    @Column(nullable = false)
    private Integer dayOfWeek;

    // Số thứ tự slot trong ngày (1-6)
    @Column(nullable = false)
    private Integer slotNumber;

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TimetableSlotStatus status = TimetableSlotStatus.SCHEDULED;

    // Ghi chú
    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum TimetableSlotStatus {
        SCHEDULED, // Đã lên lịch
        CANCELLED, // Đã hủy
        RESCHEDULED, // Đã đổi lịch
        COMPLETED // Đã hoàn thành
    }
}
