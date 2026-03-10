package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * ScheduleRequest (Yêu cầu thay đổi lịch)
 * Represents a request to change, swap, or cancel a scheduled class
 */
@Entity
@Table(name = "schedule_requests", indexes = {
        @Index(name = "idx_schedule_request_requester", columnList = "requester_id"),
        @Index(name = "idx_schedule_request_class", columnList = "class_name"),
        @Index(name = "idx_schedule_request_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Người yêu cầu (Giảng viên)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    // Lớp học phần - FK tới ClassSection(className)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_name", referencedColumnName = "className", nullable = false)
    private ClassSection classSection;

    // Slot ban đầu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_slot_id")
    private TimetableSlot originalSlot;

    // Slot yêu cầu (mới)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_slot_id")
    private TimetableSlot requestedSlot;

    // Phòng yêu cầu (nếu đổi phòng)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_room_id")
    private Room requestedRoom;

    // Loại yêu cầu
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestType type;

    // Ngày yêu cầu thay đổi (cho trường hợp đổi lịch, mượn phòng)
    private java.time.LocalDate requestedDate;

    // Slot yêu cầu (số từ 1-4)
    private Integer requestedSlotNumber;

    // Lý do
    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String file;

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    // Người phê duyệt
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id")
    private User approver;

    // Thời gian phê duyệt
    private LocalDateTime approvedAt;

    // Ghi chú của người phê duyệt
    @Column(length = 500)
    private String approverNote;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum RequestType {
        RESCHEDULE, // Đổi lịch
        CANCEL, // Hủy buổi học
        SWAP, // Đổi slot với giảng viên khác
        ROOM_CHANGE // Đổi phòng
    }

    public enum RequestStatus {
        PENDING, // Đang chờ duyệt
        APPROVED, // Đã duyệt
        REJECTED, // Đã từ chối
        REVOKED // Đã thu hồi
    }
}
