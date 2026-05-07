package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_permissions", indexes = {
        @Index(name = "idx_user_permission_user", columnList = "user_id"),
        @Index(name = "idx_user_permission_unique", columnList = "user_id, permission", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class UserPermission {

    @Id
    @EqualsAndHashCode.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Permission permission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by")
    private User grantedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime grantedAt;

    public enum Permission {
        MANAGE_MAJORS,         // Quản lý ngành
        MANAGE_COURSES,        // Quản lý môn học
        MANAGE_USERS,          // Quản lý người dùng (sinh viên, giảng viên)
        MANAGE_SEMESTERS,      // Quản lý kỳ học
        VIEW_SYSTEM_LOGS,      // Xem nhật ký hệ thống
        MANAGE_SCHEDULE,       // Quản lý thời khóa biểu
        MANAGE_NOTIFICATIONS   // Quản lý thông báo
    }
}
