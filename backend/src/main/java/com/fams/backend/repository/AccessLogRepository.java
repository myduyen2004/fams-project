package com.fams.backend.repository;

import com.fams.backend.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT a FROM AccessLog a JOIN FETCH a.user ORDER BY a.accessTime DESC")
    List<AccessLog> findTop10ByOrderByAccessTimeDesc();

    java.util.Optional<AccessLog> findTopByUserIdOrderByAccessTimeDesc(Long userId);
}
