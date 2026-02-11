package com.fams.backend.repository;

import com.fams.backend.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

        @Query("SELECT m FROM ChatMessage m JOIN FETCH m.sender WHERE m.chatGroup.id = :groupId ORDER BY m.sentAt DESC")
        Page<ChatMessage> findByGroupIdWithSender(@Param("groupId") Long groupId, Pageable pageable);

        @Query("SELECT m FROM ChatMessage m JOIN FETCH m.sender WHERE m.chatGroup.id = :groupId ORDER BY m.sentAt ASC")
        Page<ChatMessage> findByGroupIdWithSenderAsc(@Param("groupId") Long groupId, Pageable pageable);

        @Query(value = "SELECT * FROM chat_messages WHERE chat_group_id = :groupId ORDER BY sent_at DESC LIMIT 1", nativeQuery = true)
        Optional<ChatMessage> findLastMessageByGroupId(@Param("groupId") Long groupId);

        Optional<ChatMessage> findTopByChatGroupIdOrderBySentAtDesc(Long groupId);

        Optional<ChatMessage> findTopByChatGroupIdAndIsDeletedFalseOrderBySentAtDesc(Long groupId);

        @Query(value = "SELECT * FROM chat_messages m " +
                        "WHERE m.chat_group_id = :groupId AND m.sender_id != :userId " +
                        "AND m.is_deleted = false " +
                        "AND NOT EXISTS (SELECT 1 FROM chat_message_reads r WHERE r.message_id = m.id AND r.user_id = :userId)", nativeQuery = true)
        List<ChatMessage> findUnreadMessagesByGroupIdAndUserId(@Param("groupId") Long groupId,
                        @Param("userId") Long userId);
}
