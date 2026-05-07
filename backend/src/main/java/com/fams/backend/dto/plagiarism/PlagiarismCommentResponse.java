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
public class PlagiarismCommentResponse {
    private String overallComment;
    private List<MatchComment> matchComments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchComment {
        private Long submissionId;
        private String comment;
    }
}

