package com.fams.backend.service;

import com.fams.backend.entity.AIChatMessage;
import com.fams.backend.entity.AIChatSession;
import com.fams.backend.entity.User;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

public interface AIChatService {
    AIChatSession createSession(User user);

    List<AIChatSession> getUserSessions(User user);

    AIChatSession getSession(Long sessionId);

    Map<String, Object> sendMessage(
            Long sessionId,
            String message,
            String routingModel,
            String answerModel,
            Map<String, Object> extraEntities,
            String pendingTool,
            String originalMessage,
            Map<String, Object> pendingEntities,
            Map<String, Object> continuation
    );

    Flux<Map<String, Object>> streamMessage(Long sessionId, String message, String routingModel, String answerModel);

    List<AIChatMessage> getSessionMessages(Long sessionId);

    Map<String, Object> uploadFile(Long sessionId, MultipartFile file, String routingModel, String answerModel);

    void deleteSession(Long sessionId);
}
