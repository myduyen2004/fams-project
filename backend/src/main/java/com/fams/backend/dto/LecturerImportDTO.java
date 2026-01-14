package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerImportDTO {
    private Integer rowNumber;
    private String code;
    private String fullName;
    private String email;
    private String phone;
    private String department;
    private String expertise;
    private String bio;
    private String status; // VALID, ERROR
    private String errorMessage;
}
