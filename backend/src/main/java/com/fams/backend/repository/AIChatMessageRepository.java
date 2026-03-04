package com.fams.backend.repository;

import com.fams.backend.entity.AIChatMessage;
import com.fams.backend.entity.AIChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AIChatMessageRepository extends JpaRepository<AIChatMessage, Long> {
    List<AIChatMessage> findBySessionOrderByCreatedAtAsc(AIChatSession session);
}
