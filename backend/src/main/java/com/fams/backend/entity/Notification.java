package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Notification (Thông báo)
 * Enhanced notification entity with targeting and scheduling
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_sender", columnList = "sender_id"),
        @Index(name = "idx_notification_type", columnList = "type"),
        @Index(name = "idx_notification_status", columnList = "status"),
        @Index(name = "idx_notification_sent_at", columnList = "sentAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tiêu đề
    @Column(nullable = false, length = 200)
    private String title;

    // Nội dung
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // Loại thông báo
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NotificationType type = NotificationType.SYSTEM;

    // Độ ưu tiên
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NotificationPriority priority = NotificationPriority.MEDIUM;

    // Người gửi
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User sender;

    // URL để redirect khi nhấn vào thông báo
    @Column(length = 255)
    private String targetUrl;

    // === Target filtering ===
    // Loại đối tượng nhận
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TargetType targetType = TargetType.ALL;

    // === Scheduling ===
    // Thời gian lên lịch gửi
    private LocalDateTime scheduledAt;

    // Thời gian gửi thực tế
    private LocalDateTime sentAt;

    // Trạng thái thông báo
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NotificationStatus status = NotificationStatus.DRAFT;

    // Danh sách người nhận
    @OneToMany(mappedBy = "notification", cascade = CascadeType.ALL)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<NotificationRecipient> recipients = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "notification_attachments", joinColumns = @JoinColumn(name = "notification_id"))
    @Column(name = "url", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> attachmentUrls = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum NotificationType {
        SYSTEM, // Thông báo hệ thống
        ACADEMIC, // Thông báo học vụ
        ATTENDANCE, // Thông báo điểm danh
        GRADE, // Thông báo điểm
        CHAT, // Thông báo chat
        SCHEDULE // Thông báo lịch học
    }

    public enum NotificationPriority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    public enum TargetType {
        ALL, // Tất cả
        STUDENT, // Tất cả sinh viên
        LECTURER, // Tất cả giảng viên
        USER, // Cá nhân người dùng
    }

    public enum NotificationStatus {
        DRAFT, // Bản nháp
        SCHEDULED, // Đã lên lịch
        SENT // Đã gửi
    }
}
