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
public class PlagiarismCommentMatchInput {
    private Long submissionId;
    private String studentCode;
    private String studentName;
    private Integer plagiarismPercent;
    private Double textScore;
    private Double imageScore;
    private Double metadataScore;
    private String matchCategory;
    private Boolean topicSimilarOnly;
    private Boolean textSuspect;
    private Boolean imageSuspect;
    private List<String> sharedSignals;
}
