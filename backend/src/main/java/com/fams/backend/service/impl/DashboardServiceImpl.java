package com.fams.backend.service.impl;

import com.fams.backend.dto.response.*;
import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.Alert;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.repository.*;
import com.fams.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final AccessLogRepository accessLogRepository;
    private final AlertRepository alertRepository;
    private final NotificationRepository notificationRepository;
    private final SystemLogRepository systemLogRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    public DashboardStatsResponse getStatistics() {
        // Count users by role
        long totalStudents = userRepository.countByRole(User.UserRole.STUDENT);
        long totalLecturers = userRepository.countByRole(User.UserRole.LECTURER);
        long totalUsers = userRepository.count();

        // TODO: Count accounts, applications, and behaviors from respective tables
        // For now, returning 0 instead of mock data
        int totalAccounts = (int) totalUsers;
        int totalApplications = 0;
        int totalBehaviors = 0;

        return DashboardStatsResponse.builder()
                .totalStudents((int) totalStudents)
                .totalUsers((int) totalLecturers)
                .totalAccounts(totalAccounts)
                .totalApplications(totalApplications)
                .totalBehaviors(totalBehaviors)
                .build();
    }

    @Override
    public List<RecentAccessResponse> getRecentAccess() {
        List<AccessLog> logs = accessLogRepository.findTop10ByOrderByAccessTimeDesc();

        return logs.stream()
                .map(log -> RecentAccessResponse.builder()
                        .id(log.getId())
                        .email(log.getUser().getEmail())
                        .role(getRoleDisplayName(log.getUser().getRole()))
                        .accessTime(log.getAccessTime().format(DATE_TIME_FORMATTER))
                        .location(log.getLocation())
                        .status(log.getStatus())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<AlertResponse> getAlerts() {
        List<Alert> alerts = alertRepository.findTop5ByOrderByCreatedAtDesc();

        return alerts.stream()
                .map(alert -> AlertResponse.builder()
                        .id(alert.getId())
                        .title(alert.getTitle())
                        .description(alert.getDescription())
                        .timestamp(alert.getCreatedAt().format(DATE_TIME_FORMATTER))
                        .level(alert.getLevel().name().toLowerCase())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationResponse> getNotifications() {
        List<Notification> notifications = notificationRepository.findTop5ByOrderByCreatedAtDesc();

        return notifications.stream()
                .map(notification -> NotificationResponse.builder()
                        .id(notification.getId())
                        .title(notification.getTitle())
                        .description(notification.getContent())
                        .timestamp(notification.getCreatedAt().format(DATE_TIME_FORMATTER))
                        .isRead(false) // Default to unread for system notifications
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<SystemLogResponse> getSystemLogs() {
        List<SystemLog> logs = systemLogRepository.findTop5ByOrderByCreatedAtDesc();

        return logs.stream()
                .map(log -> SystemLogResponse.builder()
                        .id(log.getId())
                        .title(log.getTitle())
                        .description(log.getDescription())
                        .timestamp(log.getCreatedAt().format(DATE_TIME_FORMATTER))
                        .type(log.getType().name().toLowerCase())
                        .build())
                .collect(Collectors.toList());
    }

    private String getRoleDisplayName(User.UserRole role) {
        switch (role) {
            case STUDENT:
                return "Sinh viên";
            case LECTURER:
                return "Giảng viên";
            case ADMIN:
                return "Quản trị viên";
            case ACADEMIC_STAFF:
                return "Phòng đào tạo";
            default:
                return role.name();
        }
    }
}
