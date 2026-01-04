package com.fams.backend.controller;

import com.fams.backend.dto.response.AcademicStaffDashboardResponse;
import com.fams.backend.service.AcademicStaffDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/academic-staff")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AcademicStaffDashboardController {

    private final AcademicStaffDashboardService dashboardService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<AcademicStaffDashboardResponse> getDashboardData() {
        return ResponseEntity.ok(dashboardService.getDashboardData());
    }
}
