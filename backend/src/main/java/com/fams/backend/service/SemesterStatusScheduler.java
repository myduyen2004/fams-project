package com.fams.backend.service;

import com.fams.backend.entity.Semester;
import com.fams.backend.entity.Semester.SemesterStatus;
import com.fams.backend.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * SemesterStatusScheduler - Tự động cập nhật trạng thái học kỳ
 * 
 * - UPCOMING -> ONGOING: 00:05 khi today == startDate
 * - ONGOING -> COMPLETED: 23:55 khi today == endDate
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SemesterStatusScheduler {

    private final SemesterRepository semesterRepository;

    /**
     * Job 1: Chạy lúc 00:05 hàng ngày
     * Cập nhật UPCOMING -> ONGOING khi today == startDate
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void updateToOngoing() {
        log.info("[SemesterStatusScheduler] Running UPCOMING -> ONGOING check...");
        LocalDate today = LocalDate.now();
        int updated = 0;

        var upcomingSemesters = semesterRepository.findUpcomingSemesters();
        for (Semester semester : upcomingSemesters) {
            if (today.equals(semester.getStartDate()) || today.isAfter(semester.getStartDate())) {
                semester.setStatus(SemesterStatus.ONGOING);
                semesterRepository.save(semester);
                log.info("Semester {} updated: UPCOMING -> ONGOING", semester.getCode());
                updated++;
            }
        }

        log.info("[SemesterStatusScheduler] UPCOMING -> ONGOING completed. Updated: {}", updated);
    }

    /**
     * Job 2: Chạy lúc 23:55 hàng ngày
     * Cập nhật ONGOING -> COMPLETED khi today == endDate
     */
    @Scheduled(cron = "0 55 23 * * *")
    @Transactional
    public void updateToCompleted() {
        log.info("[SemesterStatusScheduler] Running ONGOING -> COMPLETED check...");
        LocalDate today = LocalDate.now();
        int updated = 0;

        var ongoingSemesters = semesterRepository.findActiveSemesters();
        for (Semester semester : ongoingSemesters) {
            if (today.equals(semester.getEndDate()) || today.isAfter(semester.getEndDate())) {
                semester.setStatus(SemesterStatus.COMPLETED);
                semesterRepository.save(semester);
                log.info("Semester {} updated: ONGOING -> COMPLETED", semester.getCode());
                updated++;
            }
        }

        log.info("[SemesterStatusScheduler] ONGOING -> COMPLETED completed. Updated: {}", updated);
    }

    /**
     * Trigger thủ công (cho mục đích test)
     */
    public void triggerManually() {
        updateToOngoing();
        updateToCompleted();
    }
}
