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
    private String semesterName;
    private String lecturerName;
    private String lecturerUsername;
    private String enrollmentInfo; // e.g., "28 / 30"
    private Integer slots;
    private Integer maxStudents;
    private String status; // UPCOMING, ONGOING, FINISHED
    private String semesterStatus; // UPCOMING, ONGOING, COMPLETED
}
