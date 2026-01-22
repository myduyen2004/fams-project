package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ChatGroup (Nhóm chat)
 * Represents a chat group for class communication
 */
@Entity
@Table(name = "chat_groups", indexes = {
        @Index(name = "idx_chat_group_class", columnList = "class_name"),
        @Index(name = "idx_chat_group_type", columnList = "type")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên nhóm
    @Column(nullable = false, length = 200)
    private String name;

    // Lớp học phần (quan hệ 1-1: mỗi lớp có 1 nhóm chat riêng)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_name", referencedColumnName = "className", unique = true)
    private ClassSection classSection;

    // Người tạo nhóm
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    // Loại nhóm
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ChatGroupType type = ChatGroupType.CLASS;

    // Danh sách thành viên
    @OneToMany(mappedBy = "chatGroup", cascade = CascadeType.ALL)
    @Builder.Default
    private List<ChatGroupMember> members = new ArrayList<>();

    // Danh sách tin nhắn
    @OneToMany(mappedBy = "chatGroup", cascade = CascadeType.ALL)
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum ChatGroupType {
        CLASS, // Nhóm lớp học
        COURSE, // Nhóm môn học
        CUSTOM // Nhóm tùy chỉnh
    }
}
