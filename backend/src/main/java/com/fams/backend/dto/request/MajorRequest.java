package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MajorRequest {
    @jakarta.validation.constraints.NotBlank(message = "Mã ngành là bắt buộc")
    @jakarta.validation.constraints.Size(max = 20, message = "Mã ngành không được quá 20 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-Z0-9-]+$", message = "Mã ngành chỉ được chứa chữ cái, số và dấu gạch ngang")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-Z].*", message = "Mã ngành phải chứa ít nhất một chữ cái")
    private String code;

    @jakarta.validation.constraints.NotBlank(message = "Tên ngành là bắt buộc")
    @jakarta.validation.constraints.Size(min = 5, max = 100, message = "Tên ngành phải từ 5-100 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-ZÀ-ỹ].*", message = "Tên ngành phải chứa ít nhất một chữ cái")
    private String name;

    @jakarta.validation.constraints.Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;

    @jakarta.validation.constraints.NotBlank(message = "Thời gian đào tạo là bắt buộc")
    @jakarta.validation.constraints.Pattern(regexp = "^\\d+\\s*(kì|kỳ|năm)$", flags = jakarta.validation.constraints.Pattern.Flag.CASE_INSENSITIVE, message = "Định dạng: '9 kỳ' hoặc '4 năm'")
    private String programDuration;
}
