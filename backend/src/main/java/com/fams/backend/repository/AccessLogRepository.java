package com.fams.backend.repository;

import com.fams.backend.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    List<AccessLog> findTop10ByOrderByAccessTimeDesc();

    java.util.Optional<AccessLog> findTopByUserIdOrderByAccessTimeDesc(Long userId);
}
