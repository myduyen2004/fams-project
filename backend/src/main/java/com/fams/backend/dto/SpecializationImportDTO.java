package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecializationImportDTO {
    private Integer rowNumber;
    private String majorCode;
    private String code;
    private String name;
    private String description;
    private String statusStr;
    private String status; // VALID, ERROR, WARNING
    private String errorMessage;
    private String warningMessage;
}
