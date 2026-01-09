package com.fams.backend.dto;

import com.fams.backend.entity.Specialization;
import lombok.Data;

@Data
public class SpecializationCreateRequest {
    private String code;
    private String name;
    private String description;
    private Long majorId;
    private Specialization.SpecializationStatus status;
}
