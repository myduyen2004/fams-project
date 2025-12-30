package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "access_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String location;

    @Column(nullable = false, length = 50)
    private String status; // Đang hoạt động, Trạng thời, Ngừng hoạt động

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime accessTime;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 255)
    private String userAgent;
}
