package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseImportDTO {
    private Integer rowNumber;
    private String code;
    private String name;
    private Integer credits;
    private Integer numberOfSlots;
    private String description;
    private String statusValue; // ACTIVE, INACTIVE from Excel
    private Boolean isCalculatedInGpa; // true/false or Yes/No mapped from Excel
    private String status; // VALID, WARNING, ERROR - validation status
    private String errorMessage;
    private String warningMessage;
}
