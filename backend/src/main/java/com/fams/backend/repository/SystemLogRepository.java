package com.fams.backend.repository;

import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    List<SystemLog> findTop5ByOrderByCreatedAtDesc();
    List<SystemLog> findTop10ByOrderByCreatedAtDesc();
    Page<SystemLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"performer"})
    @Query("SELECT s FROM SystemLog s WHERE " +
           "(cast(:search as string) IS NULL OR LOWER(s.title) LIKE :search OR LOWER(s.description) LIKE :search) AND " +
           "(cast(:type as string) IS NULL OR s.type = :type) AND " +
           "(cast(:role as string) IS NULL OR s.performer.role = :role) AND " +
           "(cast(:startDate as timestamp) IS NULL OR s.createdAt >= :startDate) AND " +
           "(cast(:endDate as timestamp) IS NULL OR s.createdAt <= :endDate)")
    Page<SystemLog> findAllByFilters(
            String search, 
            SystemLog.LogType type, 
            User.UserRole role, 
            java.time.LocalDateTime startDate, 
            java.time.LocalDateTime endDate, 
            Pageable pageable);
}
