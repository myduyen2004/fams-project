package com.fams.backend.service;

import com.fams.backend.entity.AttendanceConfig;

public interface AttendanceConfigService {
    AttendanceConfig getConfig();

    AttendanceConfig updateConfig(AttendanceConfig config);

    AttendanceConfig resetConfig();
}
