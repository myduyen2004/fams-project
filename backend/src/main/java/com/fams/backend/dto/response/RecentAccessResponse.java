package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentAccessResponse {
    private Long id;
    private String email;
    private String role;
    private String accessTime;
    private String location;
    private String status;
}
