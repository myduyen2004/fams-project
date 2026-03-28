package com.fams.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitAssignmentRequest {

    @NotNull(message = "Assignment ID is required")
    private Long assignmentId;

    private List<String> fileUrls;

    private List<String> fileNames;

    private String note;
}
