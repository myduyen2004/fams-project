package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Automatic system notification.
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_type", columnList = "type"),
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private NotificationType type = NotificationType.SYSTEM;

    @Column(length = 255)
    private String targetUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TargetType targetType = TargetType.USER;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        ASSIGNMENT_DEADLINE,
        NEW_ASSIGNMENT,
        SUBMISSION,
        GRADE_PUBLISHED,
        SCHEDULE_CHANGE,
        ATTENDANCE_WARNING,
        SYSTEM,
        ACADEMIC,
        CHAT,
        NEWS
    }

    public enum TargetType {
        USER,
        CLASS,
        ALL,
        STUDENT,
        LECTURER,
        ACADEMIC_STAFF,
        ADMIN
    }
}
