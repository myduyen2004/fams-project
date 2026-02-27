package com.fams.backend.scheduler;

import com.fams.backend.entity.AttendanceSession;
import com.fams.backend.entity.TimetableSlot;
import com.fams.backend.repository.AttendanceSessionRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AttendanceSessionScheduler {

    private final TimetableSlotRepository timetableSlotRepository;
    private final AttendanceSessionRepository sessionRepository;

    /**
     * Automatically create attendance sessions for slots that have started.
     * Runs every minute.
     */
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void autoCreateSessions() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        log.debug("Running autoCreateSessions for date: {}, time: {}", today, now);

        List<TimetableSlot> slots = timetableSlotRepository.findSlotsNeedingSession(today, now);

        if (slots.isEmpty()) {
            return;
        }

        log.info("Found {} slots needing automatic attendance session creation", slots.size());

        for (TimetableSlot slot : slots) {
            try {
                AttendanceSession session = AttendanceSession.builder()
                        .timetableSlot(slot)
                        .lecturer(slot.getClassSection().getLecturer())
                        .openedAt(LocalDateTime.now())
                        .status(AttendanceSession.SessionStatus.OPEN)
                        .build();

                sessionRepository.save(session);
                log.info("Automatically created attendance session for slot ID: {} (Class: {}, Room: {})",
                        slot.getId(), slot.getClassSection().getClassName(), slot.getRoom().getCode());
            } catch (Exception e) {
                log.error("Failed to automatically create attendance session for slot ID: {}", slot.getId(), e);
            }
        }
    }
}
