package com.fams.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSectionRequest {

    @NotBlank(message = "Mã lớp học phần không được để trống")
    private String className;

    @NotBlank(message = "Mã môn học không được để trống")
    private String courseCode;

    @NotBlank(message = "Mã học kỳ không được để trống")
    private String semesterCode;

    private String lecturerUsername; // Username của giảng viên (có thể null)

    @Min(value = 1, message = "Số slot phải lớn hơn 0")
    private Integer numberOfSlots; // Optional - defaults to course.numberOfSlots

    @Min(value = 1, message = "Số lượng sinh viên tối đa phải lớn hơn 0")
    private Integer maxStudents; // Optional - defaults to 30
}
