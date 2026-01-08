package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * TeachingAssignment (Phân công giảng dạy)
 * Represents a lecturer's teaching assignment for a course in a semester
 */
@Entity
@Table(name = "teaching_assignments", indexes = {
        @Index(name = "idx_teaching_assignment_lecturer", columnList = "lecturer_id"),
        @Index(name = "idx_teaching_assignment_course", columnList = "course_id"),
        @Index(name = "idx_teaching_assignment_semester", columnList = "semester_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_lecturer_course_semester", columnNames = { "lecturer_id", "course_id",
                "semester_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeachingAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Giảng viên
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private User lecturer;

    // Môn học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    // Học kỳ
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    // Số lớp tối đa được phân
    @Column(nullable = false)
    @Builder.Default
    private Integer maxClasses = 3;

    // Số lớp đã phân
    @Column(nullable = false)
    @Builder.Default
    private Integer assignedClasses = 0;

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.ACTIVE;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum AssignmentStatus {
        ACTIVE,
        COMPLETED,
        CANCELLED
    }
}
