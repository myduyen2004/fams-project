package com.fams.backend.service.impl;

import com.fams.backend.document.NotificationReadStatus;
import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.NotificationReadStatusRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.FcmService;
import com.fams.backend.service.UserNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements UserNotificationService {

        private static final int DEFAULT_NOTIFICATION_LIMIT = 20;

        private final NotificationRepository notificationRepository;
        private final NotificationReadStatusRepository notificationReadStatusRepository;
        private final UserRepository userRepository;
        private final SimpMessagingTemplate messagingTemplate;
        private final FcmService fcmService;

        @Override
        @Transactional
        public void createNotification(User recipient, String title, String content, Notification.NotificationType type,
                        String targetUrl, User sender) {
                log.info("Creating notification for user {}: {}", recipient.getUsername(), title);

                Notification notification = Notification.builder()
                                .title(title)
                                .content(content)
                                .type(type)
                                .sentAt(LocalDateTime.now())
                                .targetType(Notification.TargetType.USER)
                                .targetUrl(targetUrl)
                                .build();

                Notification savedNotification = notificationRepository.save(notification);

                NotificationReadStatus readStatus = NotificationReadStatus.builder()
                                .notificationId(savedNotification.getId())
                                .targetType(Notification.TargetType.USER.name())
                                .recipientId(recipient.getId())
                                .createdAt(LocalDateTime.now())
                                .build();
                notificationReadStatusRepository.save(readStatus);

                try {
                        Map<String, String> data = new HashMap<>();
                        data.put("type", type.name());
                        data.put("notificationId", savedNotification.getId().toString());
                        if (targetUrl != null && !targetUrl.isBlank()) {
                                data.put("targetUrl", targetUrl);
                        }

                        fcmService.sendPushNotification(recipient.getId(), title, content, data);
                } catch (Exception e) {
                        log.warn("Failed to send FCM push notification: {}", e.getMessage());
                }

                NotificationResponse response = NotificationResponse.builder()
                                .id(savedNotification.getId())
                                .title(title)
                                .content(content)
                                .type(type.name())
                                .sentAt(savedNotification.getSentAt())
                                .createdAt(savedNotification.getCreatedAt())
                                .targetUrl(targetUrl)
                                .build();

                messagingTemplate.convertAndSendToUser(recipient.getUsername(), "/queue/notifications",
                                Collections.singletonList(response));
        }

        @Override
        @Transactional(readOnly = true)
        public List<NotificationResponse> getMyNotifications() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                log.info("Getting notifications for user: {}", username);
                User user = userRepository.findByUsername(username).orElse(null);

                if (user == null) {
                        return Collections.emptyList();
                }

                List<Notification> notifications = resolveNotificationsForUser(user);
                if (notifications.isEmpty()) {
                        return Collections.emptyList();
                }

                List<Long> notificationIds = notifications.stream().map(Notification::getId).toList();
                Map<Long, NotificationReadStatus> statusMap = notificationReadStatusRepository
                                .findByNotificationIdIn(notificationIds)
                                .stream()
                                .collect(Collectors.toMap(NotificationReadStatus::getNotificationId, s -> s,
                                                (left, right) -> left));

                String userIdStr = user.getId().toString();

                return notifications.stream()
                                .filter(notification -> {
                                        NotificationReadStatus status = statusMap.get(notification.getId());
                                        return status == null || !status.getDeletedBy().contains(userIdStr);
                                })
                                .limit(DEFAULT_NOTIFICATION_LIMIT)
                                .map(notification -> toNotificationResponse(notification, statusMap.get(notification.getId()), userIdStr))
                                .collect(Collectors.toList());
        }

        @Override
        public void markAsRead(Long notificationId) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                log.info("Marking notification {} as read for user {}", notificationId, username);

                User user = userRepository.findByUsername(username).orElse(null);
                if (user == null) {
                        log.warn("User {} not found during markAsRead", username);
                        return;
                }

                Notification notification = notificationRepository.findById(notificationId)
                                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo"));

                if (!isNotificationVisibleToUser(notification, user)) {
                        throw new NotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền xem");
                }

                NotificationReadStatus status = notificationReadStatusRepository
                                .findByNotificationId(notificationId)
                                .orElseGet(() -> NotificationReadStatus.builder()
                                                .notificationId(notification.getId())
                                                .targetType(notification.getTargetType().name())
                                                .createdAt(LocalDateTime.now())
                                                .build());

                status.getReadBy().put(user.getId().toString(), LocalDateTime.now());
                notificationReadStatusRepository.save(status);
                log.info("Notification {} marked as read for user {} successfully", notificationId, username);

                messagingTemplate.convertAndSendToUser(
                                username,
                                "/queue/notifications",
                                java.util.Map.of("type", "READ_UPDATE", "notificationId", notificationId));
        }

        @Override
        public void markAllAsRead() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                log.info("Marking all notifications for user {} as read", username);
                User user = userRepository.findByUsername(username).orElse(null);
                if (user != null) {
                        List<Notification> visibleNotifications = resolveNotificationsForUser(user);
                        if (visibleNotifications.isEmpty()) {
                                return;
                        }

                        List<Long> notificationIds = visibleNotifications.stream().map(Notification::getId).toList();
                        Map<Long, NotificationReadStatus> statusMap = notificationReadStatusRepository
                                        .findByNotificationIdIn(notificationIds)
                                        .stream()
                                        .collect(Collectors.toMap(NotificationReadStatus::getNotificationId, s -> s,
                                                        (left, right) -> left));

                        String userIdStr = user.getId().toString();
                        LocalDateTime now = LocalDateTime.now();
                        List<NotificationReadStatus> statusesToSave = new ArrayList<>();

                        for (Notification notification : visibleNotifications) {
                                NotificationReadStatus status = statusMap.computeIfAbsent(notification.getId(), key ->
                                                NotificationReadStatus.builder()
                                                                .notificationId(notification.getId())
                                                                .targetType(notification.getTargetType().name())
                                                                .createdAt(now)
                                                                .build());

                                if (!status.getReadBy().containsKey(userIdStr)) {
                                        status.getReadBy().put(userIdStr, now);
                                        statusesToSave.add(status);
                                }
                        }

                        if (!statusesToSave.isEmpty()) {
                                notificationReadStatusRepository.saveAll(statusesToSave);
                        }
                        log.info("All notifications for user {} marked as read successfully", username);

                        messagingTemplate.convertAndSendToUser(
                                        username,
                                        "/queue/notifications",
                                        java.util.Map.of("type", "READ_UPDATE", "all", true));
                } else {
                        log.warn("User {} not found during markAllAsRead", username);
                }
        }

        @Override
        @Transactional(readOnly = true)
        public int getUnreadNotificationCount() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username).orElse(null);
                if (user == null) {
                        return 0;
                }

                List<Notification> notifications = resolveNotificationsForUser(user);
                if (notifications.isEmpty()) {
                        return 0;
                }

                List<Long> notificationIds = notifications.stream().map(Notification::getId).toList();
                Map<Long, NotificationReadStatus> statusMap = notificationReadStatusRepository
                                .findByNotificationIdIn(notificationIds)
                                .stream()
                                .collect(Collectors.toMap(NotificationReadStatus::getNotificationId, s -> s,
                                                (left, right) -> left));

                String userIdStr = user.getId().toString();
                int unread = 0;
                for (Notification notification : notifications) {
                        NotificationReadStatus status = statusMap.get(notification.getId());
                        if (status != null && status.getDeletedBy().contains(userIdStr)) {
                                continue;
                        }
                        boolean isRead = status != null && status.getReadBy().containsKey(userIdStr);
                        if (!isRead) {
                                unread++;
                        }
                }

                return unread;
        }

        @Override
        @Transactional(readOnly = true)
        public Optional<NotificationResponse> getMyNotificationById(Long notificationId) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                User user = userRepository.findByUsername(username).orElse(null);
                if (user == null) {
                        return Optional.empty();
                }

                Notification notification = notificationRepository.findById(notificationId).orElse(null);
                if (notification == null || !isNotificationVisibleToUser(notification, user)) {
                        return Optional.empty();
                }

                NotificationReadStatus status = notificationReadStatusRepository.findByNotificationId(notificationId)
                                .orElse(null);
                String userIdStr = user.getId().toString();

                if (status != null && status.getDeletedBy().contains(userIdStr)) {
                        return Optional.empty();
                }

                return Optional.of(toNotificationResponse(notification, status, userIdStr));
        }

        private List<Notification> resolveNotificationsForUser(User user) {
                List<Notification.TargetType> broadcastTypes = new ArrayList<>();
                broadcastTypes.add(Notification.TargetType.ALL);

                if (user.getRole() == User.UserRole.STUDENT) {
                        broadcastTypes.add(Notification.TargetType.STUDENT);
                }
                if (user.getRole() == User.UserRole.LECTURER) {
                        broadcastTypes.add(Notification.TargetType.LECTURER);
                }
                if (user.getRole() == User.UserRole.ACADEMIC_STAFF) {
                        broadcastTypes.add(Notification.TargetType.ACADEMIC_STAFF);
                }
                if (user.getRole() == User.UserRole.ADMIN) {
                        broadcastTypes.add(Notification.TargetType.ADMIN);
                }

                List<Notification> notifications = new ArrayList<>(notificationRepository
                                .findByTargetTypeInOrderBySentAtDesc(broadcastTypes));

                Set<Long> userTargetedIds = new HashSet<>();
                notificationReadStatusRepository.findByRecipientId(user.getId())
                                .forEach(status -> userTargetedIds.add(status.getNotificationId()));
                notificationReadStatusRepository.findByRecipientIdsContaining(user.getId())
                                .forEach(status -> userTargetedIds.add(status.getNotificationId()));

                if (!userTargetedIds.isEmpty()) {
                        notifications.addAll(notificationRepository.findUserTargetedNotifications(
                                        new ArrayList<>(userTargetedIds)));
                }

                Map<Long, Notification> uniqueNotifications = new HashMap<>();
                for (Notification notification : notifications) {
                        uniqueNotifications.put(notification.getId(), notification);
                }

                return uniqueNotifications.values().stream()
                                .sorted(Comparator.comparing(
                                                Notification::getSentAt,
                                                Comparator.nullsLast(Comparator.reverseOrder()))
                                                .thenComparing(Notification::getCreatedAt,
                                                                Comparator.nullsLast(Comparator.reverseOrder())))
                                .toList();
        }

        private boolean isNotificationVisibleToUser(Notification notification, User user) {
                if (notification.getTargetType() == Notification.TargetType.ALL) {
                        return true;
                }

                if (notification.getTargetType() == Notification.TargetType.STUDENT) {
                        return user.getRole() == User.UserRole.STUDENT;
                }

                if (notification.getTargetType() == Notification.TargetType.LECTURER) {
                        return user.getRole() == User.UserRole.LECTURER;
                }

                if (notification.getTargetType() == Notification.TargetType.ACADEMIC_STAFF) {
                        return user.getRole() == User.UserRole.ACADEMIC_STAFF;
                }

                if (notification.getTargetType() == Notification.TargetType.ADMIN) {
                        return user.getRole() == User.UserRole.ADMIN;
                }

                if (notification.getTargetType() == Notification.TargetType.USER) {
                        Optional<NotificationReadStatus> statusOpt = notificationReadStatusRepository
                                        .findByNotificationId(notification.getId());
                        if (statusOpt.isEmpty()) {
                                return false;
                        }

                        NotificationReadStatus status = statusOpt.get();
                        return (status.getRecipientId() != null && status.getRecipientId().equals(user.getId()))
                                        || status.getRecipientIds().contains(user.getId());
                }

                return false;
        }

        private NotificationResponse toNotificationResponse(
                        Notification notification,
                        NotificationReadStatus status,
                        String userIdStr) {
                LocalDateTime readAt = status != null ? status.getReadBy().get(userIdStr) : null;
                return NotificationResponse.builder()
                                .id(notification.getId())
                                .title(notification.getTitle())
                                .content(notification.getContent())
                                .type(notification.getType() != null ? notification.getType().name() : null)
                                .targetType(notification.getTargetType() != null ? notification.getTargetType().name() : null)
                                .createdAt(notification.getCreatedAt())
                                .sentAt(notification.getSentAt())
                                .isRead(readAt != null)
                                .readAt(readAt)
                                .targetUrl(notification.getTargetUrl())
                                .build();
        }
}

