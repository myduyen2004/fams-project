package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "academic_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String type; // e.g., "Đề nghị miễn điểm danh"

    @Column(nullable = false)
    private String status; // "PENDING", "APPROVED", "REJECTED"

    @CreationTimestamp
    private LocalDateTime createdAt;
}
