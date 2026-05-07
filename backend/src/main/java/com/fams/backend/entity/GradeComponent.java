package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * GradeComponent (Điểm thành phần)
 * Represents a grade component for a course (e.g., Progress Test, Assignment,
 * PE, FE)
 */
@Entity
@Table(name = "grade_components", indexes = {
        @Index(name = "idx_grade_component_course", columnList = "course_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên loại điểm (e.g., "Progress Test 1", "Assignment", "PE", "FE")
    @Column(nullable = false, length = 100)
    private String name;

    // Mô tả chi tiết
    @Column(columnDefinition = "TEXT")
    private String description;

    // Loại điểm (e.g., PROGRESS_TEST, ASSIGNMENT, PRACTICAL_EXAM, FINAL_EXAM)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private GradeType type;

    // Trọng số (weight) của điểm này (e.g., 10 = 10%, 30 = 30%)
    @Column(nullable = false)
    private Double weight;

    // Là điểm thi lại hay không
    @Column(nullable = false)
    @Builder.Default
    private Boolean isResit = false;

    // Reference đến component gốc (nếu là resit)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reference_component_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private GradeComponent referenceComponent;

    // Thuộc môn học nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Course course;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum GradeType {
        PROGRESS_TEST, // Bài kiểm tra tiến độ
        ASSIGNMENT, // Bài tập
        QUIZ, // Bài kiểm tra nhanh
        WORKSHOP, // Workshop
        PARTICIPATION, // Điểm chuyên cần
        MID_TERM, // Thi giữa kỳ
        PRACTICAL_EXAM, // Thi thực hành (PE)
        FINAL_EXAM, // Thi cuối kỳ (FE)
        PROJECT, // Đồ án
        PRESENTATION, // Thuyết trình
        RESIT, // Thi lại
        OTHER // Khác
    }
}
