package com.fams.backend.service.impl;

import com.fams.backend.entity.AttendanceConfig;
import com.fams.backend.repository.AttendanceConfigRepository;
import com.fams.backend.service.AttendanceConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceConfigServiceImpl implements AttendanceConfigService {

    private final AttendanceConfigRepository configRepository;
    private final SystemLogService systemLogService;
    private static final String DEFAULT_CONFIG_KEY = "SYSTEM_CONFIG";

    @Override
    @Transactional(readOnly = true)
    public AttendanceConfig getConfig() {
        return configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)
                .orElseGet(() -> {
                    log.info("Config not found, creating default configuration");
                    AttendanceConfig defaultConfig = AttendanceConfig.builder()
                            .configKey(DEFAULT_CONFIG_KEY)
                            .manualEnabled(true)
                            .absentThresholdMinutes(30)
                            .minAttendancePercentage(80.0)
                            .faceRecognitionEnabled(true)
                            .maxAttempts(5)
                            .wifiLocationEnabled(true)
                            .build();
                    return configRepository.save(defaultConfig);
                });
    }

    @Override
    @Transactional
    public AttendanceConfig updateConfig(AttendanceConfig config) {
        AttendanceConfig existing = getConfig();

        // Manual copy of fields to avoid overwriting configKey, id, or timestamps
        existing.setManualEnabled(config.getManualEnabled());
        existing.setAbsentThresholdMinutes(config.getAbsentThresholdMinutes());
        existing.setMinAttendancePercentage(config.getMinAttendancePercentage());

        existing.setFaceRecognitionEnabled(config.getFaceRecognitionEnabled());
        existing.setMaxAttempts(config.getMaxAttempts());

        existing.setWifiLocationEnabled(config.getWifiLocationEnabled());

        AttendanceConfig saved = configRepository.save(existing);
        systemLogService.logAttendanceConfigUpdated();
        return saved;
    }

    @Override
    @Transactional
    public AttendanceConfig resetConfig() {
        AttendanceConfig existing = configRepository.findByConfigKey(DEFAULT_CONFIG_KEY).orElse(null);
        if (existing != null) {
            configRepository.delete(existing);
        }
        AttendanceConfig fresh = getConfig(); // Recreates with defaults
        systemLogService.logAttendanceConfigUpdated();
        return fresh;
    }
}
