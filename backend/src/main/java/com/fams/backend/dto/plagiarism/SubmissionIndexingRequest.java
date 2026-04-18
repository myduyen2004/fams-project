package com.fams.backend.dto.plagiarism;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionIndexingRequest {
    private Long submissionId;
    private Long assignmentId;
    private Long courseId;
    private Long studentId;
    private String note;
    private List<String> fileUrls;
    private List<String> fileNames;
}

