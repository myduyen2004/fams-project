package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentUpdateRequest {
    private String major;
    private String specialization;
    private String subSpecialization;
    private String course;
    private Double gpa;
}
