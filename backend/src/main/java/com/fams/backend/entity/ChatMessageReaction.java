package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ChatMessageReaction (Cảm xúc tin nhắn)
 * Tracks which users have reacted to a specific message with which emoji
 */
@Entity
@Table(name = "chat_message_reactions", indexes = {
        @Index(name = "idx_message_reaction_message", columnList = "message_id"),
        @Index(name = "idx_message_reaction_user", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_message_user_emoji", columnNames = { "message_id", "user_id", "emoji" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tin nhắn
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    // Người bày tỏ cảm xúc
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Emoji cảm xúc
    @Column(nullable = false, length = 50)
    private String emoji;

    // Thời gian bày tỏ
    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime reactedAt;
}
