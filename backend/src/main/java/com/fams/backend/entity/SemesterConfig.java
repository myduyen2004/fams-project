package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * SemesterConfig (Cấu hình học kỳ)
 * 1-1 relationship with Semester
 */
@Entity
@Table(name = "semester_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SemesterConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false, unique = true)
    private Semester semester;

    @Column(nullable = false)
    private Integer maxSlotPerDay;

    @Column(nullable = false)
    private Integer slotPerSubjectPerWeek;

    @Column(nullable = false)
    private Integer slotDuration; // phút (90, 120)

    @Column(nullable = false)
    @Builder.Default
    private Boolean isPublished = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
