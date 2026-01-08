package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * AttendanceSession (Phiên điểm danh)
 * Represents an attendance session for a timetable slot
 */
@Entity
@Table(name = "attendance_sessions", indexes = {
        @Index(name = "idx_attendance_session_slot", columnList = "timetable_slot_id"),
        @Index(name = "idx_attendance_session_lecturer", columnList = "lecturer_id"),
        @Index(name = "idx_attendance_session_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Slot thời khóa biểu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_slot_id", nullable = false)
    private TimetableSlot timetableSlot;

    // Giảng viên mở phiên điểm danh
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private User lecturer;

    // Thời gian mở
    @Column(nullable = false)
    private LocalDateTime openedAt;

    // Thời gian đóng
    private LocalDateTime closedAt;

    // Trạng thái phiên
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SessionStatus status = SessionStatus.OPEN;

    // QR Code data (encrypted)
    @Column(length = 500)
    private String qrCodeData;

    // Thời gian hết hạn QR
    private LocalDateTime qrExpiresAt;

    // Danh sách điểm danh sinh viên
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @Builder.Default
    private List<StudentAttendance> studentAttendances = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum SessionStatus {
        OPEN, // Đang mở
        CLOSED // Đã đóng
    }
}
