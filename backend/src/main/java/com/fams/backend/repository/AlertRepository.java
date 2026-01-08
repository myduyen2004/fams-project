package com.fams.backend.repository;

import com.fams.backend.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findTop5ByOrderByCreatedAtDesc();

    List<Alert> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Alert> findByTypeOrderByCreatedAtDesc(Alert.AlertType type);
}
