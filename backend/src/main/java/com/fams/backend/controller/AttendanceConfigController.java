package com.fams.backend.controller;

import com.fams.backend.entity.AttendanceConfig;
import com.fams.backend.service.AttendanceConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/attendance-configs")
@RequiredArgsConstructor
public class AttendanceConfigController {

    private final AttendanceConfigService configService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    public ResponseEntity<AttendanceConfig> getConfig() {
        return ResponseEntity.ok(configService.getConfig());
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    public ResponseEntity<AttendanceConfig> updateConfig(@RequestBody AttendanceConfig config) {
        return ResponseEntity.ok(configService.updateConfig(config));
    }
}
