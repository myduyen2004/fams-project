package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * NotificationRecipient (Người nhận thông báo)
 * Tracks notification delivery and read status per user
 */
@Entity
@Table(name = "notification_recipients", indexes = {
        @Index(name = "idx_notification_recipient_notification", columnList = "notification_id"),
        @Index(name = "idx_notification_recipient_user", columnList = "recipient_id"),
        @Index(name = "idx_notification_recipient_is_read", columnList = "isRead")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Thông báo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    // Người nhận
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    // Đã đọc chưa
    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    // Thời gian đọc
    private LocalDateTime readAt;

    // Đã xóa (khỏi inbox) chưa
    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
