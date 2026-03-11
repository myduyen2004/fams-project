package com.fams.backend.repository;

import com.fams.backend.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    List<SystemLog> findTop5ByOrderByCreatedAtDesc();
    Page<SystemLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
