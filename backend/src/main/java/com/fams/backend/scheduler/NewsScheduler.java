package com.fams.backend.scheduler;

import com.fams.backend.service.NewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NewsScheduler {

    private final NewsService newsService;

    // Chạy mỗi phút vào thời điểm giây số 0
    @Scheduled(cron = "0 * * * * *")
    public void autoPublishScheduledNews() {
        try {
            newsService.publishScheduledNews();
        } catch (Exception e) {
            log.error("Lỗi khi chạy cron job tự động xuất bản tin tức: ", e);
        }
    }
}
