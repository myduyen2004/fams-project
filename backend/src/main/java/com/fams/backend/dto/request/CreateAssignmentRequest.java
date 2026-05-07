package com.fams.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssignmentRequest {

    @NotBlank(message = "Tên lớp học là bắt buộc")
    private String className;

    private Long timetableSlotId;

    @NotBlank(message = "Tiêu đề bài tập là bắt buộc")
    private String title;

    private String description;

    private LocalDateTime dueDate;

    // Tài liệu tham khảo
    private java.util.List<String> referenceUrls;
    private java.util.List<String> referenceNames;
}
