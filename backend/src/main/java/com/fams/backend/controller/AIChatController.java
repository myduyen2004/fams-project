package com.fams.backend.controller;

import com.fams.backend.entity.AIChatMessage;
import com.fams.backend.entity.AIChatSession;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.AIChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Chat", description = "API cho Chatbot AI Learning Assistant")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AIChatController {

    private final AIChatService aiChatService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping("/sessions")
    @Operation(summary = "Tạo phiên chat mới")
    public ResponseEntity<AIChatSession> createSession() {
        return ResponseEntity.ok(aiChatService.createSession(getCurrentUser()));
    }

    @GetMapping("/sessions")
    @Operation(summary = "Lấy danh sách các phiên chat của người dùng")
    public ResponseEntity<List<AIChatSession>> getUserSessions() {
        return ResponseEntity.ok(aiChatService.getUserSessions(getCurrentUser()));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    @Operation(summary = "Lấy lịch sử tin nhắn của một phiên chat")
    public ResponseEntity<List<AIChatMessage>> getSessionMessages(@PathVariable Long sessionId) {
        return ResponseEntity.ok(aiChatService.getSessionMessages(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/send")
    @Operation(summary = "Gửi tin nhắn vào một phiên chat")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @PathVariable Long sessionId,
            @RequestBody Map<String, Object> request) {
        String message = (String) request.get("message");
        String routingModel = (String) request.get("routingModel");
        String answerModel = (String) request.get("answerModel");
        @SuppressWarnings("unchecked")
        Map<String, Object> extraEntities = (Map<String, Object>) request.get("extraEntities");
        @SuppressWarnings("unchecked")
        Map<String, Object> continuation = (Map<String, Object>) request.get("continuation");
        @SuppressWarnings("unchecked")
        Map<String, Object> pendingEntities = (Map<String, Object>) request.get("pendingEntities");
        String pendingTool = (String) request.get("pendingTool");
        String originalMessage = (String) request.get("originalMessage");
        if (continuation == null && looksLikeContinuation(pendingEntities)) {
            continuation = pendingEntities;
            pendingEntities = null;
        }

        log.info("Sending message to session {}: {} (Routing: {}, Answer: {})", sessionId, message, routingModel,
                answerModel);
        return ResponseEntity.ok(
                aiChatService.sendMessage(
                        sessionId,
                        message,
                        routingModel,
                        answerModel,
                        extraEntities,
                        pendingTool,
                        originalMessage,
                        pendingEntities,
                        continuation
                )
        );
    }

    private boolean looksLikeContinuation(Map<String, Object> payload) {
        return payload != null
                && payload.containsKey("toolName")
                && payload.containsKey("intent")
                && payload.containsKey("offset")
                && payload.containsKey("pageSize");
    }

    @PostMapping("/sessions/{sessionId}/upload")
    @Operation(summary = "Tải lên và phân tích file Excel")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @PathVariable Long sessionId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "routingModel", required = false) String routingModel,
            @RequestParam(value = "answerModel", required = false) String answerModel) {
        log.info("Uploading file to session {}: {} (Routing: {}, Answer: {})",
                sessionId, file.getOriginalFilename(), routingModel, answerModel);
        return ResponseEntity.ok(aiChatService.uploadFile(sessionId, file, routingModel, answerModel));
    }

    @DeleteMapping("/sessions/{sessionId}")
    @Operation(summary = "Xóa một phiên chat")
    public ResponseEntity<Void> deleteSession(@PathVariable Long sessionId) {
        log.info("Deleting session {}", sessionId);
        aiChatService.deleteSession(sessionId);
        return ResponseEntity.ok().build();
    }
}
