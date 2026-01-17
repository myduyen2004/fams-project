package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSectionResponse {
    private String className;
    private String courseCode;
    private String courseName;
    private String semesterCode;
    private String lecturerName;
    private String enrollmentInfo; // e.g., "28 / 30"
    private Integer slots;
    private String status; // UPCOMING, ONGOING, FINISHED
}
