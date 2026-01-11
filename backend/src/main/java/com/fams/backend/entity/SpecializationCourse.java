package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * SpecializationCourse (Môn học của chuyên ngành)
 * Junction table giữa Specialization và Course
 */
@Entity
@Table(name = "specialization_courses", indexes = {
        @Index(name = "idx_spec_course_spec", columnList = "specialization_id"),
        @Index(name = "idx_spec_course_course", columnList = "course_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_specialization_course", columnNames = { "specialization_id", "course_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecializationCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chuyên ngành
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialization_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Specialization specialization;

    // Môn học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    // Thứ tự hiển thị (cho drag & drop)
    @Builder.Default
    private Integer orderIndex = 0;

    // Học kỳ (được gán khi thêm môn vào chuyên ngành)
    @Builder.Default
    private Integer semester = 1;

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
