package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SubSpecialization (Chuyên ngành hẹp/Combo)
 * Represents a sub-specialization or combo within a specialization
 */
@Entity
@Table(name = "sub_specializations", indexes = {
        @Index(name = "idx_sub_specialization_code", columnList = "code"),
        @Index(name = "idx_sub_specialization_name", columnList = "name"),
        @Index(name = "idx_sub_specialization_spec", columnList = "specialization_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubSpecialization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã combo/chuyên ngành hẹp (e.g., "SE-SA-01", "SE-IB-02")
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Tên combo/chuyên ngành hẹp
    @Column(nullable = false, length = 200)
    private String name;

    // Mô tả chi tiết
    @Column(columnDefinition = "TEXT")
    private String description;

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SubSpecializationStatus status = SubSpecializationStatus.ACTIVE;

    // Thuộc về chuyên ngành nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialization_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Specialization specialization;

    // Các môn học của combo này (One-to-Many với junction table)
    @OneToMany(mappedBy = "subSpecialization", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SubSpecializationCourse> subSpecializationCourses = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum SubSpecializationStatus {
        ACTIVE,
        INACTIVE
    }
}
