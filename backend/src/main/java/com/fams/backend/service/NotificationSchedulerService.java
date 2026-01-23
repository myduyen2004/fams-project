package com.fams.backend.service;

import com.fams.backend.entity.Notification;
import com.fams.backend.entity.Notification.NotificationStatus;
import com.fams.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service xử lý gửi thông báo lên lịch tự động
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationSchedulerService {

    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    /**
     * Chạy mỗi 30 giây để kiểm tra và gửi các thông báo đã lên lịch
     * Các thông báo có trạng thái SCHEDULED và scheduledAt <= hiện tại sẽ được gửi
     */
    @Scheduled(fixedRate = 30000, initialDelay = 10000) // 30 seconds, start after 10s
    @Transactional
    public void sendScheduledNotifications() {
        try {
            LocalDateTime now = LocalDateTime.now();
            log.info("Checking scheduled notifications at {}", now.format(FORMATTER));

            // Tìm các thông báo đã lên lịch và đã đến thời gian gửi (scheduledAt <= now)
            List<Notification> scheduledNotifications = notificationRepository.findByStatusAndScheduledAtLessThanEqual(
                    NotificationStatus.SCHEDULED,
                    now);

            if (scheduledNotifications.isEmpty()) {
                log.info("No scheduled notifications to send at {}", now.format(FORMATTER));
                return;
            }

            log.info("Found {} scheduled notifications to send", scheduledNotifications.size());

            // Cập nhật trạng thái thành SENT và ghi nhận thời gian gửi
            for (Notification notification : scheduledNotifications) {
                log.info("Processing notification ID: {}, Title: '{}', ScheduledAt: {}",
                        notification.getId(),
                        notification.getTitle(),
                        notification.getScheduledAt() != null ? notification.getScheduledAt().format(FORMATTER)
                                : "null");

                notification.setStatus(NotificationStatus.SENT);
                notification.setSentAt(now);

                // Tạo recipients cho thông báo
                notificationService.createNotificationRecipients(notification);
            }

            notificationRepository.saveAll(scheduledNotifications);
            log.info("Successfully sent {} scheduled notifications at {}",
                    scheduledNotifications.size(), now.format(FORMATTER));

        } catch (Exception e) {
            log.error("Error sending scheduled notifications: {}", e.getMessage(), e);
        }
    }
}
