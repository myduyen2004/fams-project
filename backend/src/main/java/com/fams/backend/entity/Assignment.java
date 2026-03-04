package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Assignment (Bài tập)
 * Giảng viên tạo bài tập cho lớp học
 */
@Entity
@Table(name = "assignments", indexes = {
        @Index(name = "idx_assignment_class", columnList = "class_name"),
        @Index(name = "idx_assignment_created_by", columnList = "created_by"),
        @Index(name = "idx_assignment_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tiêu đề bài tập
    @Column(nullable = false, length = 255)
    private String title;

    // Mô tả chi tiết
    @Column(columnDefinition = "TEXT")
    private String description;

    // Lớp học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_name", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ClassSection classSection;

    // Giảng viên tạo bài tập
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User createdBy;

    // Slot thời khóa biểu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_slot_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private TimetableSlot timetableSlot;

    // Hạn nộp bài
    private LocalDateTime dueDate;

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AssignmentStatus status = AssignmentStatus.OPEN;

    // Tài liệu tham khảo - URL
    @Column(name = "reference_url", length = 500)
    private String referenceUrl;

    // Tài liệu tham khảo - tên hiển thị
    @Column(name = "reference_name", length = 255)
    private String referenceName;

    // Đã gửi thông báo nhắc nhở trước hạn nộp chưa
    @Column(name = "reminder_sent", nullable = false)
    @Builder.Default
    private Boolean reminderSent = false;

    // Danh sách bài nộp
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<AssignmentSubmission> submissions = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum AssignmentStatus {
        OPEN, // Đang mở nộp bài
        CLOSED // Đã đóng
    }
}
