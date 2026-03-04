package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * AssignmentSubmission (Nộp bài tập)
 * Sinh viên nộp bài cho bài tập
 */
@Entity
@Table(name = "assignment_submissions", indexes = {
        @Index(name = "idx_assignment_sub_assignment", columnList = "assignment_id"),
        @Index(name = "idx_assignment_sub_student", columnList = "student_id"),
        @Index(name = "idx_assignment_sub_enrollment", columnList = "enrollment_id"),
        @Index(name = "idx_assignment_sub_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_assignment_student", columnNames = { "assignment_id", "student_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Bài tập
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Assignment assignment;

    // Sinh viên nộp bài
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User student;

    // Đăng ký học (student + class section)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enrollment_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Enrollment enrollment;

    // URL file trên Cloudinary (nhiều file nối bằng |||)
    @Column(name = "file_url", length = 2000)
    private String fileUrl;

    // Tên file gốc (nhiều file nối bằng |||)
    @Column(name = "file_name", length = 1000)
    private String fileName;

    // Ghi chú của sinh viên
    @Column(columnDefinition = "TEXT")
    private String note;

    // Nhận xét từ giảng viên
    @Column(name = "lecturer_comment", columnDefinition = "TEXT")
    private String lecturerComment;

    // Trạng thái nộp bài
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SubmissionStatus status = SubmissionStatus.SUBMITTED;

    // Thời gian nộp
    @Column(nullable = false)
    private LocalDateTime submittedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onSubmit() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }

    public enum SubmissionStatus {
        SUBMITTED, // Đã nộp
        NOT_SUBMITTED, // Chưa nộp
        OVERDUE // Quá hạn nộp
    }
}
