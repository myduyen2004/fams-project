package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubSpecializationRequest {
    private String code;
    private String name;
    private String description;
    private Long specializationId;
}
