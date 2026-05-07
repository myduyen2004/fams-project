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

    public enum MatchCategory {
        PLAGIARISM_SUSPECT,
        TOPIC_SIMILAR,
        LOW_SIMILARITY
    }

    private Long submissionId;
    private String studentCode;
    private String studentName;
    private String avatar;
    private String className;
    private String assignmentTitle;
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
    private MatchCategory matchCategory;
    private Boolean topicSimilarOnly;
    private Boolean textSuspect;
    private Boolean imageSuspect;
    private String matchComment;
    private List<String> reasonTags;
    private String reasonSummary;
    private List<PlagiarismEvidenceItemResponse> evidenceTop3;
    private List<String> comparedFileLinks;
}
