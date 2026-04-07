package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {
    @jakarta.validation.constraints.NotBlank(message = "Mật khẩu hiện tại không được để trống")
    private String currentPassword;

    @jakarta.validation.constraints.NotBlank(message = "Mật khẩu mới không được để trống")
    private String newPassword;
}
