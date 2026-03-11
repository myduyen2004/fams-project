package com.fams.backend.repository;

import com.fams.backend.entity.AIChatSession;
import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AIChatSessionRepository extends JpaRepository<AIChatSession, Long> {
    List<AIChatSession> findByUserOrderByCreatedAtDesc(User user);
}
