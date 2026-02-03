package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private Long id;
    private String className;
    private String studentCode;
    private String studentName;
    private String avatar;
    private String email;
    private String phone;
    private String dob;
    private String major;
    private String specialization;
    private String subSpecialization;
    private String status;
}
