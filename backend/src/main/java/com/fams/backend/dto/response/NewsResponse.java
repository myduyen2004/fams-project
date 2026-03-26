package com.fams.backend.dto.response;

import com.fams.backend.entity.News;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsResponse {
    private Long id;
    private String title;
    private String content;
    private News.TargetType targetType;
    private News.NewsType type;
    private String senderName;
    private String senderAvatar;
    private News.NewsStatus status;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime scheduledAt;
    private String thumbnailImage;
    private List<String> attachmentUrls;
}
