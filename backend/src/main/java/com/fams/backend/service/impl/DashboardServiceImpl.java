package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AlertResponse;
import com.fams.backend.dto.response.DashboardNotificationResponse;
import com.fams.backend.dto.response.DashboardStatsResponse;
import com.fams.backend.dto.response.RecentAccessResponse;
import com.fams.backend.dto.response.SystemLogResponse;
import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.Alert;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.AlertRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.SystemLogRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.DashboardService;
import com.fams.backend.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

        private final UserRepository userRepository;
        private final AccessLogRepository accessLogRepository;
        private final AlertRepository alertRepository;
        private final NotificationRepository notificationRepository;
        private final SystemLogRepository systemLogRepository;
        private final UserNotificationService notificationService;

        private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        @Override
        @org.springframework.cache.annotation.Cacheable(value = "dashboard_stats", key = "'global'")
        public DashboardStatsResponse getStatistics() {
                long totalStudents = userRepository.countByRole(User.UserRole.STUDENT);
                long totalLecturers = userRepository.countByRole(User.UserRole.LECTURER);
                long totalUsers = userRepository.count();

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
        public List<DashboardNotificationResponse> getNotifications() {
                List<com.fams.backend.dto.response.NotificationResponse> notifications = notificationService
                                .getMyNotifications();

                return notifications.stream()
                                .limit(10)
                                .map(this::toDashboardNotification)
                                .collect(Collectors.toList());
        }

        @Override
        public DashboardNotificationResponse getNotificationById(Long id) {
                var authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication == null || !authentication.isAuthenticated()
                                || "anonymousUser".equals(authentication.getPrincipal())) {
                        throw new NotFoundException("Người dùng chưa xác thực");
                }

                String username = authentication.getName();
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));

                Optional<com.fams.backend.dto.response.NotificationResponse> mine = notificationService
                                .getMyNotificationById(id);
                if (mine.isPresent()) {
                        return toDashboardNotification(mine.get());
                }

                if (user.getRole() == User.UserRole.ADMIN || user.getRole() == User.UserRole.ACADEMIC_STAFF) {
                        Notification notification = notificationRepository.findById(id)
                                        .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo"));
                        return DashboardNotificationResponse.builder()
                                        .id(notification.getId())
                                        .title(notification.getTitle())
                                        .description(notification.getContent())
                                        .timestamp(formatTime(notification.getSentAt(), notification.getCreatedAt()))
                                        .isRead(true)
                                        .type(notification.getType() != null ? notification.getType().name() : null)
                                        .targetUrl(notification.getTargetUrl())
                                        .senderName("System")
                                        .senderFullName("Hệ thống")
                                        .senderAvatar(null)
                                        .attachmentUrls(new ArrayList<>())
                                        .build();
                }

                throw new NotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền xem");
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

        @Override
        public int getUnreadNotificationCount() {
                var authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication == null || !authentication.isAuthenticated()
                                || "anonymousUser".equals(authentication.getPrincipal())) {
                        return 0;
                }

                return notificationService.getUnreadNotificationCount();
        }

        private DashboardNotificationResponse toDashboardNotification(
                        com.fams.backend.dto.response.NotificationResponse notification) {
                return DashboardNotificationResponse.builder()
                                .id(notification.getId())
                                .title(notification.getTitle())
                                .description(notification.getContent())
                                .timestamp(formatTime(notification.getSentAt(), notification.getCreatedAt()))
                                .isRead(Boolean.TRUE.equals(notification.getIsRead()))
                                .type(notification.getType())
                                .targetUrl(notification.getTargetUrl())
                                .senderName(notification.getSender() != null ? notification.getSender().getUsername() : null)
                                .senderFullName(notification.getSender() != null ? notification.getSender().getFullName() : null)
                                .senderAvatar(notification.getSender() != null ? notification.getSender().getAvatarUrl() : null)
                                .attachmentUrls(notification.getAttachmentUrls() != null
                                                ? new ArrayList<>(notification.getAttachmentUrls())
                                                : new ArrayList<>())
                                .build();
        }

        private String formatTime(LocalDateTime sentAt, LocalDateTime createdAt) {
                LocalDateTime ts = sentAt != null ? sentAt : createdAt;
                return ts != null ? ts.format(DATE_TIME_FORMATTER) : "";
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

