package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlagiarismEvidenceItemResponse {
    private String modality;
    private Double similarity;
    private PlagiarismEvidenceFragmentResponse target;
    private PlagiarismEvidenceFragmentResponse compared;
}
