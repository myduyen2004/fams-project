package com.fams.backend.dto.request;

import com.fams.backend.entity.Specialization;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecializationRequest {
    @jakarta.validation.constraints.NotBlank(message = "Mã chuyên ngành là bắt buộc")
    @jakarta.validation.constraints.Size(max = 20, message = "Mã chuyên ngành không được quá 20 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-Z0-9-]+$", message = "Mã chuyên ngành chỉ được chứa chữ cái, số và dấu gạch ngang")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-Z].*", message = "Mã chuyên ngành phải chứa ít nhất một chữ cái")
    private String code;

    @jakarta.validation.constraints.NotBlank(message = "Tên chuyên ngành là bắt buộc")
    @jakarta.validation.constraints.Size(min = 5, max = 100, message = "Tên chuyên ngành phải từ 5-100 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-ZÀ-ỹ].*", message = "Tên chuyên ngành phải chứa ít nhất một chữ cái")
    private String name;

    @jakarta.validation.constraints.Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;
    private Long majorId;
    private Specialization.SpecializationStatus status;
}
