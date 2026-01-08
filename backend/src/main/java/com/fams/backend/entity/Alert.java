package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Alert (Cảnh báo)
 * Represents system alerts generated from user actions
 */
@Entity
@Table(name = "alerts", indexes = {
        @Index(name = "idx_alert_user", columnList = "user_id"),
        @Index(name = "idx_alert_level", columnList = "level"),
        @Index(name = "idx_alert_resolved", columnList = "isResolved")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tiêu đề cảnh báo
    @Column(nullable = false, length = 200)
    private String title;

    // Mô tả chi tiết
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    // Mức độ cảnh báo
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertLevel level;

    // Loại cảnh báo
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AlertType type = AlertType.SYSTEM;

    // User gây ra cảnh báo (nếu có)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // Thời gian tạo
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum AlertLevel {
        INFO, // Thông tin
        WARNING, // Cảnh báo
        ERROR, // Lỗi
        CRITICAL // Nghiêm trọng
    }

    public enum AlertType {
        SYSTEM, // Hệ thống
        ATTENDANCE, // Điểm danh bất thường
        SECURITY, // Bảo mật (đăng nhập sai, IP lạ)
        GRADE, // Điểm (import lỗi, điểm bất thường)
        SCHEDULE // Lịch học (xung đột, thiếu phòng)
    }
}
