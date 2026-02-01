package com.fams.backend.repository;

import com.fams.backend.entity.AttendanceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttendanceConfigRepository extends JpaRepository<AttendanceConfig, Long> {
    Optional<AttendanceConfig> findByConfigKey(String configKey);
}
