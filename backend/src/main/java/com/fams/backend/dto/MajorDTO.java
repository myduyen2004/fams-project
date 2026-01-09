package com.fams.backend.dto;

import com.fams.backend.entity.Major;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MajorDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String programDuration;
    private Major.MajorStatus status;
}
