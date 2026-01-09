package com.fams.backend.dto.response;

import com.fams.backend.entity.Specialization;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecializationResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer totalCredits;
    private Specialization.SpecializationStatus status;
    private Boolean canDelete;
}
