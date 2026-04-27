package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIToolTestRequestDto {

    private String toolName;
    private String toolType;
    private String sqlTemplate;
    private String requiredFields;
    private String requiredRespFields;
    private java.util.Map<String, Object> params;
}
