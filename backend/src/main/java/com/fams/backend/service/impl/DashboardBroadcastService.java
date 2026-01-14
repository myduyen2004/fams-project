package com.fams.backend.service.impl;

import com.fams.backend.dto.response.*;
import com.fams.backend.service.DashboardService;
import com.fams.backend.service.MapService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;
    private final DashboardService dashboardService;
    private final MapService mapService;

    /**
     * Broadcast all dashboard statistics and logs
     */
    @org.springframework.scheduling.annotation.Async
    public void broadcastUpdate() {
        log.info("Broadcasting dashboard updates to all topics...");

        // 1. Stats
        DashboardStatsResponse stats = dashboardService.getStatistics();
        messagingTemplate.convertAndSend("/topic/stats", stats);
        log.info("Sent /topic/stats");

        // 2. Recent Access
        List<RecentAccessResponse> recentAccess = dashboardService.getRecentAccess();
        messagingTemplate.convertAndSend("/topic/recent-access", recentAccess);
        log.info("Sent /topic/recent-access (count: {})", recentAccess.size());

        // 3. Alerts
        List<AlertResponse> alerts = dashboardService.getAlerts();
        messagingTemplate.convertAndSend("/topic/alerts", alerts);
        log.info("Sent /topic/alerts (count: {})", alerts.size());

        // 4. Notifications
        List<NotificationResponse> notifications = dashboardService.getNotifications();
        messagingTemplate.convertAndSend("/topic/notifications", notifications);
        log.info("Sent /topic/notifications (count: {})", notifications.size());

        // 5. System Logs
        List<SystemLogResponse> systemLogs = dashboardService.getSystemLogs();
        messagingTemplate.convertAndSend("/topic/system-logs", systemLogs);
        log.info("Sent /topic/system-logs (count: {})", systemLogs.size());

        // 6. Map Data
        OnlineUsersResponse mapData = mapService.getOnlineUsers();
        messagingTemplate.convertAndSend("/topic/map", mapData);
        log.info("Sent /topic/map");
    }

    /**
     * Auto broadcast every 30 seconds for non-event driven updates
     * (e.g. if someone else updates the DB directly)
     */
    @Scheduled(fixedRate = 30000)
    public void scheduledBroadcast() {
        broadcastUpdate();
    }
}
