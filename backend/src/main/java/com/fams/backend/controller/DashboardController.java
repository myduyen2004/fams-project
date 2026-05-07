package com.fams.backend.controller;

import com.fams.backend.dto.response.*;
import com.fams.backend.service.DashboardService;
import com.fams.backend.service.UserNotificationService;
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
@Tag(name = "Dashboard", description = "Dashboard API")
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserNotificationService notificationService;
    private final com.fams.backend.repository.SystemLogRepository systemLogRepository;
    private final com.fams.backend.repository.AlertRepository alertRepository;

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
    public ResponseEntity<List<DashboardNotificationResponse>> getNotifications() {
        log.info("GET /api/dashboard/notifications");
        return ResponseEntity.ok(dashboardService.getNotifications());
    }

    @GetMapping("/notifications/unread-count")
    @Operation(summary = "Lấy số lượng thông báo chưa đọc")
    public ResponseEntity<java.util.Map<String, Integer>> getUnreadCount() {
        log.info("GET /api/dashboard/notifications/unread-count");
        return ResponseEntity
                .ok(java.util.Collections.singletonMap("count", dashboardService.getUnreadNotificationCount()));
    }

    @GetMapping("/notifications/{id}")
    @Operation(summary = "Lấy chi tiết thông báo trên dashboard theo ID")
    public ResponseEntity<DashboardNotificationResponse> getNotificationById(@PathVariable Long id) {
        log.info("GET /api/dashboard/notifications/{}", id);
        return ResponseEntity.ok(dashboardService.getNotificationById(id));
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
    @Operation(summary = "Lấy nhật ký hệ thống (phân trang)")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<org.springframework.data.domain.Page<com.fams.backend.dto.response.SystemLogResponse>> getSystemLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) com.fams.backend.entity.SystemLog.LogType type,
            @RequestParam(required = false) com.fams.backend.entity.User.UserRole role,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        log.info("GET /api/dashboard/system-logs | search={}, type={}, role={}, page={}, size={}", search, type, role, page, size);
        
        String searchParam = (search != null && !search.trim().isEmpty()) 
            ? "%" + search.trim().toLowerCase() + "%" 
            : null;

        org.springframework.data.domain.Page<com.fams.backend.entity.SystemLog> logs = systemLogRepository.findAllByFilters(
                searchParam, 
                type, 
                role, 
                startDate, 
                endDate,
                org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending())
        );
        
        org.springframework.data.domain.Page<com.fams.backend.dto.response.SystemLogResponse> response = 
            logs.map(logEntry -> com.fams.backend.dto.response.SystemLogResponse.builder()
                .id(logEntry.getId())
                .title(logEntry.getTitle())
                .description(logEntry.getDescription())
                .timestamp(logEntry.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .type(logEntry.getType().name().toLowerCase())
                .performerName(logEntry.getPerformer() != null ? logEntry.getPerformer().getFullName() : "Hệ thống")
                .performerAvatar(logEntry.getPerformer() != null ? logEntry.getPerformer().getAvatar() : null)
                .ipAddress(logEntry.getIpAddress())
                .userAgent(logEntry.getUserAgent())
                .oldValue(logEntry.getOldValue())
                .newValue(logEntry.getNewValue())
                .build());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/alerts/paginated")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách cảnh báo (phân trang)")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<org.springframework.data.domain.Page<com.fams.backend.dto.response.AlertResponse>> getAlertsPaginated(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) com.fams.backend.entity.Alert.AlertLevel level,
            @RequestParam(required = false) com.fams.backend.entity.Alert.AlertType type,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        log.info("GET /api/dashboard/alerts/paginated | search={}, level={}, type={}, page={}, size={}", search, level, type, page, size);

        String searchParam = (search != null && !search.trim().isEmpty())
                ? "%" + search.trim().toLowerCase() + "%"
                : null;

        org.springframework.data.domain.Page<com.fams.backend.entity.Alert> alerts = alertRepository.findAllByFilters(
                searchParam,
                level,
                type,
                startDate,
                endDate,
                org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending())
        );

        org.springframework.data.domain.Page<com.fams.backend.dto.response.AlertResponse> response =
                alerts.map(alert -> com.fams.backend.dto.response.AlertResponse.builder()
                        .id(alert.getId())
                        .title(alert.getTitle())
                        .description(alert.getDescription())
                        .level(alert.getLevel().name())
                        .type(alert.getType().name())
                        .timestamp(alert.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                        .isResolved(false) // Assuming all are active for now or add field
                        .build());

        return ResponseEntity.ok(response);
    }
}
