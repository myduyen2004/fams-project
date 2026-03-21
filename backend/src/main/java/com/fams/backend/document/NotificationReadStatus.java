package com.fams.backend.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notification_read_status")
public class NotificationReadStatus {

    @Id
    private String id;

    @Indexed(unique = true)
    private Long notificationId;

    private String targetType;

    @Builder.Default
    private Map<String, LocalDateTime> readBy = new HashMap<>();

    @Builder.Default
    private Set<String> deletedBy = new HashSet<>();

    // Used for single-user notification
    private Long recipientId;

    // Used for USER-target notification fanout to multiple users
    @Builder.Default
    private Set<Long> recipientIds = new HashSet<>();

    private LocalDateTime createdAt;
}
