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

    // Loại điểm (e.g., PROGRESS_TEST, ASSIGNMENT, PRACTICAL_EXAM, FINAL_EXAM)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private GradeType type;

    // Trọng số (weight) của điểm này (e.g., 0.1 = 10%, 0.3 = 30%)
    @Column(nullable = false)
    private Double weight;

    // Số lượng (e.g., có 2 progress test, 3 assignments)
    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    // Bắt buộc hay không
    @Column(nullable = false)
    @Builder.Default
    private Boolean isRequired = true;

    // Thuộc môn học nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
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
        PRACTICAL_EXAM, // Thi thực hành (PE)
        FINAL_EXAM, // Thi cuối kỳ (FE)
        PROJECT, // Đồ án
        PRESENTATION, // Thuyết trình
        OTHER // Khác
    }
}
