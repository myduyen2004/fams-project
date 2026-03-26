package com.fams.backend.service;

import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.User;

import java.util.List;
import java.util.Optional;

public interface UserNotificationService {

    void createNotification(User recipient, String title, String content, Notification.NotificationType type,
            String targetUrl, User sender);

    void createBatchNotification(List<User> recipients, String title, String content,
        Notification.NotificationType type, String targetUrl);

    List<NotificationResponse> getMyNotifications();

    void markAsRead(Long notificationId);

    void markAllAsRead();

    int getUnreadNotificationCount();

    Optional<NotificationResponse> getMyNotificationById(Long notificationId);
}
