package com.fams.backend.service;

import com.fams.backend.dto.response.ChatGroupResponse;
import com.fams.backend.dto.response.ChatMessageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ChatGroupService {

    /**
     * Create a chat group for a class section
     * Automatically adds lecturer and all enrolled students as members
     */
    ChatGroupResponse createGroupForClass(String className);

    /**
     * Get all chat groups for the current user
     */
    List<ChatGroupResponse> getMyGroups();

    /**
     * Get chat group by ID with members
     */
    ChatGroupResponse getGroupById(Long groupId);

    /**
     * Check if a chat group exists for a class
     */
    boolean existsByClassName(String className);

    /**
     * Get messages for a chat group
     */
    Page<ChatMessageResponse> getMessages(Long groupId, Pageable pageable);

    /**
     * Send a message to a chat group
     */
    ChatMessageResponse sendMessage(Long groupId, String content, String type, Long replyToId, String attachmentUrl,
            String attachmentName);

    /**
     * Delete (undo) a message
     */
    ChatMessageResponse deleteMessage(Long groupId, Long messageId);

    List<Long> markAsRead(Long groupId, String username);
}
