package com.fams.backend.controller;

import com.fams.backend.dto.response.*;
import com.fams.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStatsResponse> getStatistics() {
        return ResponseEntity.ok(dashboardService.getStatistics());
    }

    @GetMapping("/recent-access")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RecentAccessResponse>> getRecentAccess() {
        return ResponseEntity.ok(dashboardService.getRecentAccess());
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AlertResponse>> getAlerts() {
        return ResponseEntity.ok(dashboardService.getAlerts());
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        return ResponseEntity.ok(dashboardService.getNotifications());
    }

    @GetMapping("/system-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SystemLogResponse>> getSystemLogs() {
        return ResponseEntity.ok(dashboardService.getSystemLogs());
    }
}
