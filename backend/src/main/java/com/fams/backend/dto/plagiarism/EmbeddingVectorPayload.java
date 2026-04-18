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
public class EmbeddingVectorPayload {
    private String fileName;
    private String pageOrChunk;
    private String contentPreview;
    private List<Double> embedding;
}

