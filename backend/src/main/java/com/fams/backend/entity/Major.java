package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Major (Ngành học)
 * Represents an academic major/program
 */
@Entity
@Table(name = "majors", indexes = {
        @Index(name = "idx_major_code", columnList = "code"),
        @Index(name = "idx_major_name", columnList = "name")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Major {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã ngành (e.g., "SE", "AI", "IA")
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Tên ngành (e.g., "Software Engineering", "Artificial Intelligence")
    @Column(nullable = false, length = 200)
    private String name;

    // Mô tả chi tiết về ngành
    @Column(columnDefinition = "TEXT")
    private String description;

    // Trạng thái của ngành (ACTIVE, INACTIVE)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MajorStatus status = MajorStatus.ACTIVE;

    // Một ngành có nhiều chuyên ngành
    @OneToMany(mappedBy = "major", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Specialization> specializations = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum MajorStatus {
        ACTIVE,
        INACTIVE
    }
}
