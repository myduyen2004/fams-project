package com.fams.backend.controller;

import com.fams.backend.dto.request.SendMessageRequest;
import com.fams.backend.dto.response.ChatMessageResponse;
import com.fams.backend.service.ChatGroupService;
import com.fams.backend.service.FcmService;
import com.fams.backend.service.UploadService;
import com.fams.backend.repository.ChatGroupRepository;
import com.fams.backend.repository.ChatGroupMemberRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.entity.User;
import com.fams.backend.entity.ChatGroup;
import com.fams.backend.entity.ChatGroupMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat-messages")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
@Tag(name = "Chat Messages", description = "API for sending and receiving chat messages")
public class ChatMessageController {

        private final ChatGroupService chatGroupService;
        private final UploadService uploadService;
        private final SimpMessagingTemplate messagingTemplate;
        private final ChatGroupRepository chatGroupRepository;
        private final ChatGroupMemberRepository chatGroupMemberRepository;
        private final UserRepository userRepository;
        private final FcmService fcmService;

        // ==================== REST API ====================

        @PostMapping("/{groupId}")
        @Operation(summary = "Send message", description = "Send a text message to a chat group")
        public ResponseEntity<ChatMessageResponse> sendMessage(
                        @PathVariable Long groupId,
                        @RequestBody SendMessageRequest request) {
                log.info("POST /api/v1/chat-messages/{}", groupId);

                ChatMessageResponse message = chatGroupService.sendMessage(
                                groupId,
                                request.getContent(),
                                request.getType() != null ? request.getType() : "TEXT",
                                request.getReplyToId(),
                                request.getAttachmentUrl(),
                                request.getAttachmentName());

                // Broadcast to WebSocket subscribers
                messagingTemplate.convertAndSend("/topic/chat/" + groupId, message);
                broadcastChatNotification(groupId, message);

                return ResponseEntity.ok(message);
        }

        @PostMapping("/{groupId}/upload")
        @Operation(summary = "Upload and send file", description = "Upload a file to Cloudinary and send as message")
        public ResponseEntity<ChatMessageResponse> uploadAndSendFile(
                        @PathVariable Long groupId,
                        @RequestParam("file") MultipartFile file,
                        @RequestParam(value = "replyToId", required = false) Long replyToId) {
                log.info("POST /api/v1/chat-messages/{}/upload | filename={}", groupId, file.getOriginalFilename());

                // Upload to Cloudinary
                String attachmentUrl = uploadService.uploadFile(file);
                String attachmentName = file.getOriginalFilename();

                // Determine type based on content type
                String type = "FILE";
                String contentType = file.getContentType();
                if (contentType != null) {
                        if (contentType.startsWith("image/")) {
                                type = "IMAGE";
                        }
                }

                ChatMessageResponse message = chatGroupService.sendMessage(
                                groupId,
                                null,
                                type,
                                replyToId,
                                attachmentUrl,
                                attachmentName);

                // Broadcast to WebSocket subscribers
                messagingTemplate.convertAndSend("/topic/chat/" + groupId, message);
                broadcastChatNotification(groupId, message);

                return ResponseEntity.ok(message);
        }

        @DeleteMapping("/{groupId}/{messageId}")
        @Operation(summary = "Delete message", description = "Delete (undo) a message in a chat group")
        public ResponseEntity<ChatMessageResponse> deleteMessage(
                        @PathVariable Long groupId,
                        @PathVariable Long messageId) {
                log.info("DELETE /api/v1/chat-messages/{}/{}", groupId, messageId);

                ChatMessageResponse message = chatGroupService.deleteMessage(groupId, messageId);

                // Broadcast deletion event to WebSocket subscribers
                messagingTemplate.convertAndSend("/topic/chat/" + groupId + "/delete", message);

                return ResponseEntity.ok(message);
        }

        // ==================== WEBSOCKET HANDLERS ====================

        @MessageMapping("/chat.send/{groupId}")
        public void handleSendMessage(
                        @DestinationVariable Long groupId,
                        @Payload SendMessageRequest request,
                        Principal principal) {
                log.info("WebSocket: User {} sending message to group {}", principal.getName(), groupId);

                ChatMessageResponse message = chatGroupService.sendMessage(
                                groupId,
                                request.getContent(),
                                request.getType() != null ? request.getType() : "TEXT",
                                request.getReplyToId(),
                                request.getAttachmentUrl(),
                                request.getAttachmentName());

                // Broadcast to all subscribers
                messagingTemplate.convertAndSend("/topic/chat/" + groupId, message);
                broadcastChatNotification(groupId, message);
        }

