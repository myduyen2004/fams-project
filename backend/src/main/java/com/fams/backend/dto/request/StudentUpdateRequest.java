package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class StudentUpdateRequest extends UserRequest {
    private String major;
    private String specialization;
    private String subSpecialization;
    private String course;
    private Double gpa;
}
