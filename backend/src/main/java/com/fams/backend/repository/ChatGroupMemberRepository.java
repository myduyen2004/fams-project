package com.fams.backend.repository;

import com.fams.backend.entity.ChatGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatGroupMemberRepository extends JpaRepository<ChatGroupMember, Long> {

    List<ChatGroupMember> findByChatGroupIdAndLeftAtIsNull(Long chatGroupId);

    Optional<ChatGroupMember> findByChatGroupIdAndUserId(Long chatGroupId, Long userId);

    boolean existsByChatGroupIdAndUserIdAndLeftAtIsNull(Long chatGroupId, Long userId);

    @Query("SELECT m FROM ChatGroupMember m JOIN FETCH m.user WHERE m.chatGroup.id = :groupId AND m.leftAt IS NULL")
    List<ChatGroupMember> findActiveMembersWithUser(@Param("groupId") Long groupId);

    Optional<ChatGroupMember> findByChatGroupIdAndUserIdAndLeftAtIsNull(Long groupId, Long userId);
}
