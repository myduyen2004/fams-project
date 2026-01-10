package com.fams.backend.dto.request;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SemesterDTORequest {
    private String code;
    private String name;
    private String startDate;
    private String endDate;
    private String status;
    private String action; 
}
