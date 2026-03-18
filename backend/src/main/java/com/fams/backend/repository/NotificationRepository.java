package com.fams.backend.repository;

import com.fams.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification> {
    List<Notification> findTop5ByOrderByCreatedAtDesc();

    List<Notification> findByStatusOrderByCreatedAtDesc(Notification.NotificationStatus status);

    List<Notification> findByTypeOrderByCreatedAtDesc(Notification.NotificationType type);

    List<Notification> findByTargetTypeInAndStatusOrderBySentAtDesc(
            List<Notification.TargetType> targetTypes,
            Notification.NotificationStatus status
    );

    @Query("SELECT n FROM Notification n WHERE n.status = :status " +
            "AND n.targetType = 'USER' AND n.id IN :notificationIds ORDER BY n.sentAt DESC")
    List<Notification> findUserTargetedNotifications(
            @Param("notificationIds") List<Long> notificationIds,
            @Param("status") Notification.NotificationStatus status
    );

    // Tìm các thông báo đã lên lịch và đã đến thời gian gửi (scheduledAt <= now)
    List<Notification> findByStatusAndScheduledAtLessThanEqual(
            Notification.NotificationStatus status, 
            LocalDateTime scheduledAt
    );
}
