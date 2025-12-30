package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // username thường ngắn → 50 là đủ
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    // mật khẩu mã hóa bcrypt thường ~60 ký tự
    @Column(nullable = false, length = 255)
    private String password;

    // tên đầy đủ có thể dài → cho 150
    @Column(nullable = false, length = 150)
    private String fullName;

    // email có thể dài
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    // số điện thoại
    @Column(length = 20)
    private String phone;

    // ROLE enum → varchar 50 là an toàn
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserRole role;

    // STATUS enum → varchar 20
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    // link avatar (URL)
    @Column(length = 255)
    private String avatar;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum UserRole {
        ADMIN,
        ACADEMIC_STAFF,
        STUDENT_AFFAIRS_STAFF,
        LECTURER,
        STUDENT
    }

    public enum UserStatus {
        ACTIVE,
        INACTIVE,
        LOCKED
    }
}
