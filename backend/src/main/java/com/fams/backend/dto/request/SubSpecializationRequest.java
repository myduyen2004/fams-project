package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubSpecializationRequest {
    @jakarta.validation.constraints.NotBlank(message = "Mã chuyên ngành hẹp là bắt buộc")
    @jakarta.validation.constraints.Size(max = 20, message = "Mã chuyên ngành hẹp không được quá 20 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-Z0-9-]+$", message = "Mã chỉ được chứa chữ cái, số và dấu gạch ngang")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-Z].*", message = "Mã phải chứa ít nhất một chữ cái")
    private String code;

    @jakarta.validation.constraints.NotBlank(message = "Tên chuyên ngành hẹp là bắt buộc")
    @jakarta.validation.constraints.Size(min = 5, max = 200, message = "Tên chuyên ngành hẹp phải từ 5-200 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-ZÀ-ỹ].*", message = "Tên phải chứa ít nhất một chữ cái")
    private String name;

    @jakarta.validation.constraints.Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;
    private Long specializationId;
}
