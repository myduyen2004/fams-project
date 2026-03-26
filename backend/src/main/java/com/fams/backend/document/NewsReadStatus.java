package com.fams.backend.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "news_read_status")
@CompoundIndex(name = "user_news_idx", def = "{'userId': 1, 'newsId': 1}", unique = true)
public class NewsReadStatus {
    @Id
    private String id;
    private Long userId;
    private Long newsId;
    private LocalDateTime readAt;
}
