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
public class SubmissionIndexingResponse {
    private String model;
    private List<EmbeddingVectorPayload> textEmbeddings;
    private List<EmbeddingVectorPayload> imageEmbeddings;
    private List<String> warnings;
}

