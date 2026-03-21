package com.fams.backend.repository;

import com.fams.backend.document.NotificationReadStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationReadStatusRepository extends MongoRepository<NotificationReadStatus, String> {

    Optional<NotificationReadStatus> findByNotificationId(Long notificationId);

    List<NotificationReadStatus> findByNotificationIdIn(List<Long> notificationIds);

    List<NotificationReadStatus> findByRecipientId(Long recipientId);

    List<NotificationReadStatus> findByRecipientIdsContaining(Long recipientId);
}
