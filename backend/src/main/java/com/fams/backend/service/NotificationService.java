package com.fams.backend.service;

import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.User;
import java.util.List;

public interface NotificationService {
    void createNotification(User recipient, String title, String content, Notification.NotificationType type,
            String targetUrl, User sender);

    List<NotificationResponse> getMyNotifications();

    void markAsRead(Long notificationRecipientId);

    void markAllAsRead();
}
