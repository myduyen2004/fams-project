package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Enrollment (Đăng ký học)
 * Represents a student's enrollment in a class section
 * Composite: className (FK) + studentCode (MSSV)
 */
@Entity
@Table(name = "enrollments", indexes = {
        @Index(name = "idx_enrollment_class_name", columnList = "class_name"),
        @Index(name = "idx_enrollment_student_code", columnList = "student_code"),
        @Index(name = "idx_enrollment_student", columnList = "student_id"),
        @Index(name = "idx_enrollment_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_class_student", columnNames = { "class_name", "student_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lớp học phần - FK tới ClassSection(className)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_name", referencedColumnName = "className", nullable = false)
    private ClassSection classSection;

    // MSSV - lưu trực tiếp để dễ query
    @Column(name = "student_code", nullable = false, length = 20)
    private String studentCode;

    // Sinh viên - FK tới User
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    // Trạng thái đăng ký
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EnrollmentStatus status = EnrollmentStatus.ENROLLED;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Tự động lấy studentCode từ User trước khi persist
     */
    @PrePersist
    public void populateStudentCode() {
        if (this.studentCode == null && this.student != null && this.student.getCode() != null) {
            this.studentCode = this.student.getCode();
        }
    }

    public enum EnrollmentStatus {
        ENROLLED, // Đang học
        DROPPED, // Đã hủy đăng ký
        COMPLETED, // Đã hoàn thành
        FAILED // Không đạt
    }
}
