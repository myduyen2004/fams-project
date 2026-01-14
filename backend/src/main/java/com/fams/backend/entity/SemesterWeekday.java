package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * SemesterWeekday (Ngày học trong tuần)
 */
@Entity
@Table(name = "semester_weekdays", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "semester_id", "weekday" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SemesterWeekday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(nullable = false)
    private Integer weekday; // 2 = Monday, 3 = Tuesday ... 8 = Sunday
}
