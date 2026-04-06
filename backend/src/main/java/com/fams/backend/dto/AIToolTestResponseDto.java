package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIToolTestResponseDto {
    private Boolean passed;
    private String message;
    private String logs;
    private Long executionTimeMs;
}
