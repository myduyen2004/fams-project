package com.fams.backend.service.impl;

import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.NotificationRecipient;
import com.fams.backend.entity.User;
import com.fams.backend.repository.NotificationRecipientRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

        private final NotificationRepository notificationRepository;
        private final NotificationRecipientRepository recipientRepository;
        private final UserRepository userRepository;
        private final SimpMessagingTemplate messagingTemplate;

        private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        @Override
        @Transactional
        public void createNotification(User recipient, String title, String content, Notification.NotificationType type,
                        String targetUrl, User sender) {
                log.info("Creating notification for user {}: {}", recipient.getUsername(), title);

                Notification notification = Notification.builder()
                                .title(title)
                                .content(content)
                                .type(type)
                                .status(Notification.NotificationStatus.SENT)
                                .sentAt(LocalDateTime.now())
                                .targetType(Notification.TargetType.USER)
                                .sender(sender)
                                .build();

                Notification savedNotification = notificationRepository.save(notification);

                NotificationRecipient nr = NotificationRecipient.builder()
                                .notification(savedNotification)
                                .recipient(recipient)
                                .isRead(false)
                                .build();

                recipientRepository.save(nr);

                // Broadcast to user-specific topic
                NotificationResponse response = NotificationResponse.builder()
                                .id(nr.getId())
                                .title(title)
                                .description(content)
                                .timestamp(LocalDateTime.now().format(DATE_TIME_FORMATTER))
                                .isRead(false)
                                .type(type.name())
                                .targetUrl(targetUrl)
                                .senderName(sender != null ? sender.getFullName() : "System")
                                .senderAvatar(sender != null ? sender.getAvatar() : null)
                                .build();

                messagingTemplate.convertAndSendToUser(recipient.getUsername(), "/queue/notifications",
                                Collections.singletonList(response));
        }

        @Override
        @Transactional(readOnly = true)
        public List<NotificationResponse> getMyNotifications() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                log.info("Getting notifications for user: {}", username);
                User user = userRepository.findByUsername(username)
                                .orElse(null);

                if (user == null)
                        return Collections.emptyList();

                List<NotificationRecipient> recs = recipientRepository.findByRecipientOrderByCreatedAtDesc(user);
                log.info("Found {} notification recipients for user {}", recs.size(), username);

                return recs.stream()
                                .limit(20)
                                .map(nr -> {
                                        boolean isRead = nr.getIsRead();
                                        log.debug("Notification ID: {}, isRead from DB: {}, readAt: {}",
                                                        nr.getId(), isRead, nr.getReadAt());
                                        return NotificationResponse.builder()
                                                        .id(nr.getId())
                                                        .title(nr.getNotification().getTitle())
                                                        .description(nr.getNotification().getContent())
                                                        .timestamp(nr.getCreatedAt().format(DATE_TIME_FORMATTER))
                                                        .isRead(isRead)
                                                        .type(nr.getNotification().getType().name())
                                                        .targetUrl(null) // TODO: Add targetUrl to Notification entity
                                                                         // if needed
                                                        .senderName(nr.getNotification().getSender() != null
                                                                        ? nr.getNotification().getSender().getFullName()
                                                                        : "System")
                                                        .senderAvatar(nr.getNotification().getSender() != null
                                                                        ? nr.getNotification().getSender().getAvatar()
                                                                        : null)
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public void markAsRead(Long notificationRecipientId) {
                log.info("Marking notification recipient {} as read", notificationRecipientId);
                recipientRepository.findById(notificationRecipientId).ifPresentOrElse(nr -> {
                        nr.setIsRead(true);
                        nr.setReadAt(LocalDateTime.now());
                        recipientRepository.save(nr);
                        log.info("Notification recipient {} marked as read successfully", notificationRecipientId);
                }, () -> log.warn("Notification recipient {} not found", notificationRecipientId));
        }

        @Override
        @Transactional
        public void markAllAsRead() {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                log.info("Marking all notifications for user {} as read", username);
                User user = userRepository.findByUsername(username).orElse(null);
                if (user != null) {
                        List<NotificationRecipient> unread = recipientRepository.findByRecipientAndIsReadFalse(user);
                        log.info("Found {} unread notifications for user {}", unread.size(), username);
                        unread.forEach(nr -> {
                                nr.setIsRead(true);
                                nr.setReadAt(LocalDateTime.now());
                        });
                        recipientRepository.saveAll(unread);
                        log.info("All notifications for user {} marked as read successfully", username);
                } else {
                        log.warn("User {} not found during markAllAsRead", username);
                }
        }
}
