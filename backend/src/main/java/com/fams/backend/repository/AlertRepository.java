package com.fams.backend.repository;

import com.fams.backend.entity.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findTop5ByOrderByCreatedAtDesc();

    List<Alert> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Alert> findByTypeOrderByCreatedAtDesc(Alert.AlertType type);

    @EntityGraph(attributePaths = { "user" })
    @Query("SELECT a FROM Alert a WHERE " +
            "(cast(:search as string) IS NULL OR LOWER(a.title) LIKE :search OR LOWER(a.description) LIKE :search) AND " +
            "(cast(:level as string) IS NULL OR a.level = :level) AND " +
            "(cast(:type as string) IS NULL OR a.type = :type) AND " +
            "(cast(:startDate as timestamp) IS NULL OR a.createdAt >= :startDate) AND " +
            "(cast(:endDate as timestamp) IS NULL OR a.createdAt <= :endDate)")
    Page<Alert> findAllByFilters(
            String search,
            Alert.AlertLevel level,
            Alert.AlertType type,
            java.time.LocalDateTime startDate,
            java.time.LocalDateTime endDate,
            Pageable pageable);
}
