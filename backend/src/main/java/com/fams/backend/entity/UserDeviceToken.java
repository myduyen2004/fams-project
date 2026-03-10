package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * User Device Token for FCM Push Notifications
 */
@Entity
@Table(name = "user_device_tokens", indexes = {
        @Index(name = "idx_token_user", columnList = "user_id"),
        @Index(name = "idx_token_value", columnList = "token")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Column(nullable = false, length = 255)
    private String token;

    @Column(length = 50)
    private String platform; // 'android', 'ios', 'web'

    @Column(length = 100)
    private String deviceId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
