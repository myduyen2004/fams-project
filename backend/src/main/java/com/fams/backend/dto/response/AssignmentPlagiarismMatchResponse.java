package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentPlagiarismMatchResponse {

    private Long submissionId;
    private String studentCode;
    private String studentName;
    private Integer plagiarismPercent;
    private Double probability;
    private Double textScore;
    private Double imageScore;
    private Double metadataScore;
    private Double fileNameScore;
    private LocalDateTime submittedAt;
    private String notePreview;
    private List<String> fileNames;
    private List<String> sharedSignals;
}
