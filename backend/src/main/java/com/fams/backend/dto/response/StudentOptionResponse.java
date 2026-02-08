package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentOptionResponse {
    private Long id;
    private String code;
    private String fullName;
    private String email;
    private String major;
    private String specialization;
}
