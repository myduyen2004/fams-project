package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Course (Môn học)
 * Represents an academic course
 */
@Entity
@Table(name = "courses", indexes = {
        @Index(name = "idx_course_code", columnList = "code"),
        @Index(name = "idx_course_name", columnList = "name")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã môn học (e.g., "PRN211", "SWE201")
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Tên môn học (e.g., "Basic Cross-Platform Application", "Software
    // Engineering")
    @Column(nullable = false, length = 200)
    private String name;

    // Mô tả môn học
    @Column(columnDefinition = "TEXT")
    private String description;

    // Số tín chỉ
    @Column(nullable = false)
    private Integer credits;

    // Số slot
    @Column(nullable = false)
    private Integer numberOfSlots;

    // Tổng trọng số điểm thành phần (Calculated)
    // Chỉ tính các thành phần KHÔNG phải là RESIT
    @org.hibernate.annotations.Formula("(SELECT COALESCE(SUM(gc.weight), 0) FROM grade_components gc WHERE gc.course_id = id AND gc.is_resit = false)")
    private Double totalWeight;

    // Trạng thái môn học
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CourseStatus status = CourseStatus.ACTIVE;

    // Có tính điểm trung bình (GPA) không
    @Column(nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean isCalculatedInGpa = true;

    // Các loại điểm thành phần của môn học (One-to-Many)
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GradeComponent> gradeComponents = new ArrayList<>();

    // Các chuyên ngành có môn này (One-to-Many với junction table - inverse side)
    @OneToMany(mappedBy = "course")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<SpecializationCourse> specializationCourses = new ArrayList<>();

    // Các combo/chuyên ngành hẹp có môn này (One-to-Many với junction table -
    // inverse side)
    @OneToMany(mappedBy = "course")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<SubSpecializationCourse> subSpecializationCourses = new ArrayList<>();

    // Môn học tiên quyết (ManyToMany self-join)
    @ManyToMany
    @JoinTable(name = "course_prerequisites", joinColumns = @JoinColumn(name = "course_id"), inverseJoinColumns = @JoinColumn(name = "prerequisite_id"))
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Course> prerequisites = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum CourseStatus {
        ACTIVE,
        INACTIVE
    }
}
