package com.fams.backend.controller;

import com.fams.backend.dto.response.*;
import com.fams.backend.service.DashboardService;
import com.fams.backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
    private final NotificationService notificationService;

    @GetMapping("/stats")
    @Operation(summary = "Lấy thống kê trang dashboard")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        log.info("GET /api/dashboard/stats");
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
    public ResponseEntity<List<DashboardNotificationResponse>> getNotifications() {
        log.info("GET /api/dashboard/notifications");
        return ResponseEntity.ok(notificationService.getMyNotifications());
    }

    @PostMapping("/notifications/{id}/read")
    @Operation(summary = "Đánh dấu thông báo là đã đọc")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        log.info("POST /api/dashboard/notifications/{}/read", id);
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/notifications/read-all")
    @Operation(summary = "Đánh dấu tất cả thông báo là đã đọc")
    public ResponseEntity<Void> markAllAsRead() {
        log.info("POST /api/dashboard/notifications/read-all");
        notificationService.markAllAsRead();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/system-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SystemLogResponse>> getSystemLogs() {
        log.info("GET /api/dashboard/system-logs");
        return ResponseEntity.ok(dashboardService.getSystemLogs());
    }
}
