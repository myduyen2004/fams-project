package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * AIChatSession (Phiên chat AI)
 * Represents a conversation session with AI Learning Assistant
 */
@Entity
@Table(name = "ai_chat_sessions", indexes = {
        @Index(name = "idx_ai_session_user", columnList = "user_id"),
        @Index(name = "idx_ai_session_status", columnList = "status"),
        @Index(name = "idx_ai_session_created", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Người dùng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Tiêu đề phiên (auto-generated từ tin nhắn đầu tiên)
    @Column(length = 200)
    private String title;

    // Trạng thái phiên
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SessionStatus status = SessionStatus.ACTIVE;

    // Thời gian tin nhắn cuối
    private LocalDateTime lastMessageAt;

    // Danh sách tin nhắn
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @Builder.Default
    private List<AIChatMessage> messages = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum SessionStatus {
        ACTIVE, // Đang hoạt động
        ARCHIVED // Đã lưu trữ
    }
}
