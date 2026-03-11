package com.fams.backend.dto.request;

import com.fams.backend.entity.GradeComponent.GradeType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeComponentRequest {

    @NotBlank(message = "Tên đầu điểm không được để trống")
    @Size(max = 100, message = "Tên đầu điểm không được quá 100 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;

    @NotNull(message = "Loại điểm không được để trống")
    private GradeType type;

    @NotNull(message = "Trọng số không được để trống")
    @Min(value = 0, message = "Trọng số phải >= 0")
    @Max(value = 100, message = "Trọng số phải <= 100")
    private Double weight;

    @Builder.Default
    private Boolean isResit = false;

    private Long referenceComponentId;
}
