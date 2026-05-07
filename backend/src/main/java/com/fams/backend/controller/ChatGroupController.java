package com.fams.backend.controller;

import com.fams.backend.dto.response.ChatGroupResponse;
import com.fams.backend.dto.response.ChatMessageResponse;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.ChatGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat-groups")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Chat Groups", description = "API for managing chat groups")
public class ChatGroupController {

    private final ChatGroupService chatGroupService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    @PostMapping("/class/{className}")
    @Operation(summary = "Create chat group for class", description = "Create a new chat group for a class section, adding lecturer and all students as members")
    public ResponseEntity<ChatGroupResponse> createGroupForClass(@PathVariable String className) {
        log.info("POST /api/v1/chat-groups/class/{}", className);
        ChatGroupResponse response = chatGroupService.createGroupForClass(className);
        broadcastGroupCreated(response);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Get my chat groups", description = "Get all chat groups for the current user")
    public ResponseEntity<List<ChatGroupResponse>> getMyGroups() {
        log.info("GET /api/v1/chat-groups");
        return ResponseEntity.ok(chatGroupService.getMyGroups());
    }

    @GetMapping("/{groupId}")
    @Operation(summary = "Get chat group details", description = "Get detailed information about a chat group including members")
    public ResponseEntity<ChatGroupResponse> getGroupById(@PathVariable Long groupId) {
        log.info("GET /api/v1/chat-groups/{}", groupId);
        return ResponseEntity.ok(chatGroupService.getGroupById(groupId));
    }

    @GetMapping("/class/{className}/exists")
    @Operation(summary = "Check if chat group exists", description = "Check if a chat group exists for a class")
    public ResponseEntity<Map<String, Boolean>> checkGroupExists(@PathVariable String className) {
        log.info("GET /api/v1/chat-groups/class/{}/exists", className);
        boolean exists = chatGroupService.existsByClassName(className);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @GetMapping("/{groupId}/messages")
    @Operation(summary = "Get chat messages", description = "Get paginated messages for a chat group")
    public ResponseEntity<Page<ChatMessageResponse>> getMessages(
            @PathVariable Long groupId,
            Pageable pageable) {
        log.info("GET /api/v1/chat-groups/{}/messages", groupId);
        return ResponseEntity.ok(chatGroupService.getMessages(groupId, pageable));
    }

    private void broadcastGroupCreated(ChatGroupResponse groupResponse) {
        if (groupResponse == null || groupResponse.getMembers() == null || groupResponse.getMembers().isEmpty()) {
            return;
        }

        for (ChatGroupResponse.ChatMemberDTO member : groupResponse.getMembers()) {
            if (member == null || member.getUserId() == null) {
                continue;
            }

            userRepository.findById(member.getUserId()).ifPresent(user -> {
                Map<String, Object> payload = new HashMap<>();
                payload.put("type", "GROUP_CREATED");
                payload.put("group", groupResponse);

                messagingTemplate.convertAndSendToUser(
                        user.getUsername(),
                        "/queue/chat-notifications",
                        payload);
            });
        }
    }
}
