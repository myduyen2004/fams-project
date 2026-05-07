package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentPlagiarismResponse {

    private Long assignmentId;
    private Long submissionId;
    private String assignmentTitle;
    private String className;
    private String courseCode;
    private String courseName;
    private String studentCode;
    private String studentName;
    private String avatar;
    private String scope;
    private String model;
    private String strategy;
    private Integer plagiarismPercent;
    private Integer originalityPercent;
    private Double probability;
    private Boolean plagiarized;
    private Boolean plagiarizedText;
    private Boolean plagiarizedImage;
    private Double textThreshold;
    private Double imageThreshold;
    private Integer comparedSubmissionCount;
    private Double textScore;
    private Double imageScore;
    private Double metadataScore;
    private Double fileNameScore;
    private List<String> keySignals;
    private List<AssignmentPlagiarismMatchResponse> topMatches;
    private List<AssignmentPlagiarismMatchResponse> topTextMatches;
    private List<AssignmentPlagiarismMatchResponse> topImageMatches;
    private String overallComment;
    private Double indexCoverage;
    private Integer pendingIndexedSubmissionCount;
    private String coverageNote;
}
