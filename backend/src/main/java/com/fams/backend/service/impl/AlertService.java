package com.fams.backend.service.impl;

import com.fams.backend.entity.Alert;
import com.fams.backend.entity.User;
import com.fams.backend.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final DashboardBroadcastService broadcastService;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void createAlert(String title, String description, Alert.AlertLevel level, Alert.AlertType type, User user) {
        Alert alert = Alert.builder()
                .title(title)
                .description(description)
                .level(level)
                .type(type)
                .user(user)
                .createdAt(LocalDateTime.now())
                .build();
        
        alertRepository.save(alert);
        log.info("Alert created: {} | Level: {} | Type: {}", title, level, type);
        
        // Broadcast to dashboard after transaction commits
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        try {
                            broadcastService.broadcastUpdate();
                        } catch (Exception e) {
                            log.error("Failed to broadcast alert update", e);
                        }
                    }
                }
            );
        } else {
            broadcastService.broadcastUpdate();
        }
    }
}
