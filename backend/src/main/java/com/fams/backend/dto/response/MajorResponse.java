package com.fams.backend.dto.response;

import com.fams.backend.entity.Major;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MajorResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String programDuration;
    private Major.MajorStatus status;
    private boolean canDelete;
    private int numberOfSpecializations;
}
