package com.fams.backend.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "news", indexes = {
        @Index(name = "idx_news_sender", columnList = "sender_id"),
        @Index(name = "idx_news_type", columnList = "type"),
        @Index(name = "idx_news_status", columnList = "status"),
        @Index(name = "idx_news_sent_at", columnList = "sentAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class News {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NewsType type = NewsType.SYSTEM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NewsPriority priority = NewsPriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User sender;

    @Column(length = 255)
    private String targetUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TargetType targetType = TargetType.ALL;

    @Column(length = 100)
    private String targetClassName;

    private LocalDateTime scheduledAt;

    private LocalDateTime sentAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private NewsStatus status = NewsStatus.DRAFT;

    @Column(length = 500)
    private String thumbnailImage;

    @ElementCollection
    @CollectionTable(name = "news_attachments", joinColumns = @JoinColumn(name = "news_id"))
    @Column(name = "url", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> attachmentUrls = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum NewsType {
        SYSTEM,
        ACADEMIC,
        ATTENDANCE,
        GRADE,
        CHAT,
        SCHEDULE,
        EVENT,
        FEATURED,
        IMPORTANT,
        OTHER
    }

    public enum NewsPriority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }

    public enum TargetType {
        ALL,
        STUDENT,
        LECTURER,
        ACADEMIC_STAFF,
        ADMIN,
        USER
    }

    public enum NewsStatus {
        DRAFT,
        SCHEDULED,
        SENT
    }
}
