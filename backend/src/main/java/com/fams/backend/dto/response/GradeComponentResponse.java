package com.fams.backend.dto.response;

import com.fams.backend.entity.GradeComponent;
import com.fams.backend.entity.GradeComponent.GradeType;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeComponentResponse {

    private Long id;
    private String name;
    private String description;
    private GradeType type;
    private Double weight;
    private Boolean isResit;
    private Long referenceComponentId;
    private String referenceComponentName;
    private Long courseId;
    private String courseCode;
    private String courseName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static GradeComponentResponse fromEntity(GradeComponent entity) {
        GradeComponentResponseBuilder builder = GradeComponentResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .type(entity.getType())
                .weight(entity.getWeight())
                .isResit(entity.getIsResit())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt());

        if (entity.getCourse() != null) {
            builder.courseId(entity.getCourse().getId())
                    .courseCode(entity.getCourse().getCode())
                    .courseName(entity.getCourse().getName());
        }

        if (entity.getReferenceComponent() != null) {
            builder.referenceComponentId(entity.getReferenceComponent().getId())
                    .referenceComponentName(entity.getReferenceComponent().getName());
        }

        return builder.build();
    }
}
