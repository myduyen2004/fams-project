package com.fams.backend.repository;

import com.fams.backend.entity.ChatMessage;
import com.fams.backend.entity.ChatMessageReaction;
import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageReactionRepository extends JpaRepository<ChatMessageReaction, Long> {
    List<ChatMessageReaction> findByMessageId(Long messageId);
    Optional<ChatMessageReaction> findByMessageAndUserAndEmoji(ChatMessage message, User user, String emoji);
    void deleteByMessageAndUserAndEmoji(ChatMessage message, User user, String emoji);
}
