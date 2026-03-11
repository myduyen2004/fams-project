package com.fams.backend.repository;

import com.fams.backend.entity.Notification;
import com.fams.backend.entity.NotificationRecipient;
import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT nr FROM NotificationRecipient nr JOIN FETCH nr.notification n LEFT JOIN FETCH n.sender WHERE nr.recipient = :recipient ORDER BY nr.createdAt DESC")
    List<NotificationRecipient> findByRecipientOrderByCreatedAtDesc(User recipient);

    List<NotificationRecipient> findByRecipientAndIsReadFalse(User recipient);

    long countByRecipientAndIsReadFalse(User recipient);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(nr) FROM NotificationRecipient nr WHERE nr.recipient = :recipient AND nr.isRead = false AND nr.isDeleted = false AND nr.notification.type = :type")
    long countByRecipientAndIsReadFalseAndNotification_Type(User recipient, Notification.NotificationType type);

    @org.springframework.data.jpa.repository.Query("SELECT nr FROM NotificationRecipient nr JOIN FETCH nr.notification n LEFT JOIN FETCH n.sender WHERE nr.recipient = :recipient AND n.type = :type ORDER BY nr.createdAt DESC")
    List<NotificationRecipient> findByRecipientAndNotification_TypeOrderByCreatedAtDesc(User recipient,
            Notification.NotificationType type);

    java.util.Optional<NotificationRecipient> findByNotificationIdAndRecipient(Long notificationId, User recipient);
}
