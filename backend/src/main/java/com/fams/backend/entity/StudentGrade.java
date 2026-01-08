package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * StudentGrade (Điểm thành phần sinh viên)
 * Represents a student's grade for a specific grade component
 */
@Entity
@Table(name = "student_grades", indexes = {
        @Index(name = "idx_student_grade_enrollment", columnList = "enrollment_id"),
        @Index(name = "idx_student_grade_component", columnList = "grade_component_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Đăng ký học (Student + ClassSection)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    // Loại điểm
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_component_id", nullable = false)
    private GradeComponent gradeComponent;

    // Điểm số (0-10)
    @Column(nullable = false)
    private Double score;

    // Lần thi thứ mấy
    @Column(nullable = false)
    @Builder.Default
    private Integer attempt = 1;

    // Thời gian chấm điểm
    private LocalDateTime gradedAt;

    // Người chấm điểm
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by_id")
    private User gradedBy;

    // Ghi chú
    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
