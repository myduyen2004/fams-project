package com.fams.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyGradeOtpRequest {
    @NotBlank(message = "OTP không được để trống")
    private String otp;
}
