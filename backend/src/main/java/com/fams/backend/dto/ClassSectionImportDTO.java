package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSectionImportDTO {
    private Integer rowNumber;
    private String className; // SE18B02-PRN211
    private String courseCode; // PRN211
    private String lecturerCode; // sonnt5
    private Integer maxStudents; // 30

    // Resolved from database
    private String courseName; // Tên môn học (để hiển thị)
    private String lecturerName; // Tên giảng viên (để hiển thị)

    private String status; // VALID, WARNING, ERROR - validation status
    private String errorMessage;
    private String warningMessage;
}
