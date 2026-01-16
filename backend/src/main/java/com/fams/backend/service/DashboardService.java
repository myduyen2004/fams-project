package com.fams.backend.service;

import com.fams.backend.dto.response.*;

import java.util.List;

public interface DashboardService {
    DashboardStatsResponse getStatistics();

    List<RecentAccessResponse> getRecentAccess();

    List<AlertResponse> getAlerts();

    List<DashboardNotificationResponse> getNotifications();

    DashboardNotificationResponse getNotificationById(Long id);

    List<SystemLogResponse> getSystemLogs();
}
