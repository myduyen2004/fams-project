package com.fams.backend.dto.request;

import com.fams.backend.entity.News;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề không được quá 200 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    private String content;

    @NotNull(message = "Đối tượng nhận không được để trống")
    @Builder.Default
    private News.TargetType targetType = News.TargetType.ALL;

    private News.NewsType type;

    private News.NewsStatus status;

    private java.time.LocalDateTime scheduledAt;

    private String thumbnailImage;

    @Builder.Default
    private List<String> attachmentUrls = java.util.Collections.emptyList();
}
