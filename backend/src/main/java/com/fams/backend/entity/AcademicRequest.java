package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * AcademicRequest (Yêu cầu học thuật)
 * Represents a student's academic request (e.g., leave, retake, class change,
 * grade appeal, etc.)
 */
@Entity
@Table(name = "academic_requests", indexes = {
        @Index(name = "idx_academic_request_student", columnList = "student_id"),
        @Index(name = "idx_academic_request_type", columnList = "request_type"),
        @Index(name = "idx_academic_request_status", columnList = "status"),
        @Index(name = "idx_academic_request_semester", columnList = "semester_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcademicRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Sinh viên gửi yêu cầu
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User student;

    // Loại yêu cầu (1-9)
    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 50)
    private AcademicRequestType requestType;

    // Tiêu đề yêu cầu (tự động cho type 1-8, người dùng nhập cho type 9)
    @Column(nullable = false, length = 255)
    private String requestTitle;

    // Học kỳ liên quan (nullable - tùy loại yêu cầu)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Semester semester;

    // Môn học liên quan (nullable - cho phúc khảo, học lại, học vượt)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Course course;

    // Lớp học phần liên quan (nullable - cho phúc khảo, đổi lớp)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_section_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ClassSection classSection;

    // Lớp muốn chuyển đến (cho đổi lớp)
    @Column(length = 100)
    private String toClassName;

    // Ngành muốn chuyển (cho chuyển ngành)
    @Column(length = 100)
    private String toMajor;

    // Chuyên ngành muốn chuyển (cho chuyển ngành)
    @Column(length = 100)
    private String toSpecialization;

    // Chuyên ngành hẹp muốn chuyển (cho đổi chuyên ngành hẹp)
    @Column(length = 100)
    private String toSubSpecialization;

    // Lý do
    @Column(columnDefinition = "TEXT")
    private String reason;

    // Ghi chú thêm
    @Column(columnDefinition = "TEXT")
    private String note;

    // File đính kèm (URL sau khi upload)
    @Column(length = 500)
    private String fileUrl;

    // Trạng thái yêu cầu
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    // Ngày bắt đầu có thể gửi yêu cầu (calculated)
    @Column(name = "start_date")
    private LocalDate startDate;

    // Ngày hết hạn gửi yêu cầu (calculated)
    @Column(name = "due_date")
    private LocalDate dueDate;

    // Người phê duyệt
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
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

    /**
     * Trạng thái yêu cầu
     */
    public enum RequestStatus {
        PENDING, // Chờ xử lý
        APPROVED, // Đã duyệt
        REJECTED, // Từ chối
        CANCELLED // Đã hủy
    }

    /**
     * Loại yêu cầu học thuật (9 loại)
     * Mỗi loại có tiêu đề mặc định và quy tắc deadline
     */
    public enum AcademicRequestType {
        PAUSE_SEMESTER("Xin tạm nghỉ học", DeadlineRule.ONE_WEEK_BEFORE,
                "Sinh viên xin tạm nghỉ học trong một hoặc nhiều học kỳ vì lý do cá nhân hoặc sức khỏe."),
        RETAKE_COURSE("Đăng ký học lại", DeadlineRule.ONE_WEEK_BEFORE,
                "Đăng ký học lại các môn học đã trượt hoặc muốn cải thiện điểm số."),
        CHANGE_CLASS("Yêu cầu đổi lớp", DeadlineRule.ONE_WEEK_BEFORE,
                "Yêu cầu chuyển từ lớp học phần này sang lớp học phần khác của cùng một môn học."),
        OVERLOAD_STUDY("Đăng ký học vượt", DeadlineRule.ONE_WEEK_BEFORE,
                "Đăng ký học thêm các môn học ngoài kế hoạch học tập chuẩn của học kỳ."),
        ABSENT_REQUEST("Đề nghị miễn điểm danh", DeadlineRule.BEFORE_SEMESTER,
                "Đề nghị được miễn điểm danh trong các buổi học vì lý do đặc biệt (tham gia cuộc thi, sự kiện trường...)."),
        GRADE_APPEAL("Đề nghị phúc khảo", DeadlineRule.THREE_DAYS_AFTER,
                "Yêu cầu xem xét lại điểm thi hoặc điểm thành phần nếu sinh viên thấy có sai sót."),
        CHANGE_MAJOR("Đề nghị chuyển ngành", DeadlineRule.FIVE_WEEKS_BEFORE,
                "Yêu cầu chuyển đổi từ ngành học hiện tại sang một ngành học khác trong trường."),
        CHANGE_SPECIALIZATION("Đề nghị đổi chuyên ngành hẹp", DeadlineRule.FIVE_WEEKS_BEFORE,
                "Yêu cầu thay đổi chuyên ngành hẹp (chuyên sâu) trong cùng một ngành học chính."),
        OTHERS("Các loại đơn khác", DeadlineRule.CUSTOM,
                "Dùng cho các loại yêu cầu học thuật khác không nằm trong các danh mục trên.");

        private final String defaultTitle;
        private final DeadlineRule deadlineRule;
        private final String description;

        AcademicRequestType(String defaultTitle, DeadlineRule deadlineRule, String description) {
            this.defaultTitle = defaultTitle;
            this.deadlineRule = deadlineRule;
            this.description = description;
        }

        public String getDefaultTitle() {
            return defaultTitle;
        }

        public DeadlineRule getDeadlineRule() {
            return deadlineRule;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * Quy tắc tính deadline
     * - 1TB: 1 tuần trước khi học kỳ mới gần nhất bắt đầu
     * - B: Trước khi học kỳ mới gần nhất bắt đầu
     * - 3DA: 3 ngày sau khi công bố điểm thi (PE/FE)
     * - 5TB: 5 tuần trước khi học kỳ mới gần nhất bắt đầu
     * - CUSTOM: Không có deadline cố định (loại khác)
     */
    public enum DeadlineRule {
        ONE_WEEK_BEFORE, // 1TB - 1 tuần trước học kỳ mới
        BEFORE_SEMESTER, // B - Trước học kỳ mới
        THREE_DAYS_AFTER, // 3DA - 3 ngày sau công bố điểm
        FIVE_WEEKS_BEFORE, // 5TB - 5 tuần trước học kỳ mới
        CUSTOM // Không áp dụng deadline
    }
}
