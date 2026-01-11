package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * SubSpecializationCourse (Môn học của chuyên ngành hẹp/combo)
 * Junction table giữa SubSpecialization và Course
 */
@Entity
@Table(name = "sub_specialization_courses", indexes = {
        @Index(name = "idx_sub_spec_course_sub_spec", columnList = "sub_specialization_id"),
        @Index(name = "idx_sub_spec_course_course", columnList = "course_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_sub_specialization_course", columnNames = { "sub_specialization_id", "course_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubSpecializationCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chuyên ngành hẹp/combo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_specialization_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SubSpecialization subSpecialization;

    // Môn học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Course course;

    // Thứ tự hiển thị (cho drag & drop)
    @Builder.Default
    private Integer orderIndex = 0;

    // Học kỳ (được gán khi thêm môn vào chuyên ngành hẹp)
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
