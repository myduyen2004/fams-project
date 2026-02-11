package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * StudentAttendance (Điểm danh sinh viên)
 * Represents a student's attendance record for a session
 */
@Entity
@Table(name = "student_attendances", indexes = {
        @Index(name = "idx_student_attendance_session", columnList = "session_id"),
        @Index(name = "idx_student_attendance_student", columnList = "student_id"),
        @Index(name = "idx_student_attendance_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_session_student", columnNames = { "session_id", "student_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Phiên điểm danh
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AttendanceSession session;

    // Sinh viên
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    // Trạng thái điểm danh
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AttendanceStatus status = AttendanceStatus.ABSENT;

    // Phương thức check-in
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CheckInMethod method;

    // Thời gian check-in
    private LocalDateTime checkInTime;

    // === Face Recognition Metadata ===
    // Độ tin cậy nhận diện khuôn mặt (0.0 - 1.0)
    private Double faceConfidence;

    // === WiFi Location Metadata ===
    // BSSID của WiFi khi check-in
    @Column(length = 17)
    private String wifiBssid;

    // Cường độ tín hiệu WiFi
    private Integer wifiRssi;

    // Ghi chú
    @Column(length = 500)
    private String note;

    // Người cập nhật (cho manual updates)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    // === Face Recognition Retry Metadata ===
    // Số lần thử nhận diện
    @Column(name = "attempt_count")
    @Builder.Default
    private Integer attemptCount = 0;

    // Lý do thất bại (nếu có)
    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    // Cần xác nhận thủ công bởi giảng viên
    @Column(name = "requires_manual_verify")
    @Builder.Default
    private Boolean requiresManualVerify = false;

    // Giảng viên đã xác nhận thủ công
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manual_verified_by")
    private User manualVerifiedBy;

    // Thời gian xác nhận thủ công
    @Column(name = "manual_verified_at")
    private LocalDateTime manualVerifiedAt;

    // URL ảnh khuôn mặt đã chụp khi điểm danh
    @Column(name = "captured_face_url", length = 500)
    private String capturedFaceUrl;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum AttendanceStatus {
        PRESENT, // Có mặt
        LATE, // Đi trễ
        ABSENT, // Vắng mặt
        EXCUSED // Vắng có phép
    }

    public enum CheckInMethod {
        QR_CODE, // Quét mã QR
        FACE_RECOGNITION, // Nhận diện khuôn mặt
        MANUAL // Điểm danh thủ công
    }
}
