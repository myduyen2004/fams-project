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
    @Column(name = "config_key", nullable = false, unique = true, length = 50)
    @Builder.Default
    private String configKey = "SYSTEM_CONFIG";

    // === General Settings ===
    @Column(name = "manual_enabled", nullable = false)
    @Builder.Default
    private Boolean manualEnabled = true;

    // Sau bao nhiêu phút tính là trễ
    @Column(name = "late_threshold_minutes", nullable = false)
    @Builder.Default
    private Integer lateThresholdMinutes = 15;

    // Sau bao nhiêu phút tính là vắng
    @Column(name = "absent_threshold_minutes", nullable = false)
    @Builder.Default
    private Integer absentThresholdMinutes = 30;

    // Mở điểm danh trước slot (phút)
    @Column(name = "open_before_minutes", nullable = false)
    @Builder.Default
    private Integer openBeforeMinutes = 15;

    // Đóng điểm danh sau slot (phút)
    @Column(name = "close_after_minutes", nullable = false)
    @Builder.Default
    private Integer closeAfterMinutes = 15;

    // Phần trăm điểm danh tối thiểu để được thi
    @Column(name = "min_attendance_percentage", nullable = false)
    @Builder.Default
    private Double minAttendancePercentage = 80.0;

    // === Face Recognition Settings ===
    @Column(name = "face_recognition_enabled", nullable = false)
    @Builder.Default
    private Boolean faceRecognitionEnabled = true;

    @Column(name = "liveness_enabled", nullable = false)
    @Builder.Default
    private Boolean livenessEnabled = true;

    // Giới hạn số lần thử / slot
    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private Integer maxAttempts = 5;

    // Ngưỡng khớp khuôn mặt (0.0 - 1.0)
    @Column(name = "face_match_threshold", nullable = false)
    @Builder.Default
    private Double faceMatchThreshold = 0.60;

    // === WiFi Location Settings ===
    @Column(name = "wifi_location_enabled", nullable = false)
    @Builder.Default
    private Boolean wifiLocationEnabled = false;

    // Bắt buộc kết nối WiFi trường
    @Column(name = "force_campus_wifi", nullable = false)
    @Builder.Default
    private Boolean forceCampusWifi = false;

    // Số AP tối thiểu cần match
    @Column(name = "min_matched_aps", nullable = false)
    @Builder.Default
    private Integer minMatchedAps = 1;

    // Ngưỡng cường độ tín hiệu WiFi
    @Column(name = "wifi_rssi_threshold", nullable = false)
    @Builder.Default
    private Integer wifiRssiThreshold = -75;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
