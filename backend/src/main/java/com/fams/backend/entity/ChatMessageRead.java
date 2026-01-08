package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ChatMessageRead (Đã đọc tin nhắn)
 * Tracks which users have read a specific message
 */
@Entity
@Table(name = "chat_message_reads", indexes = {
        @Index(name = "idx_message_read_message", columnList = "message_id"),
        @Index(name = "idx_message_read_user", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_user", columnNames = { "message_id", "user_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tin nhắn
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    // Người đọc
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Thời gian đọc
    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime readAt;
}
