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
    private String code;
    private String name;
    private String description;
    private Integer credits;
    private Integer numberOfSlots;
    private Integer fixedSemester;
}
