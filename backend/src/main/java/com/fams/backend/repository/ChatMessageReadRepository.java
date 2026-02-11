package com.fams.backend.repository;

import com.fams.backend.entity.ChatMessageRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageReadRepository extends JpaRepository<ChatMessageRead, Long> {

    boolean existsByMessageIdAndUserId(Long messageId, Long userId);

    @Query(value = "SELECT COUNT(*) FROM chat_messages m " +
            "WHERE m.chat_group_id = :groupId " +
            "AND m.sender_id != :userId " +
            "AND m.is_deleted = false " +
            "AND NOT EXISTS (SELECT 1 FROM chat_message_reads r WHERE r.message_id = m.id AND r.user_id = :userId)", nativeQuery = true)
    long countUnreadMessages(@Param("groupId") Long groupId, @Param("userId") Long userId);

    @Query(value = "SELECT m.id FROM chat_messages m " +
            "WHERE m.chat_group_id = :groupId " +
            "AND m.sender_id != :userId " +
            "AND m.is_deleted = false " +
            "AND NOT EXISTS (SELECT 1 FROM chat_message_reads r WHERE r.message_id = m.id AND r.user_id = :userId) " +
            "ORDER BY m.sent_at ASC LIMIT 1", nativeQuery = true)
    Optional<Long> findFirstUnreadMessageId(@Param("groupId") Long groupId, @Param("userId") Long userId);

    @Query("SELECT r.message.id FROM ChatMessageRead r WHERE r.user.id = :userId AND r.message.chatGroup.id = :groupId")
    List<Long> findReadMessageIds(@Param("userId") Long userId, @Param("groupId") Long groupId);
}
