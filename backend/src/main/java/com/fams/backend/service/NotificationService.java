package com.fams.backend.service;

import com.fams.backend.dto.request.NotificationRequest;
import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.Notification.NotificationStatus;
import com.fams.backend.entity.NotificationRecipient;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.NotificationRecipientRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository notificationRecipientRepository;
    private final UserRepository userRepository;

    /**
     * Lấy danh sách thông báo có phân trang
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(
            String search,
            String type,
            String targetType,
            String status,
            int page,
            int size) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));
        
        Specification<Notification> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Chỉ lấy thông báo của người dùng hiện tại (do họ tạo)
            predicates.add(cb.equal(root.get("sender"), currentUser));
            
            // Tìm kiếm theo tiêu đề hoặc nội dung
            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), searchPattern);
                Predicate contentMatch = cb.like(cb.lower(root.get("content")), searchPattern);
                predicates.add(cb.or(titleMatch, contentMatch));
            }
            
            // Lọc theo loại thông báo
            if (type != null && !type.trim().isEmpty()) {
                try {
                    Notification.NotificationType notifType = Notification.NotificationType.valueOf(type);
                    predicates.add(cb.equal(root.get("type"), notifType));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid notification type: {}", type);
                }
            }
            
            // Lọc theo đối tượng nhận
            if (targetType != null && !targetType.trim().isEmpty()) {
                try {
                    Notification.TargetType target = Notification.TargetType.valueOf(targetType);
                    predicates.add(cb.equal(root.get("targetType"), target));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid target type: {}", targetType);
                }
            }
            
            // Lọc theo trạng thái
            if (status != null && !status.trim().isEmpty()) {
                try {
                    Notification.NotificationStatus notifStatus = Notification.NotificationStatus.valueOf(status);
                    predicates.add(cb.equal(root.get("status"), notifStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid notification status: {}", status);
                }
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        Page<Notification> notifications = notificationRepository.findAll(spec, pageable);
        
        return notifications.map(this::mapToResponse);
    }

    /**
     * Lấy thông báo theo ID
     */
    @Transactional(readOnly = true)
    public NotificationResponse getNotificationById(Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));
        
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo với ID: " + id));
        
        // Kiểm tra xem người dùng hiện tại có phải là người tạo thông báo này không
        if (!notification.getSender().equals(currentUser)) {
            throw new NotFoundException("Bạn không có quyền xem thông báo này");
        }
        
        return mapToResponse(notification);
    }

    /**
     * Tạo thông báo mới
     */
    @Transactional
    public NotificationResponse createNotification(NotificationRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));

        Notification notification = Notification.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : Notification.NotificationType.SYSTEM)
                .priority(request.getPriority() != null ? request.getPriority() : Notification.NotificationPriority.MEDIUM)
                .targetType(request.getTargetType() != null ? request.getTargetType() : Notification.TargetType.ALL)
                .status(request.getStatus() != null ? request.getStatus() : Notification.NotificationStatus.DRAFT)
                .scheduledAt(request.getScheduledAt())
                .sender(sender)
                .build();

        // Set sentAt if status is SENT
        if (notification.getStatus() == NotificationStatus.SENT) {
            notification.setSentAt(LocalDateTime.now());
        }

        Notification saved = notificationRepository.save(notification);
        log.info("Created notification: {} by {}", saved.getId(), username);
        
        // Tạo NotificationRecipient nếu status là SENT
        if (saved.getStatus() == NotificationStatus.SENT) {
            createNotificationRecipients(saved);
        }
        
        return mapToResponse(saved);
    }

    /**
     * Cập nhật thông báo
     */
    @Transactional
    public NotificationResponse updateNotification(Long id, NotificationRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));
        
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo với ID: " + id));

        // Kiểm tra xem người dùng hiện tại có phải là người tạo thông báo này không
        if (!notification.getSender().equals(currentUser)) {
            throw new NotFoundException("Bạn không có quyền chỉnh sửa thông báo này");
        }

        // Không cho phép sửa thông báo đã gửi
        if (notification.getStatus() == NotificationStatus.SENT) {
            throw new IllegalStateException("Không thể chỉnh sửa thông báo đã gửi");
        }

        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setType(request.getType());
        notification.setPriority(request.getPriority());
        notification.setTargetType(request.getTargetType());
        notification.setStatus(request.getStatus());
        notification.setScheduledAt(request.getScheduledAt());

        // Set sentAt if status changed to SENT
        if (request.getStatus() == NotificationStatus.SENT && notification.getSentAt() == null) {
            notification.setSentAt(LocalDateTime.now());
        }

        Notification saved = notificationRepository.save(notification);
        log.info("Updated notification: {}", saved.getId());
        
        return mapToResponse(saved);
    }

    /**
     * Xóa thông báo
     */
    @Transactional
    public void deleteNotification(Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));
        
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo với ID: " + id));
        
        // Kiểm tra xem người dùng hiện tại có phải là người tạo thông báo này không
        if (!notification.getSender().equals(currentUser)) {
            throw new NotFoundException("Bạn không có quyền xóa thông báo này");
        }
        
        // Không cho phép xóa thông báo đã gửi
        if (notification.getStatus() == NotificationStatus.SENT) {
            throw new IllegalStateException("Không thể xóa thông báo đã gửi");
        }
        
        notificationRepository.deleteById(id);
        log.info("Deleted notification: {}", id);
    }

    /**
     * Xóa nhiều thông báo
     */
    @Transactional
    public void bulkDeleteNotifications(List<Long> ids) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));
        
        List<Notification> notifications = notificationRepository.findAllById(ids);
        
        // Kiểm tra xem người dùng có quyền xóa tất cả thông báo không
        boolean hasUnauthorized = notifications.stream()
                .anyMatch(n -> !n.getSender().equals(currentUser));
        
        if (hasUnauthorized) {
            throw new NotFoundException("Bạn không có quyền xóa một số thông báo này");
        }
        
        // Kiểm tra xem có thông báo nào đã gửi không
        boolean hasSent = notifications.stream()
                .anyMatch(n -> n.getStatus() == NotificationStatus.SENT);
        
        if (hasSent) {
            throw new IllegalStateException("Không thể xóa thông báo đã gửi. Vui lòng chỉ chọn thông báo nháp hoặc đã lên lịch.");
        }
        
        notificationRepository.deleteAllById(ids);
        log.info("Bulk deleted notifications: {}", ids);
    }

    /**
     * Publish (gửi) nhiều thông báo
     */
    @Transactional
    public void publishNotifications(List<Long> ids) {
        List<Notification> notifications = notificationRepository.findAllById(ids);
        LocalDateTime now = LocalDateTime.now();
        
        notifications.forEach(n -> {
            n.setStatus(NotificationStatus.SENT);
            n.setSentAt(now);
        });
        
        notificationRepository.saveAll(notifications);
        log.info("Published notifications: {}", ids);
    }

    /**
     * Ẩn nhiều thông báo (chuyển về DRAFT)
     */
    @Transactional
    public void hideNotifications(List<Long> ids) {
        List<Notification> notifications = notificationRepository.findAllById(ids);
        
        notifications.forEach(n -> {
            n.setStatus(NotificationStatus.DRAFT);
        });
        
        notificationRepository.saveAll(notifications);
        log.info("Hidden notifications: {}", ids);
    }

    /**
     * Map entity to response DTO
     */
    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .content(notification.getContent())
                .type(notification.getType().name())
                .priority(notification.getPriority().name())
                .targetType(notification.getTargetType().name())
                .status(notification.getStatus().name())
                .scheduledAt(notification.getScheduledAt())
                .sentAt(notification.getSentAt())
                .createdAt(notification.getCreatedAt())
                .updatedAt(notification.getUpdatedAt())
                .sender(notification.getSender() != null ? NotificationResponse.UserBasic.builder()
                        .id(notification.getSender().getId())
                        .username(notification.getSender().getUsername())
                        .fullName(notification.getSender().getFullName())
                        .build() : null)
                .build();
    }

    /**
     * Tạo NotificationRecipient records dựa trên targetType
     */
    private void createNotificationRecipients(Notification notification) {
        List<User> recipients = new ArrayList<>();
        
        switch (notification.getTargetType()) {
            case ALL:
                // Gửi cho tất cả users active (trừ sender)
                recipients = userRepository.findAll().stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                        .filter(u -> !u.equals(notification.getSender()))
                        .collect(java.util.stream.Collectors.toList());
                break;
            case STUDENT:
                recipients = userRepository.findByRole(User.UserRole.STUDENT)
                        .orElse(new ArrayList<>()).stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                        .collect(java.util.stream.Collectors.toList());
                break;
            case LECTURER:
                recipients = userRepository.findByRole(User.UserRole.LECTURER)
                        .orElse(new ArrayList<>()).stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                        .collect(java.util.stream.Collectors.toList());
                break;
            case CLASS:
            case COURSE:
            case USER:
                // TODO: Implement logic cho CLASS, COURSE, USER
                log.warn("TargetType {} chưa được implement", notification.getTargetType());
                break;
        }
        
        if (!recipients.isEmpty()) {
            List<NotificationRecipient> notificationRecipients = recipients.stream()
                    .map(recipient -> NotificationRecipient.builder()
                            .notification(notification)
                            .recipient(recipient)
                            .isRead(false)
                            .build())
                    .collect(java.util.stream.Collectors.toList());
            
            notificationRecipientRepository.saveAll(notificationRecipients);
            log.info("Created {} notification recipients for notification {}", notificationRecipients.size(), notification.getId());
        }
    }}