package com.fams.backend.service.impl;

import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.repository.SystemLogRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemLogPersistenceService {

    private final SystemLogRepository systemLogRepository;
    private final UserRepository userRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveLogEntry(String title, String description, SystemLog.LogType type, String source, String performerUsername, String ip, String ua, String oldValue, String newValue) {
        try {
            User performer = null;
            if (performerUsername != null) {
                performer = userRepository.findByUsername(performerUsername).orElse(null);
            }

            SystemLog logEntry = SystemLog.builder()
                    .title(title)
                    .description(description)
                    .type(type)
                    .source(source)
                    .performer(performer)
                    .ipAddress(ip)
                    .userAgent(ua)
                    .oldValue(oldValue)
                    .newValue(newValue)
                    .build();
            systemLogRepository.save(logEntry);
            log.debug("System log saved: {} - {} | Performer: {}", title, type, performerUsername);
        } catch (Exception e) {
            log.error("Failed to save system log in new transaction: {}", e.getMessage(), e);
        }
    }
}
