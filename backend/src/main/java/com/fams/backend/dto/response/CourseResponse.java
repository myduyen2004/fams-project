package com.fams.backend.dto.response;

import com.fams.backend.entity.Course;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Integer credits;
    private Integer numberOfSlots;
    private Double totalWeight;
    private Integer semester; // Học kỳ được gán trong chuyên ngành
    private Course.CourseStatus status;
    private Integer orderIndex; // Thứ tự trong specialization/subspecialization
    private boolean canDelete;
    private Boolean isCalculatedInGpa;
    private List<PrerequisiteDTO> prerequisites;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrerequisiteDTO {
        private Long id;
        private String code;
        private String name;
    }
}
