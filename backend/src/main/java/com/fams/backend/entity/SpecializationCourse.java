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

    // Loại môn học trong chuyên ngành
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CourseType courseType = CourseType.REQUIRED;

    // Thứ tự hiển thị
    private Integer orderIndex;

    // Ghi chú
    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum CourseType {
        REQUIRED, // Môn bắt buộc
        ELECTIVE // Môn tự chọn
    }
}
