package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssignmentRequest {

    private String title;

    private String description;

    private LocalDateTime dueDate;

    // Tài liệu tham khảo
    private String referenceUrl;
    private String referenceName;
}
