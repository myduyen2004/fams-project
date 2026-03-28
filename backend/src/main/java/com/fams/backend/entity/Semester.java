package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Semester (Học kỳ)
 * Represents an academic semester
 */
@Entity
@Table(name = "semesters", indexes = {
        @Index(name = "idx_semester_code", columnList = "code"),
        @Index(name = "idx_semester_name", columnList = "name"),
        @Index(name = "idx_semester_start_date", columnList = "startDate"),
        @Index(name = "idx_semester_end_date", columnList = "endDate")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Semester {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã học kỳ (e.g., "FA24", "SP25", "SU25")
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Tên học kỳ (e.g., "Fall 2024", "Spring 2025")
    @Column(nullable = false, length = 100)
    private String name;

    // Ngày bắt đầu học kỳ
    @Column(nullable = false)
    private LocalDate startDate;

    // Ngày kết thúc học kỳ
    @Column(nullable = false)
    private LocalDate endDate;

    // Trạng thái học kỳ
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SemesterStatus status = SemesterStatus.UPCOMING;

    // Các loại slot trong kỳ (One-to-Many)
    @OneToMany(mappedBy = "semester", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SlotType> slotTypes = new ArrayList<>();

    // Mô tả học kỳ
    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum SemesterStatus {
        UPCOMING, // Sắp diễn ra
        ONGOING, // Đang diễn ra
        COMPLETED // Đã kết thúc
    }
}
