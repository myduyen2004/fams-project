package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * AttendanceConfig (Cấu hình điểm danh)
 * System-wide attendance configuration (singleton)
 */
@Entity
@Table(name = "attendance_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Config key để đảm bảo chỉ có 1 record (singleton)
    @Column(nullable = false, unique = true, length = 50)
    @Builder.Default
    private String configKey = "SYSTEM_CONFIG";

    // === QR Code Settings ===
    @Column(nullable = false)
    @Builder.Default
    private Boolean qrEnabled = true;

    // QR hết hạn sau bao nhiêu giây
    @Column(nullable = false)
    @Builder.Default
    private Integer qrExpireSeconds = 30;

    // === Face Recognition Settings ===
    @Column(nullable = false)
    @Builder.Default
    private Boolean faceRecognitionEnabled = true;

    // Ngưỡng khớp khuôn mặt (0.0 - 1.0)
    @Column(nullable = false)
    @Builder.Default
    private Double faceMatchThreshold = 0.85;

    // === WiFi Location Settings ===
    @Column(nullable = false)
    @Builder.Default
    private Boolean wifiLocationEnabled = false;

    // Ngưỡng cường độ tín hiệu WiFi
    @Column(nullable = false)
    @Builder.Default
    private Integer wifiRssiThreshold = -70;

    // === General Settings ===
    // Sau bao nhiêu phút tính là trễ
    @Column(nullable = false)
    @Builder.Default
    private Integer lateThresholdMinutes = 15;

    // Sau bao nhiêu phút tính là vắng
    @Column(nullable = false)
    @Builder.Default
    private Integer absentThresholdMinutes = 30;

    // Phần trăm điểm danh tối thiểu để được thi
    @Column(nullable = false)
    @Builder.Default
    private Double minAttendancePercentage = 80.0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
