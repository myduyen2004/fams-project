package com.fams.backend.dto.response;

import com.fams.backend.entity.SubSpecialization;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubSpecializationResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private SubSpecialization.SubSpecializationStatus status;
    private Long specializationId;
    private Integer totalCredits;
    private Integer courseCount;
    private List<CourseResponse> courses;
    private boolean canDelete;
}
