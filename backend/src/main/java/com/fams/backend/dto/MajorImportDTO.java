package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MajorImportDTO {
    private Integer rowNumber;
    private String code;
    private String name;
    private String description;
    private String programDuration;
    private String statusStr;
    private String status; // VALID, ERROR, WARNING
    private String errorMessage;
    private String warningMessage;
}
