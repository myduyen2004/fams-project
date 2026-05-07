package com.fams.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentRequest {

    @NotBlank(message = "Mã lớp học phần không được để trống")
    private String className;

    @NotBlank(message = "Mã sinh viên không được để trống")
    private String studentCode;

    private String status; // ENROLLED, DROPPED, COMPLETED, FAILED (optional for create)
}