        @MessageMapping("/chat.typing/{groupId}")
        public void handleTyping(
                        @DestinationVariable Long groupId,
                        @Payload Map<String, Object> payload,
                        SimpMessageHeaderAccessor headerAccessor) {
                String username = (String) payload.get("username");
                Boolean isTyping = (Boolean) payload.get("isTyping");

                log.debug("WebSocket: User {} typing status in group {}: {}", username, groupId, isTyping);

                // Broadcast typing status to all group members
                messagingTemplate.convertAndSend("/topic/chat/" + groupId + "/typing",
                                Map.of(
                                                "username", username,
                                                "isTyping", isTyping != null ? isTyping : false));
        }

        private void broadcastChatNotification(Long groupId, ChatMessageResponse message) {
                String groupName = chatGroupRepository.findById(groupId)
                                .map(ChatGroup::getName)
                                .orElse("Nhóm chat");

                List<ChatGroupMember> members = chatGroupMemberRepository
                                .findActiveMembersWithUser(groupId);

                log.info("Broadcasting chat notification for group {} to {} members", groupId, members.size());

                for (ChatGroupMember member : members) {
                        // Don't send notification to the sender
                        if (member.getUser().getId().equals(message.getSenderId())) {
                                continue;
                        }

                        // Broadcast real-time WS update (no persistent notification needed)
                        Map<String, Object> payload = new HashMap<>();
                        payload.put("groupId", groupId);
                        payload.put("groupName", groupName);
                        payload.put("senderName", message.getSenderName());
                        payload.put("content", message.getContent() != null ? message.getContent()
                                        : (message.getType().equals("IMAGE") ? "[Hình ảnh]"
                                                        : "📎 " + message.getAttachmentName()));
                        payload.put("type", message.getType());
                        payload.put("sentAt", message.getSentAt() != null ? message.getSentAt() : LocalDateTime.now());

                        messagingTemplate.convertAndSendToUser(
                                        member.getUser().getUsername(),
                                        "/queue/chat-notifications",
                                        payload);

                        // 3. Send Push Notification (FCM)
                        fcmService.sendPushNotification(
                                        member.getUser().getId(),
                                        groupName,
                                        message.getSenderName() + ": " + (message.getContent() != null
                                                        ? message.getContent()
                                                        : (message.getType().equals("IMAGE") ? "[Hình ảnh]"
                                                                        : "📎 " + message.getAttachmentName())),
                                        Map.of(
                                                        "groupId", groupId.toString(),
                                                        "type", "CHAT"));
                }
        }

        @MessageMapping("/chat.read/{groupId}")
        public void handleMarkAsRead(
                        @DestinationVariable Long groupId,
                        Principal principal) {
                log.info("WebSocket: User {} marking group {} as read", principal.getName(), groupId);
                List<Long> readMessageIds = chatGroupService.markAsRead(groupId, principal.getName());

                if (!readMessageIds.isEmpty()) {
                        User currentUser = userRepository.findByUsername(principal.getName())
                                        .orElse(null);

                        if (currentUser != null) {
                                log.info("Broadcasting read receipt for {} messages in group {} by user {}",
                                                readMessageIds.size(), groupId, currentUser.getFullName());

                                // 1. Broadcast to group (for avatars in chat window)
                                messagingTemplate.convertAndSend("/topic/chat/" + groupId + "/read", Map.of(
                                                "messageIds", readMessageIds,
                                                "reader", Map.of(
                                                                "userId", currentUser.getId(),
                                                                "fullName", currentUser.getFullName(),
                                                                "avatar",
                                                                currentUser.getAvatar() != null
                                                                                ? currentUser.getAvatar()
                                                                                : "")));

                                // 2. Broadcast to user's private queue (to clear unread count syncing across
                                // tabs/devices)
                                messagingTemplate.convertAndSendToUser(
                                                principal.getName(),
                                                "/queue/chat-notifications",
                                                Map.of(
                                                                "type", "READ_UPDATE",
                                                                "groupId", groupId,
                                                                "messageIds", readMessageIds));
                        }
                }
        }

        @PostMapping("/groups/{groupId}/read")
        @Operation(summary = "Mark messages as read", description = "Mark all unread messages in a group as read for the current user")
        public ResponseEntity<Void> markAsRead(@PathVariable Long groupId, Principal principal) {
                log.info("POST /api/v1/chat-messages/groups/{}/read", groupId);
                handleMarkAsRead(groupId, principal);
                return ResponseEntity.ok().build();
        }
}
