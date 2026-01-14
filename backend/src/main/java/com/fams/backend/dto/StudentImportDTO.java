package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentImportDTO {
    private Integer rowNumber;
    private String code;
    private String fullName;
    private String email;
    private String phone;
    private String major;
    private String specialization;
    private String subSpecialization;
    private String course;
    private Double gpa;
    private String status; // VALID, ERROR
    private String errorMessage;
}
