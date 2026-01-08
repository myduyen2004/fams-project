package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Specialization (Chuyên ngành)
 * Represents a specialization within a major
 */
@Entity
@Table(name = "specializations", indexes = {
        @Index(name = "idx_specialization_code", columnList = "code"),
        @Index(name = "idx_specialization_name", columnList = "name"),
        @Index(name = "idx_specialization_major", columnList = "major_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Specialization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã chuyên ngành (e.g., "SE-SA", "SE-IB")
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Tên chuyên ngành (e.g., "Software Architecture", "International Business")
    @Column(nullable = false, length = 200)
    private String name;

    // Mô tả chi tiết về chuyên ngành
    @Column(columnDefinition = "TEXT")
    private String description;

    // Trạng thái của chuyên ngành
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SpecializationStatus status = SpecializationStatus.ACTIVE;

    // Thuộc về ngành nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "major_id", nullable = false)
    private Major major;

    // Một chuyên ngành có nhiều chuyên ngành hẹp (sub-specializations/combo)
    @OneToMany(mappedBy = "specialization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SubSpecialization> subSpecializations = new ArrayList<>();

    // Các môn học của chuyên ngành này (One-to-Many với junction table)
    @OneToMany(mappedBy = "specialization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SpecializationCourse> specializationCourses = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum SpecializationStatus {
        ACTIVE,
        INACTIVE
    }
}
