package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ChatMessage (Tin nhắn chat)
 * Represents a message in a chat group
 */
@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_message_group", columnList = "chat_group_id"),
        @Index(name = "idx_chat_message_sender", columnList = "sender_id"),
        @Index(name = "idx_chat_message_sent_at", columnList = "sentAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nhóm chat
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_group_id", nullable = false)
    private ChatGroup chatGroup;

    // Người gửi
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    // Nội dung tin nhắn
    @Column(columnDefinition = "TEXT")
    private String content;

    // Loại tin nhắn
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    // URL file đính kèm
    @Column(length = 500)
    private String attachmentUrl;

    // Tên file gốc
    @Column(length = 255)
    private String attachmentName;

    // Trả lời tin nhắn nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private ChatMessage replyTo;

    // Đã xóa chưa
    @Column(nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    // Thời gian gửi
    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime sentAt;

    // Danh sách đã đọc
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL)
    @Builder.Default
    private List<ChatMessageRead> readReceipts = new ArrayList<>();

    public enum MessageType {
        TEXT, // Văn bản
        IMAGE, // Hình ảnh
        FILE, // File
        SYSTEM // Tin nhắn hệ thống
    }
}
