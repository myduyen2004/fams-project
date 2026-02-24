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
    private static final String DEFAULT_CONFIG_KEY = "SYSTEM_CONFIG";

    @Override
    @Transactional(readOnly = true)
    public AttendanceConfig getConfig() {
        return configRepository.findByConfigKey(DEFAULT_CONFIG_KEY)
                .orElseGet(() -> {
                    log.info("Config not found, creating default configuration");
                    AttendanceConfig defaultConfig = AttendanceConfig.builder()
                            .configKey(DEFAULT_CONFIG_KEY)
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
        existing.setLateThresholdMinutes(config.getLateThresholdMinutes());
        existing.setAbsentThresholdMinutes(config.getAbsentThresholdMinutes());
        existing.setOpenBeforeMinutes(config.getOpenBeforeMinutes());
        existing.setCloseAfterMinutes(config.getCloseAfterMinutes());
        existing.setMinAttendancePercentage(config.getMinAttendancePercentage());

        existing.setFaceRecognitionEnabled(config.getFaceRecognitionEnabled());
        existing.setLivenessEnabled(config.getLivenessEnabled());
        existing.setMaxAttempts(config.getMaxAttempts());
        existing.setFaceMatchThreshold(config.getFaceMatchThreshold());

        existing.setWifiLocationEnabled(config.getWifiLocationEnabled());
        existing.setForceCampusWifi(config.getForceCampusWifi());
        existing.setMinMatchedAps(config.getMinMatchedAps());
        existing.setWifiRssiThreshold(config.getWifiRssiThreshold());

        return configRepository.save(existing);
    }
}
