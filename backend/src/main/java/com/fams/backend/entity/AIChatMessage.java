package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * AIChatMessage (Tin nhắn chat AI)
 * Represents a message in an AI chat session
 */
@Entity
@Table(name = "ai_chat_messages", indexes = {
        @Index(name = "idx_ai_message_session", columnList = "session_id"),
        @Index(name = "idx_ai_message_role", columnList = "role"),
        @Index(name = "idx_ai_message_sent_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Phiên chat
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AIChatSession session;

    // Vai trò người gửi
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageRole role;

    // Nội dung tin nhắn
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // Thời gian gửi
    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime sentAt;

    // === Metadata for analytics ===
    // Số token sử dụng
    private Integer tokenCount;

    // Phiên bản model AI
    @Column(length = 50)
    private String modelVersion;

    // Thời gian xử lý (ms)
    private Long processingTimeMs;

    public enum MessageRole {
        USER, // Tin nhắn từ người dùng
        ASSISTANT // Tin nhắn từ AI
    }
}
