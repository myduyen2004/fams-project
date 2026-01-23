package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEnrollmentDTO {
    private String studentName;
    private String email;
    private String phone;
    private String idCard;
    private String majorName;
    private String studentCode;
    private String status;
}
