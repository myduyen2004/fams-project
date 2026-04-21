package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlagiarismEvidenceFragmentResponse {
    private String fileName;
    private String pageOrChunk;
    private String contentPreview;
}
