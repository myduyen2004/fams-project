package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentResponse {

    private Long id;
    private String title;
    private String description;

    // Lớp học
    private Long timetableSlotId;
    private String className;
    private String courseName;
    private String courseCode;

    // Giảng viên
    private String lecturerName;

    // Hạn nộp
    private LocalDateTime dueDate;

    // Tài liệu tham khảo
    private String referenceUrl;
    private String referenceName;

    // Trạng thái
    private String status;

    // Thống kê
    private long totalSubmissions;
    private long totalStudents;

    private LocalDateTime createdAt;
}
