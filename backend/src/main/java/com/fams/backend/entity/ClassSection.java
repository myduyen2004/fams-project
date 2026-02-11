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
 * PK: className (e.g., "SE18B02-PRN211")
 */
@Entity
@Table(name = "class_sections", indexes = {
        @Index(name = "idx_class_section_semester", columnList = "semester_id"),
        @Index(name = "idx_class_section_course", columnList = "course_id"),
        @Index(name = "idx_class_section_lecturer", columnList = "lecturer_id")
})
@Getter
@Setter
@ToString(exclude = { "enrollments", "timetableSlots", "chatGroup" })
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSection {

    @Id
    @EqualsAndHashCode.Include
    @Column(length = 50)
    private String className;

    // Môn học
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    // Học kỳ
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    // Giảng viên phụ trách (MSGV) (User với role = LECTURER)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lecturer_id")
    private User lecturer;

    // Số slot trong kỳ (tương ứng với numberOfSlots trong Course)
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
    private ClassStatus status = ClassStatus.UPCOMING;

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

    // Trạng thái gửi điểm cho phòng đào tạo
    @Column(nullable = false)
    @Builder.Default
    private Boolean gradesSubmitted = false;

    // Thời gian gửi điểm
    private LocalDateTime gradesSubmittedAt;

    // Giảng viên gửi điểm
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grades_submitted_by")
    private User gradesSubmittedBy;

    // Trạng thái công bố điểm cho sinh viên (do phòng đào tạo thực hiện)
    @Column(nullable = false)
    @Builder.Default
    private Boolean gradesPublished = false;

    // Thời gian công bố điểm
    private LocalDateTime gradesPublishedAt;

    // Nhân viên phòng đào tạo công bố điểm
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grades_published_by")
    private User gradesPublishedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum ClassStatus {
        UPCOMING, // Sắp diễn ra
        ONGOING, // Đang diễn ra
        FINISHED // Đã kết thúc
    }

    /**
     * Tự động tạo className nếu chưa có trước khi persist
     */
    @PrePersist
    public void generateClassName() {
        if (this.className == null && this.course != null && this.course.getCode() != null) {
            this.className = this.course.getCode() + "-" + System.currentTimeMillis();
        }
    }
}
