package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * FaceEncoding (Dữ liệu khuôn mặt)
 * Stores the face encoding vector for biometric verification
 * Each user can have MULTIPLE face encodings (1:N relationship) for different
 * angles
 */
@Entity
@Table(name = "face_encodings", indexes = {
        @Index(name = "idx_face_encodings_user_id", columnList = "user_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FaceEncoding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User this face encoding belongs to (MANY encodings per ONE user)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = false)
    private User user;

    // Face encoding data (128-dim vector serialized as bytes)
    @Column(name = "encoding_data", nullable = false)
    private byte[] encodingData;

    // When the face was registered
    @Column(nullable = false)
    private LocalDateTime registeredAt;

    // Whether liveness detection was passed during registration
    @Column(nullable = false)
    @Builder.Default
    private Boolean livenessVerified = true;

    // Face image stored as base64 string
    @Column(name = "face_image", columnDefinition = "LONGTEXT")
    private String faceImage;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
