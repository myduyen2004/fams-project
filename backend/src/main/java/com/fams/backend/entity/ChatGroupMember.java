package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ChatGroupMember (Thành viên nhóm chat)
 * Represents a member of a chat group
 */
@Entity
@Table(name = "chat_group_members", indexes = {
        @Index(name = "idx_chat_member_group", columnList = "chat_group_id"),
        @Index(name = "idx_chat_member_user", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_group_user", columnNames = { "chat_group_id", "user_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nhóm chat
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_group_id", nullable = false)
    private ChatGroup chatGroup;

    // Thành viên
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Vai trò trong nhóm
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;

    // Thời gian tham gia
    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime joinedAt;

    // Thời gian rời nhóm
    private LocalDateTime leftAt;

    public enum MemberRole {
        ADMIN, // Quản trị viên
        MEMBER // Thành viên
    }
}
