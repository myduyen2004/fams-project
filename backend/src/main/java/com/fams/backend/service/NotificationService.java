package com.fams.backend.service;

import com.fams.backend.document.NotificationReadStatus;
import com.fams.backend.entity.News;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.User;
import com.fams.backend.repository.NotificationReadStatusRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationReadStatusRepository notificationReadStatusRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    @Transactional
    public void createNotification(User recipient, String title, String content, Notification.NotificationType type,
            String targetUrl, User sender) {
        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(type != null ? type : Notification.NotificationType.SYSTEM)
                .targetType(Notification.TargetType.USER)
                .targetUrl(targetUrl)
                .sentAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        createSingleRecipient(saved, recipient);
    }

    /**
     * Helper to create a single recipient record
     */
    private void createSingleRecipient(Notification notification, User recipient) {
        NotificationReadStatus readStatus = NotificationReadStatus.builder()
                .notificationId(notification.getId())
                .targetType(Notification.TargetType.USER.name())
                .recipientId(recipient.getId())
                .createdAt(LocalDateTime.now())
                .build();
        notificationReadStatusRepository.save(readStatus);
        log.info("Created MongoDB read-status for user: {} on notification: {}", recipient.getId(),
                notification.getId());

        // Send FCM push notification
        fcmService.sendPushNotification(
                recipient.getId(),
                notification.getTitle(),
                notification.getContent(),
                java.util.Map.of(
                        "notificationId", String.valueOf(notification.getId()),
                        "type", notification.getType() != null ? notification.getType().name() : "SYSTEM"));
    }

    /**
     * Tạo read-status document dựa trên targetType.
     */
    public void createNotificationRecipients(Notification notification) {
        createNotificationRecipients(notification, Map.of());
    }

    public void createNotificationRecipients(Notification notification, Map<String, String> extraData) {
        List<User> recipients = new ArrayList<>();

        log.info("Resolving recipients for notificationId={}, type={}, targetType={}",
                notification.getId(), notification.getType(), notification.getTargetType());

        switch (notification.getTargetType()) {
            case ALL:
                recipients = userRepository.findAll().stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
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
            case ACADEMIC_STAFF:
                recipients = userRepository.findByRole(User.UserRole.ACADEMIC_STAFF)
                        .orElse(new ArrayList<>()).stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                        .collect(java.util.stream.Collectors.toList());
                break;
            case ADMIN:
                recipients = userRepository.findByRole(User.UserRole.ADMIN)
                        .orElse(new ArrayList<>()).stream()
                        .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                        .collect(java.util.stream.Collectors.toList());
                break;
            case USER:
                break;
            case CLASS:
                break;
        }

        if (!recipients.isEmpty()) {
            log.info("Found {} recipients for target type {}", recipients.size(), notification.getTargetType());
            try {
                NotificationReadStatus readStatus = NotificationReadStatus.builder()
                        .notificationId(notification.getId())
                        .targetType(notification.getTargetType().name())
                        .createdAt(LocalDateTime.now())
                        .build();

                notificationReadStatusRepository.save(readStatus);
                log.info("Successfully created MongoDB read-status for notification {}", notification.getId());

                // Use batch FCM push notification
                Map<String, String> fcmData = new HashMap<>();
                fcmData.put("notificationId", String.valueOf(notification.getId()));
                fcmData.put("type", notification.getType() != null ? notification.getType().name() : "SYSTEM");
                if (extraData != null && !extraData.isEmpty()) {
                    fcmData.putAll(extraData);
                }
                List<Long> recipientIds = recipients.stream().map(User::getId)
                        .collect(java.util.stream.Collectors.toList());
                log.info("Dispatching FCM for notificationId={} to {} user(s)", notification.getId(),
                        recipientIds.size());
                fcmService.sendPushNotificationsForUsers(
                        recipientIds,
                        notification.getTitle(),
                        notification.getContent(),
                        fcmData);
            } catch (Exception e) {
                log.error("Error saving notification recipients: ", e);
                throw e;
            }
        } else {
            log.warn("No recipients found for target type {}", notification.getTargetType());
        }
    }

    /**
     * Notify academic staff when grades are submitted for a class
     */
    @Transactional
    public void notifyAcademicStaffGradesSubmitted(String className, User lecturer, com.fams.backend.entity.Course course) {
        String title = "Điểm lớp " + className + " đã được nộp";
        String content = String.format(
                "Giảng viên %s đã nộp điểm cho môn %s (%s) lớp %s. Vui lòng xem xét và phê duyệt.",
                lecturer.getFullName(),
                course.getName(),
                course.getCode(),
                className);

        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(Notification.NotificationType.GRADE_PUBLISHED)
                .targetType(Notification.TargetType.ACADEMIC_STAFF)
                .targetUrl("/academic-staff/grades?class=" + className)
                .sentAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);
        
        // Resolve and create read status for all ACADEMIC_STAFF
        createNotificationRecipients(notification);
        
        log.info("Sent notification to all Academic Staff for grade submission of class {}", className);
    }

    @Transactional
    public void notifyNewsPublished(News news) {
        Notification.TargetType mappedTargetType = Notification.TargetType.valueOf(news.getTargetType().name());
        String body = fcmService.formatPushBody(news.getContent(), 200);

        log.info("notifyNewsPublished called for newsId={}, targetType={}, mappedTargetType={}",
                news.getId(), news.getTargetType(), mappedTargetType);

        Notification notification = Notification.builder()
                .title(news.getTitle())
                .content(body)
                .type(Notification.NotificationType.NEWS)
                .targetType(mappedTargetType)
                .targetUrl("/news/" + news.getId())
                .sentAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);

        log.info("Created NEWS notificationId={} for newsId={}", notification.getId(), news.getId());

        Map<String, String> extraData = new HashMap<>();
        extraData.put("newsId", String.valueOf(news.getId()));
        createNotificationRecipients(notification, extraData);
    }

    private void createUserTargetReadStatus(Notification notification, Set<Long> recipientIds) {
        NotificationReadStatus readStatus = NotificationReadStatus.builder()
                .notificationId(notification.getId())
                .targetType(Notification.TargetType.USER.name())
                .recipientIds(recipientIds)
                .createdAt(LocalDateTime.now())
                .build();
        notificationReadStatusRepository.save(readStatus);
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
                .sentAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);

        // Send to all academic staff
        List<User> academicStaff = userRepository.findByRole(User.UserRole.ACADEMIC_STAFF)
                .orElse(new ArrayList<>());

        List<Long> staffIds = academicStaff.stream()
                .filter(s -> s.getStatus() == User.UserStatus.ACTIVE)
                .map(User::getId)
                .collect(java.util.stream.Collectors.toList());

        if (!staffIds.isEmpty()) {
            createUserTargetReadStatus(notification, new HashSet<>(staffIds));
            fcmService.sendPushNotificationsForUsers(
                    staffIds,
                    notification.getTitle(),
                    notification.getContent(),
                    java.util.Map.of(
                            "notificationId", String.valueOf(notification.getId()),
                            "type", "ACADEMIC"));
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
                .sentAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);

        // Save single-recipient read status in MongoDB
        createSingleRecipient(notification, academicRequest.getStudent());

        // Send FCM push notification to student
        fcmService.sendPushNotification(
                academicRequest.getStudent().getId(),
                notification.getTitle(),
                notification.getContent(),
                java.util.Map.of(
                        "notificationId", String.valueOf(notification.getId()),
                        "type", "ACADEMIC"));

        log.info("Sent notification to student {} for academic request {} status change to {}",
                academicRequest.getStudent().getId(), academicRequest.getId(), academicRequest.getStatus());
    }

    /**
     * Notify students when their grades are published (Component, FE, or Resit)
     */
    @Transactional
    public void notifyStudentsGradesPublished(List<User> students, com.fams.backend.entity.Course course, String type,
            User publisher) {
        if (students == null || students.isEmpty())
            return;

        String gradeTypeName;
        if ("RESIT".equalsIgnoreCase(type)) {
            gradeTypeName = "điểm thi lại";
        } else if ("FINAL_EXAM".equalsIgnoreCase(type)) {
            gradeTypeName = "điểm thi cuối kỳ";
        } else {
            gradeTypeName = "điểm thành phần";
        }

        String title = "Đã có " + gradeTypeName + " môn " + course.getCode();
        String content = String.format(
                "Đã có %s cho môn học %s - %s. Vui lòng truy cập hệ thống để xem chi tiết.",
                gradeTypeName, course.getCode(), course.getName());

        // Create generic notification first
        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(Notification.NotificationType.GRADE_PUBLISHED)
                .targetType(Notification.TargetType.USER)
                .sentAt(LocalDateTime.now())
                .build();

        notification = notificationRepository.save(notification);

        List<Long> activeStudentIds = students.stream()
                .filter(s -> s.getStatus() == User.UserStatus.ACTIVE)
                .map(User::getId)
                .collect(java.util.stream.Collectors.toList());

        if (!activeStudentIds.isEmpty()) {
            createUserTargetReadStatus(notification, new HashSet<>(activeStudentIds));
            log.info("Sent notifications to {} students for published {} of course {}",
                    activeStudentIds.size(), gradeTypeName, course.getCode());

            // Send FCM push notification to all active students
            java.util.Map<String, String> fcmData = java.util.Map.of(
                    "notificationId", String.valueOf(notification.getId()),
                    "type", Notification.NotificationType.GRADE_PUBLISHED.name());
            if (!activeStudentIds.isEmpty()) {
                fcmService.sendPushNotificationsForUsers(
                        activeStudentIds,
                        notification.getTitle(),
                        notification.getContent(),
                        fcmData);
            }
        }
    }
}