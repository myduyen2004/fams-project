package com.fams.backend.scheduler;

import com.fams.backend.entity.Assignment;
import com.fams.backend.repository.AssignmentRepository;
import com.fams.backend.service.AssignmentSubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler gửi thông báo nhắc nhở sinh viên trước hạn nộp bài 1 ngày.
 * Chạy mỗi đầu giờ, tìm bài tập có dueDate trong [NOW+23h, NOW+25h].
 * Strict: bài đã qua cửa sổ hoặc đã gửi (reminderSent=true) sẽ không gửi lại.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AssignmentReminderScheduler {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionService assignmentService;

    @Scheduled(cron = "0 0 * * * *") // Mỗi đầu giờ
    @Transactional
    public void sendDueDateReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.plusHours(23);
        LocalDateTime to = now.plusHours(25);

        List<Assignment> due = assignmentRepository.findDueForReminder(from, to);
        log.info("[ReminderScheduler] Found {} assignment(s) due in 23-25h window", due.size());

        for (Assignment a : due) {
            assignmentService.sendDueDateReminderNotifications(a);
            a.setReminderSent(true);
            assignmentRepository.save(a);
            log.info("[ReminderScheduler] Marked reminderSent=true for assignment id={}", a.getId());
        }
    }
}
