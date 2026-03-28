package com.fams.backend.controller;

import com.fams.backend.dto.response.*;
import com.fams.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DashboardStatsResponse> getStatistics() {
        log.info("GET /api/dashboard/statistics");
        return ResponseEntity.ok(dashboardService.getStatistics());
    }

    @GetMapping("/recent-access")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RecentAccessResponse>> getRecentAccess() {
        log.info("GET /api/dashboard/recent-access");
        return ResponseEntity.ok(dashboardService.getRecentAccess());
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AlertResponse>> getAlerts() {
        log.info("GET /api/dashboard/alerts");
        return ResponseEntity.ok(dashboardService.getAlerts());
    }

    @GetMapping("/notifications")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        log.info("GET /api/dashboard/notifications");
        return ResponseEntity.ok(dashboardService.getNotifications());
    }

    @GetMapping("/system-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SystemLogResponse>> getSystemLogs() {
        log.info("GET /api/dashboard/system-logs");
        return ResponseEntity.ok(dashboardService.getSystemLogs());
    }
}
