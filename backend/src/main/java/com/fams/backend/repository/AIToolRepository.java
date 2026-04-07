package com.fams.backend.repository;

import com.fams.backend.entity.AITool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AIToolRepository extends JpaRepository<AITool, Long> {
    Optional<AITool> findByName(String name);
    List<AITool> findAllByIsActiveTrue();
    List<AITool> findAllByOrderByNameAsc();
}
