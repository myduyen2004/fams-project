package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * SlotType (Loại slot)
 * Represents a time slot type within a semester
 */
@Entity
@Table(name = "slot_types", indexes = {
        @Index(name = "idx_slot_type_semester", columnList = "semester_id"),
        @Index(name = "idx_slot_type_name", columnList = "name")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên slot (e.g., "Slot 1", "Slot 2", "Slot 3", "Slot 4", "Slot 5", "Slot 6")
    @Column(nullable = false, length = 50)
    private String name;

    // Giờ bắt đầu của slot
    @Column(nullable = false)
    private LocalTime startTime;

    // Giờ kết thúc của slot
    @Column(nullable = false)
    private LocalTime endTime;

    // Mô tả
    @Column(length = 255)
    private String description;

    // Thuộc học kỳ nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    // Loại slot (90 phút hoặc 120 phút)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SlotDuration duration = SlotDuration.MINUTES_90;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum SlotDuration {
        MINUTES_90(90), // 90 phút
        MINUTES_120(120); // 120 phút

        private final int minutes;

        SlotDuration(int minutes) {
            this.minutes = minutes;
        }

        public int getMinutes() {
            return minutes;
        }
    }
}
