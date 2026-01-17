package com.fams.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentImportDTO {
    private Integer rowNumber;
    private String studentCode; // MSSV: SE537083
    private String className; // Mã lớp: SE18B02-PRN211

    // Resolved from database
    private String studentName; // Tên sinh viên (để hiển thị)
    private String courseName; // Tên môn học (để hiển thị)

    private String status; // VALID, WARNING, ERROR - validation status
    private String errorMessage;
    private String warningMessage;
}
