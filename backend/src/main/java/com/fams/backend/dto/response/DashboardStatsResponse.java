package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private Integer totalStudents;
    private Integer totalUsers;
    private Integer totalAccounts;
    private Integer totalApplications;
    private Integer totalBehaviors;
}
