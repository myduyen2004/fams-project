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
public class PlagiarismCommentRequest {
    private Long assignmentId;
    private Long submissionId;
    private String assignmentTitle;
    private String courseCode;
    private String studentName;
    private Integer plagiarismPercent;
    private Double probability;
    private Boolean plagiarizedText;
    private Boolean plagiarizedImage;
    private Double textThreshold;
    private Double imageThreshold;
    private List<PlagiarismCommentMatchInput> topMatches;
}
