package com.fams.backend.dto.request;

import com.fams.backend.entity.Notification.NotificationPriority;
import com.fams.backend.entity.Notification.NotificationStatus;
import com.fams.backend.entity.Notification.NotificationType;
import com.fams.backend.entity.Notification.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề không được quá 200 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    private String content;

    @Builder.Default
    private NotificationType type = NotificationType.SYSTEM;

    @Builder.Default
    private NotificationPriority priority = NotificationPriority.MEDIUM;

    @Builder.Default
    private TargetType targetType = TargetType.ALL;

    private String targetClassName;

    private Long targetCourseId;

    private LocalDateTime scheduledAt;

    @Builder.Default
    private NotificationStatus status = NotificationStatus.DRAFT;

    private java.util.List<String> attachmentUrls;
}
