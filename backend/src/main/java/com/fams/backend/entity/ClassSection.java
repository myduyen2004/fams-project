package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ClassSection (Lớp học phần)
 * Represents a specific class section for a course in a semester
 * PK: className = classCode + courseCode (e.g., "SE18B02-PRN211")
 */
@Entity
@Table(name = "class_sections", indexes = {
        @Index(name = "idx_class_section_class_code", columnList = "classCode"),
        @Index(name = "idx_class_section_semester", columnList = "semester_id"),
        @Index(name = "idx_class_section_course", columnList = "course_id"),
        @Index(name = "idx_class_section_lecturer", columnList = "lecturer_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSection {

    // Mã lớp = Mã lớp + Mã môn (e.g., "SE18B02-PRN211") - PRIMARY KEY
    @Id
    @Column(length = 50)
    private String className;

    // Mã lớp (e.g., "SE18B02")
    @Column(nullable = false, length = 20)
    private String classCode;

    // Môn học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    // Học kỳ
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    // Giảng viên phụ trách (MSGV)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lecturer_id")
    private User lecturer;

    // Số slot trong kỳ
    @Column(nullable = false)
    @Builder.Default
    private Integer numberOfSlots = 20;

    // Số lượng sinh viên tối đa
    @Column(nullable = false)
    @Builder.Default
    private Integer maxStudents = 30;

    // Số lượng đã đăng ký
    @Column(nullable = false)
    @Builder.Default
    private Integer currentEnrollment = 0;

    // Trạng thái lớp
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ClassStatus status = ClassStatus.OPEN;

    // Hiển thị thời khóa biểu cho người dùng
    @Column(nullable = false)
    @Builder.Default
    private Boolean timetablePublished = false;

    // Danh sách đăng ký
    @OneToMany(mappedBy = "classSection", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Enrollment> enrollments = new ArrayList<>();

    // Danh sách slot thời khóa biểu
    @OneToMany(mappedBy = "classSection", cascade = CascadeType.ALL)
    @Builder.Default
    private List<TimetableSlot> timetableSlots = new ArrayList<>();

    // Nhóm chat của lớp (quan hệ 1-1: mỗi lớp có 1 nhóm chat riêng)
    @OneToOne(mappedBy = "classSection", cascade = CascadeType.ALL)
    private ChatGroup chatGroup;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum ClassStatus {
        OPEN, // Đang mở đăng ký
        CLOSED, // Đã đóng đăng ký
        FULL, // Đã đủ số lượng
        IN_PROGRESS, // Đang diễn ra
        COMPLETED, // Đã hoàn thành
        CANCELLED // Đã hủy
    }

    /**
     * Tự động tạo className từ classCode và courseCode trước khi persist
     */
    @PrePersist
    public void generateClassName() {
        if (this.className == null && this.classCode != null && this.course != null && this.course.getCode() != null) {
            this.className = this.classCode + "-" + this.course.getCode();
        }
    }
}
