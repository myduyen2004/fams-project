package com.fams.backend.service.impl;

import com.fams.backend.dto.response.*;
import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.Alert;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.NotificationRecipient;
import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.*;
import com.fams.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
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
        private final NotificationRecipientRepository notificationRecipientRepository;
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
        public List<DashboardNotificationResponse> getNotifications() {
                var authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication == null || !authentication.isAuthenticated()
                                || "anonymousUser".equals(authentication.getPrincipal())) {
                        log.debug("No authenticated user found (likely scheduled task), returning empty notifications");
                        return Collections.emptyList();
                }

                String username = authentication.getName();
                User user = userRepository.findByUsername(username).orElse(null);

                if (user == null) {
                        return Collections.emptyList();
                }

                // Lấy toàn bộ notification recipients của user hiện tại
                List<NotificationRecipient> recipients = notificationRecipientRepository
                                .findByRecipientOrderByCreatedAtDesc(user)
                                .stream()
                                // .limit(5) Removed limit to show all notifications
                                .collect(Collectors.toList());

                return recipients.stream()
                                .map(recipient -> {
                                        Notification notification = recipient.getNotification();
                                        User sender = notification.getSender();

                                        // Debug logging
                                        log.debug("Processing notification ID: {}, Sender: {}, FullName: {}",
                                                        notification.getId(),
                                                        sender != null ? sender.getUsername() : "NULL",
                                                        sender != null ? sender.getFullName() : "NULL");

                                        DashboardNotificationResponse response = DashboardNotificationResponse.builder()
                                                        .id(notification.getId())
                                                        .title(notification.getTitle())
                                                        .description(notification.getContent())
                                                        .timestamp(recipient.getCreatedAt().format(DATE_TIME_FORMATTER))
                                                        .isRead(recipient.getIsRead())
                                                        .type(notification.getType() != null
                                                                        ? notification.getType().name()
                                                                        : null)
                                                        .senderName(sender != null ? sender.getUsername() : null)
                                                        .senderFullName(sender != null ? sender.getFullName() : null)
                                                        .senderAvatar(sender != null ? sender.getAvatar() : null)
                                                        .attachmentUrls(notification.getAttachmentUrls() != null
                                                                        ? new java.util.ArrayList<>(notification
                                                                                        .getAttachmentUrls())
                                                                        : new java.util.ArrayList<>())
                                                        .build();

                                        return response;
                                })
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

                // Try to find the recipient record for this user and this notification ID
                java.util.Optional<NotificationRecipient> recipientOpt = notificationRecipientRepository
                                .findByNotificationIdAndRecipient(id, user);

                if (recipientOpt.isPresent()) {
                        NotificationRecipient recipient = recipientOpt.get();
                        Notification notification = recipient.getNotification();
                        User sender = notification.getSender();

                        return DashboardNotificationResponse.builder()
                                        .id(notification.getId())
                                        .title(notification.getTitle())
                                        .description(notification.getContent())
                                        .timestamp(recipient.getCreatedAt().format(DATE_TIME_FORMATTER))
                                        .isRead(recipient.getIsRead())
                                        .type(notification.getType() != null ? notification.getType().name() : null)
                                        .senderName(sender != null ? sender.getUsername() : null)
                                        .senderFullName(sender != null ? sender.getFullName() : null)
                                        .senderAvatar(sender != null ? sender.getAvatar() : null)
                                        .attachmentUrls(notification.getAttachmentUrls() != null
                                                        ? new java.util.ArrayList<>(notification.getAttachmentUrls())
                                                        : new java.util.ArrayList<>())
                                        .build();
                }

                // If no recipient record, check if user has direct access rights
                // (ADMIN/ACADEMIC_STAFF)
                if (user.getRole() == User.UserRole.ADMIN || user.getRole() == User.UserRole.ACADEMIC_STAFF) {
                        Notification notification = notificationRepository.findById(id)
                                        .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo"));
                        User sender = notification.getSender();

                        return DashboardNotificationResponse.builder()
                                        .id(notification.getId())
                                        .title(notification.getTitle())
                                        .description(notification.getContent())
                                        .timestamp(notification.getCreatedAt().format(DATE_TIME_FORMATTER))
                                        .isRead(true) // For staff viewing original, we can say it's read
                                        .type(notification.getType() != null ? notification.getType().name() : null)
                                        .senderName(sender != null ? sender.getUsername() : null)
                                        .senderFullName(sender != null ? sender.getFullName() : null)
                                        .senderAvatar(sender != null ? sender.getAvatar() : null)
                                        .attachmentUrls(notification.getAttachmentUrls() != null
                                                        ? new java.util.ArrayList<>(notification.getAttachmentUrls())
                                                        : new java.util.ArrayList<>())
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
