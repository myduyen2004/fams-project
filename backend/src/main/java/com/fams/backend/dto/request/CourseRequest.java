package com.fams.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequest {
    @jakarta.validation.constraints.NotBlank(message = "Mã môn là bắt buộc")
    @jakarta.validation.constraints.Size(max = 20, message = "Mã môn không được quá 20 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-Z0-9-]+$", message = "Mã môn chỉ được chứa chữ cái, số và dấu gạch ngang")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-Z].*", message = "Mã môn phải chứa ít nhất một chữ cái")
    private String code;

    @jakarta.validation.constraints.NotBlank(message = "Tên môn học là bắt buộc")
    @jakarta.validation.constraints.Size(min = 5, max = 200, message = "Tên môn học phải từ 5-200 ký tự")
    @jakarta.validation.constraints.Pattern(regexp = ".*[a-zA-ZÀ-ỹ].*", message = "Tên môn học phải chứa ít nhất một chữ cái")
    private String name;

    @jakarta.validation.constraints.Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;

    @jakarta.validation.constraints.NotNull(message = "Số tín chỉ là bắt buộc")
    @jakarta.validation.constraints.Min(value = 1, message = "Số tín chỉ phải từ 1-10")
    @jakarta.validation.constraints.Max(value = 10, message = "Số tín chỉ phải từ 1-10")
    private Integer credits;

    @jakarta.validation.constraints.NotNull(message = "Số slot là bắt buộc")
    @jakarta.validation.constraints.Min(value = 1, message = "Số slot phải từ 1-100")
    @jakarta.validation.constraints.Max(value = 100, message = "Số slot phải từ 1-100")
    private Integer numberOfSlots;

    private Boolean isCalculatedInGpa;
}
