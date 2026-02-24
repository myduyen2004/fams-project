package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCourseOptionResponse {
    private Long courseId;
    private String courseCode;
    private String courseName;
    private String className;
    private String semesterCode;
    private String semesterName;
    private Integer semesterId;
}
