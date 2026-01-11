package com.fams.backend.dto.request;

import com.fams.backend.entity.Specialization;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecializationRequest {
    private String code;
    private String name;
    private String description;
    private Long majorId;
    private Specialization.SpecializationStatus status;
}
