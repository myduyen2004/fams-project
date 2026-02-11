package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassDetailResponse {
    private String className;
    private String courseCode;
    private String courseName;
    private String semesterName;
    private String majorName;
    private String courseYear; // e.g., "k19"
    private Integer studentCount;
    private String academicYear; // e.g., "2019 - 2023"
    private String status;
    private Boolean hasChatGroup;
    private Long chatGroupId;
    private List<StudentEnrollmentDTO> enrollments;
}
