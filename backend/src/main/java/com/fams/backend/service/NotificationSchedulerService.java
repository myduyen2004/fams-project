package com.fams.backend.service;

import com.fams.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý gửi thông báo lên lịch tự động
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationSchedulerService {

    private final NotificationRepository notificationRepository;

    /**
     * Chạy mỗi 30 giây để kiểm tra và gửi các thông báo đã lên lịch
     * Các thông báo có trạng thái SCHEDULED và scheduledAt <= hiện tại sẽ được gửi
     */
    @Scheduled(fixedRate = 30000, initialDelay = 10000) // 30 seconds, start after 10s
    @Transactional
    public void sendScheduledNotifications() {
        log.debug("NotificationSchedulerService skipped: scheduled manual notifications were removed");
    }
}
