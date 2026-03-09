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
        try {
            // Get current user to determine role
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new NotFoundException("Người dùng không tìm thấy"));

            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

            log.info("getNotifications - User: {}, Role: {}, Search: {}, Type: {}, Target: {}, Status: {}",
                    username, currentUser.getRole(), search, type, targetType, status);

            Specification<Notification> spec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();

                // Filter by Sender Role (Role-based Isolation)
                if (currentUser.getRole() == User.UserRole.ADMIN) {
                    // Admin only sees notifications from Admins
                    predicates.add(cb.equal(root.get("sender").get("role"), User.UserRole.ADMIN));
                } else if (currentUser.getRole() == User.UserRole.ACADEMIC_STAFF) {
                    // Staff only sees notifications from Staff
                    predicates.add(cb.equal(root.get("sender").get("role"), User.UserRole.ACADEMIC_STAFF));
                    // Exclude individual (USER) notifications from management page
                    predicates.add(cb.notEqual(root.get("targetType"), Notification.TargetType.USER));
                }
                // Note: Other roles invoking this service directly might see everything if not
                // handled,
                // but Controller protects this with @PreAuthorize for ADMIN/STAFF only.

                // Tìm kiếm theo tiêu đề hoặc nội dung
                if (search != null && !search.trim().isEmpty()) {
                    String searchPattern = "%" + search.toLowerCase() + "%";
                    Predicate titleMatch = cb.like(cb.lower(root.get("title")), searchPattern);
                    Predicate contentMatch = cb.like(cb.lower(root.get("content")), searchPattern);
                    predicates.add(cb.or(titleMatch, contentMatch));
                }

                // Lọc theo loại thông báo
                if (type != null && !type.trim().isEmpty() && !"ALL".equalsIgnoreCase(type)) {
                    try {
                        Notification.NotificationType notifType = Notification.NotificationType
                                .valueOf(type.toUpperCase());
                        predicates.add(cb.equal(root.get("type"), notifType));
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid notification type: {}", type);
                    }
                }

                // Lọc theo đối tượng nhận
                if (targetType != null && !targetType.trim().isEmpty() && !"ALL".equalsIgnoreCase(targetType)) {
                    try {
                        Notification.TargetType target = Notification.TargetType.valueOf(targetType.toUpperCase());
                        predicates.add(cb.equal(root.get("targetType"), target));
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid target type: {}", targetType);
                    }
                }

                // Lọc theo trạng thái
                if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                    try {
                        Notification.NotificationStatus notifStatus = Notification.NotificationStatus
                                .valueOf(status.toUpperCase());
                        predicates.add(cb.equal(root.get("status"), notifStatus));
                    } catch (IllegalArgumentException e) {
                        log.warn("Invalid notification status: {}", status);
                    }
                }

                return cb.and(predicates.toArray(new Predicate[0]));
            };

            Page<Notification> notifications = notificationRepository.findAll(spec, pageable);
            log.info("Found {} notifications. IDs: {}", notifications.getTotalElements(),
                    notifications.getContent().stream().map(Notification::getId).toList());

            return notifications.map(n -> {
                try {
                    return mapToResponse(n);
                } catch (Exception e) {
                    log.error("Error mapping notification ID: {}", n.getId(), e);
                    throw e;
                }
            });
        } catch (Exception e) {
            log.error("Critical error in getNotifications: ", e);
            throw e;
        }
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

        // Kiểm tra quyền: ADMIN chỉ xem của ADMIN, STAFF chỉ xem của STAFF
        checkRoleAccess(currentUser, notification);

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

        log.info("Creating notification with {} attachments: {}",
                request.getAttachmentUrls() != null ? request.getAttachmentUrls().size() : 0,
                request.getAttachmentUrls());

        Notification notification = Notification.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : Notification.NotificationType.SYSTEM)
                .priority(request.getPriority() != null ? request.getPriority()
                        : Notification.NotificationPriority.MEDIUM)
                .targetType(request.getTargetType() != null ? request.getTargetType() : Notification.TargetType.ALL)
                .status(request.getStatus() != null ? request.getStatus() : Notification.NotificationStatus.DRAFT)
                .scheduledAt(request.getScheduledAt())
                .sender(sender)
                .attachmentUrls(
                        request.getAttachmentUrls() != null ? new java.util.ArrayList<>(request.getAttachmentUrls())
                                : new java.util.ArrayList<>())
                .build();

        // Set sentAt if status is SENT
        if (notification.getStatus() == NotificationStatus.SENT) {
            notification.setSentAt(LocalDateTime.now());
        }

        Notification saved = notificationRepository.save(notification);
        log.info("Created notification: {} by {}, status: {}", saved.getId(), username, saved.getStatus());

        // Tạo NotificationRecipient nếu status là SENT
        if (saved.getStatus() == NotificationStatus.SENT) {
            if (request.getRecipientId() != null) {
                // Targeted notification to a specific user
                User recipient = userRepository.findById(request.getRecipientId())
                        .orElseThrow(() -> new NotFoundException(
                                "Không tìm thấy người nhận với ID: " + request.getRecipientId()));
                createSingleRecipient(saved, recipient);
            } else {
                // Broadcast notification based on targetType
                createNotificationRecipients(saved);
            }
        }

        return mapToResponse(saved);
    }

    /**
     * Helper to create a single recipient record
     */
    private void createSingleRecipient(Notification notification, User recipient) {
        NotificationRecipient recipientRecord = NotificationRecipient.builder()
                .notification(notification)
                .recipient(recipient)
                .isRead(false)
                .build();
        notificationRecipientRepository.save(recipientRecord);
        log.info("Created recipient record for user: {} on notification: {}", recipient.getId(), notification.getId());
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

        // Kiểm tra quyền
        checkRoleAccess(currentUser, notification);

        // Không cho phép sửa thông báo đã gửi
        if (notification.getStatus() == NotificationStatus.SENT) {
            throw new IllegalStateException("Không thể chỉnh sửa thông báo đã gửi");
        }

        // Set sentAt if status changed to SENT
        boolean shouldSend = request.getStatus() == NotificationStatus.SENT
                && notification.getStatus() != NotificationStatus.SENT;

        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setType(request.getType());
        notification.setPriority(request.getPriority());
        notification.setTargetType(request.getTargetType());
        notification.setStatus(request.getStatus());
        notification.setScheduledAt(request.getScheduledAt());

        if (request.getAttachmentUrls() != null) {
            notification.setAttachmentUrls(request.getAttachmentUrls());
        }

        if (shouldSend) {
            notification.setSentAt(LocalDateTime.now());
        }

        Notification saved = notificationRepository.save(notification);

        if (shouldSend) {
            createNotificationRecipients(saved);
        }

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
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông báo with ID: " + id));

        // Kiểm tra quyền
        checkRoleAccess(currentUser, notification);

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

        // Kiểm tra quyền
        for (Notification notification : notifications) {
            checkRoleAccess(currentUser, notification);
        }

        // Kiểm tra xem có thông báo nào đã gửi không
        boolean hasSent = notifications.stream()
                .anyMatch(n -> n.getStatus() == NotificationStatus.SENT);

        if (hasSent) {
            throw new IllegalStateException(
                    "Không thể xóa thông báo đã gửi. Vui lòng chỉ chọn thông báo nháp hoặc đã lên lịch.");
        }

        notificationRepository.deleteAllById(ids);
        log.info("Bulk deleted notifications: {}", ids);
    }

    // Helper method to check role access
    private void checkRoleAccess(User currentUser, Notification notification) {
        if (currentUser.getRole() == User.UserRole.ADMIN) {
            if (notification.getSender().getRole() != User.UserRole.ADMIN) {
                throw new NotFoundException(
                        "Bạn không có quyền truy cập thông báo này (Chỉ Admin mới có thể truy cập thông báo của Admin)");
            }
        } else if (currentUser.getRole() == User.UserRole.ACADEMIC_STAFF) {
            if (notification.getSender().getRole() != User.UserRole.ACADEMIC_STAFF) {
                throw new NotFoundException(
                        "Bạn không có quyền truy cập thông báo này (Chỉ Academic Staff mới có thể truy cập thông báo của Academic Staff)");
            }
        } else {
            // Fallback for other roles, strict ownership
            if (!notification.getSender().equals(currentUser)) {
                throw new NotFoundException("Bạn không có quyền truy cập thông báo này");
            }
        }
    }

    /**
     * Publish (gửi) nhiều thông báo
     */
    @Transactional
    public void publishNotifications(List<Long> ids) {
        List<Notification> notifications = notificationRepository.findAllById(ids);
        LocalDateTime now = LocalDateTime.now();

        notifications.forEach(n -> {
            if (n.getStatus() != NotificationStatus.SENT) {
                n.setStatus(NotificationStatus.SENT);
                n.setSentAt(now);
                createNotificationRecipients(n);
            }
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
                .type(notification.getType() != null ? notification.getType().name() : null)
                .priority(notification.getPriority() != null ? notification.getPriority().name() : null)
                .targetType(notification.getTargetType() != null ? notification.getTargetType().name() : null)
                .status(notification.getStatus() != null ? notification.getStatus().name() : null)
                .scheduledAt(notification.getScheduledAt())
                .sentAt(notification.getSentAt())
                .createdAt(notification.getCreatedAt())
                .updatedAt(notification.getUpdatedAt())
                .attachmentUrls(notification.getAttachmentUrls() != null
                        ? new java.util.ArrayList<>(notification.getAttachmentUrls())
                        : new java.util.ArrayList<>())
                .sender(notification.getSender() != null ? NotificationResponse.UserBasic.builder()
                        .id(notification.getSender().getId())
                        .username(notification.getSender().getUsername())
                        .fullName(notification.getSender().getFullName())
                        .role(notification.getSender().getRole() != null ? notification.getSender().getRole().name()
                                : null)
                        .build() : null)
                .build();
    }

    /**
     * Tạo NotificationRecipient records dựa trên targetType
     */
    public void createNotificationRecipients(Notification notification) {
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
                        .filter(u -> !u.equals(notification.getSender()))
                        .collect(java.util.stream.Collectors.toList());
                break;
            case LECTURER:
                recipients = userRepository.findByRole(User.UserRole.LECTURER)
                        .orElse(new ArrayList<>()).stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                        .filter(u -> !u.equals(notification.getSender()))
                        .collect(java.util.stream.Collectors.toList());
                break;
            case USER:
                // USER case is handled via recipientId in createNotification method
                // No recipients are created here
                break;
        }

        if (!recipients.isEmpty()) {
            log.info("Found {} recipients for target type {}", recipients.size(), notification.getTargetType());
            try {
                List<NotificationRecipient> notificationRecipients = recipients.stream()
                        .map(recipient -> NotificationRecipient.builder()
                                .notification(notification)
                                .recipient(recipient)
                                .isRead(false)
                                .build())
                        .collect(java.util.stream.Collectors.toList());

                log.info("Saving {} notification recipients...", notificationRecipients.size());
                notificationRecipientRepository.saveAll(notificationRecipients);
                log.info("Successfully created {} notification recipients for notification {}",
                        notificationRecipients.size(),
                        notification.getId());
            } catch (Exception e) {
                log.error("Error saving notification recipients: ", e);
                throw e; // Re-throw to ensure transaction rollback if needed
            }
        } else {
            log.warn("No recipients found for target type {}", notification.getTargetType());
        }
    }

    /**
     * Notify academic staff about a new academic request from student
     */
    @Transactional
    public void notifyAcademicStaffNewRequest(com.fams.backend.entity.AcademicRequest academicRequest) {
        String title = "Yêu cầu học thuật mới: " + academicRequest.getRequestTitle();
        String content = String.format(
                "Sinh viên %s (%s) đã gửi yêu cầu: %s. Vui lòng xem xét và xử lý.",
                academicRequest.getStudent().getFullName(),
                academicRequest.getStudent().getCode(),
                academicRequest.getRequestTitle());

        // Create notification for academic staff
        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(Notification.NotificationType.ACADEMIC)
                .targetType(Notification.TargetType.USER)
                .sender(academicRequest.getStudent())
                .priority(Notification.NotificationPriority.MEDIUM)
                .status(Notification.NotificationStatus.SENT)
                .build();

        notification = notificationRepository.save(notification);

        // Send to all academic staff
        List<User> academicStaff = userRepository.findByRole(User.UserRole.ACADEMIC_STAFF)
                .orElse(new ArrayList<>());

        for (User staff : academicStaff) {
            if (staff.getStatus() == User.UserStatus.ACTIVE) {
                NotificationRecipient recipient = NotificationRecipient.builder()
                        .notification(notification)
                        .recipient(staff)
                        .isRead(false)
                        .build();
                notificationRecipientRepository.save(recipient);
            }
        }

        log.info("Sent notification to {} academic staff for new academic request {}",
                academicStaff.size(), academicRequest.getId());
    }

    /**
     * Notify student about academic request status change
     */
    @Transactional
    public void notifyStudentRequestStatusChange(com.fams.backend.entity.AcademicRequest academicRequest) {
        String statusText = switch (academicRequest.getStatus()) {
            case APPROVED -> "đã được duyệt";
            case REJECTED -> "đã bị từ chối";
            case CANCELLED -> "đã được hủy";
            default -> "đã được cập nhật";
        };

        String title = "Yêu cầu học thuật " + statusText;
        String content = String.format(
                "Yêu cầu \"%s\" của bạn %s.%s",
                academicRequest.getRequestTitle(),
                statusText,
                academicRequest.getApproverNote() != null ? " Ghi chú: " + academicRequest.getApproverNote() : "");

        // Create notification
        User sender = academicRequest.getApprover() != null ? academicRequest.getApprover()
                : academicRequest.getStudent();

        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(Notification.NotificationType.ACADEMIC)
                .targetType(Notification.TargetType.USER)
                .sender(sender)
                .priority(Notification.NotificationPriority.HIGH)
                .status(Notification.NotificationStatus.SENT)
                .build();

        notification = notificationRepository.save(notification);

        // Send to student
        NotificationRecipient recipient = NotificationRecipient.builder()
                .notification(notification)
                .recipient(academicRequest.getStudent())
                .isRead(false)
                .build();
        notificationRecipientRepository.save(recipient);

        log.info("Sent notification to student {} for academic request {} status change to {}",
                academicRequest.getStudent().getId(), academicRequest.getId(), academicRequest.getStatus());
    }
}