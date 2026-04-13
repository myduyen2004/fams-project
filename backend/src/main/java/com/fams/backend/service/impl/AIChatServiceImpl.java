package com.fams.backend.service.impl;

import com.fams.backend.entity.AIChatMessage;
import com.fams.backend.entity.AIChatSession;
import com.fams.backend.entity.User;
import com.fams.backend.repository.AIChatMessageRepository;
import com.fams.backend.repository.AIChatSessionRepository;
import com.fams.backend.service.AIChatActionService;
import com.fams.backend.service.AIChatService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AIChatServiceImpl implements AIChatService {
    private static final Pattern CLASS_NAME_PATTERN = Pattern.compile(
            "\\b([A-Z]{2,}\\d{2,}[A-Z\\d]*_[A-Z0-9]+|[A-Z]{2,}\\d{2,}[A-Z\\d]*-[A-Z]{2,4}\\d{3,4})\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern CREATE_GROUP_CHAT_PATTERN = Pattern.compile(
            "(tạo|tao|mở|mo).*(nhóm chat|group chat)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private final AIChatSessionRepository sessionRepository;
    private final AIChatMessageRepository messageRepository;
    private final AIChatActionService aiChatActionService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();
    private final WebClient webClient = WebClient.builder().build(); // Basic initialization

    @Value("${ai.service.url:http://localhost:5000}")
    private String aiServiceUrl;

    @Override
    @Transactional
    public AIChatSession createSession(User user) {
        // Enforce 10 session limit
        List<AIChatSession> existingSessions = sessionRepository.findByUserOrderByCreatedAtDesc(user);
        if (existingSessions.size() >= 10) {
            // Delete sessions beyond the 9th to make room for the new one (10 sessions
            // total)
            List<AIChatSession> sessionsToDelete = existingSessions.subList(9, existingSessions.size());
            sessionRepository.deleteAll(sessionsToDelete);
        }

        AIChatSession session = AIChatSession.builder()
                .user(user)
                .title("New Chat Session")
                .status(AIChatSession.SessionStatus.ACTIVE)
                .build();
        AIChatSession savedSession = sessionRepository.save(session);
        if (savedSession == null) {
            throw new RuntimeException("Failed to save chat session");
        }
        return savedSession;
    }

    @Override
    public List<AIChatSession> getUserSessions(User user) {
        List<AIChatSession> sessions = sessionRepository.findByUserOrderByCreatedAtDesc(user);
        return sessions.size() > 10 ? sessions.subList(0, 10) : sessions;
    }

    @Override
    public AIChatSession getSession(Long sessionId) {
        if (sessionId == null) {
            throw new IllegalArgumentException("Session ID cannot be null");
        }
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
    }

    @Transactional
    public Map<String, Object> sendMessage(
            Long sessionId,
            String content,
            String routingModel,
            String answerModel,
            Map<String, Object> extraEntities,
            String pendingTool,
            String originalMessage,
            Map<String, Object> pendingEntities,
            Map<String, Object> continuation) {
        AIChatSession session = getSession(sessionId);

        // 1. Save User Message
        AIChatMessage userMessage = AIChatMessage.builder()
                .session(session)
                .content(content)
                .role(AIChatMessage.MessageRole.USER)
                .build();
        AIChatMessage savedUserMsg = messageRepository.save(userMessage);
        if (savedUserMsg == null) {
            throw new RuntimeException("Failed to save user message");
        }

        // Update session title if it's the first message
        if (session.getMessages().isEmpty() || "New Chat Session".equals(session.getTitle())) {
            String title = content.length() > 50 ? content.substring(0, 47) + "..." : content;
            session.setTitle(title);
        }
        session.setLastMessageAt(LocalDateTime.now());
        sessionRepository.save(session);

        Map<String, Object> directGroupChatAction = synthesizeGroupChatAction(content);
        if (directGroupChatAction != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> actionParams = (Map<String, Object>) directGroupChatAction.get("params");
            if (actionParams != null) {
                actionParams.putIfAbsent("requesterUsername", session.getUser().getUsername());
                actionParams.putIfAbsent("requesterCode", session.getUser().getCode());
                actionParams.putIfAbsent("requesterUserId", session.getUser().getId());
            }

            String answer = aiChatActionService.handleAction(directGroupChatAction);
            AIChatMessage aiMessage = AIChatMessage.builder()
                    .session(session)
                    .content(answer)
                    .role(AIChatMessage.MessageRole.ASSISTANT)
                    .build();
            messageRepository.save(aiMessage);

            Map<String, Object> response = new HashMap<>();
            response.put("answer", answer);
            response.put("thinkingSteps", List.of(Map.of(
                    "stage", 3,
                    "name", "Tool Executor",
                    "status", "Action backend → Hoàn thành",
                    "detail", "Action: " + directGroupChatAction)));
            response.put("action", directGroupChatAction);
            response.put("redirectPath", null);
            return response;
        }

        // 2. Prepare History for AI Service (Last 10 messages)
        List<AIChatMessage> messages = messageRepository.findBySessionOrderByCreatedAtAsc(session);
        List<Map<String, String>> history = messages.stream()
                .skip(Math.max(0, messages.size() - 10))
                .map(msg -> {
                    Map<String, String> m = new HashMap<>();
                    m.put("role", msg.getRole().name());
                    m.put("content", msg.getContent());
                    return m;
                })
                .toList();

        // 3. Call AI Service (Python)
        String url = aiServiceUrl + "/api/chat/full-flow";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", session.getUser().getId());
        payload.put("userRole", session.getUser().getRole().name());
        payload.put("userCode", session.getUser().getCode());
        payload.put("message", content);
        payload.put("history", history);
        payload.put("routingModel", routingModel);
        payload.put("answerModel", answerModel);
        payload.put("extraEntities", extraEntities);
        payload.put("pendingTool", pendingTool);
        payload.put("originalMessage", originalMessage);
        payload.put("pendingEntities", pendingEntities);
        payload.put("continuation", continuation);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResponse = (Map<String, Object>) restTemplate.postForObject(url, request, Map.class);

            if (aiResponse != null) {
                String answer = (String) aiResponse.get("answer");
                String redirectPath = (String) aiResponse.get("redirectPath");
                Map<String, Object> action = resolveAction(aiResponse);
                if (action == null || isPlaceholderActionAnswer(answer)) {
                    Map<String, Object> synthesizedAction = synthesizeGroupChatAction(content);
                    if (synthesizedAction != null) {
                        action = synthesizedAction;
                    }
                }

                // If AI suggests an action, execute it via the Action Service
                if (action != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> actionParams = (Map<String, Object>) action.get("params");
                    if (actionParams != null) {
                        actionParams.putIfAbsent("requesterUsername", session.getUser().getUsername());
                        actionParams.putIfAbsent("requesterCode", session.getUser().getCode());
                        actionParams.putIfAbsent("requesterUserId", session.getUser().getId());
                        actionParams.putIfAbsent("originalMessage", content);
                    }
                    String actionResult = aiChatActionService.handleAction(action);
                    if (actionResult != null) {
                        answer = actionResult;
                    }
                }

                // Save AI Message
                AIChatMessage aiMessage = AIChatMessage.builder()
                        .session(session)
                        .content(answer)
                        .role(AIChatMessage.MessageRole.ASSISTANT)
                        .redirectPath(redirectPath)
                        .build();
                AIChatMessage savedAiMsg = messageRepository.save(aiMessage);
                if (savedAiMsg == null) {
                    throw new RuntimeException("Failed to save AI message");
                }

                aiResponse.put("answer", answer); // Update answer in response
                return aiResponse; // Contains updated answer and thinkingSteps
            }
        } catch (Exception e) {
            throw new RuntimeException("Error calling AI Service: " + e.getMessage());
        }

        throw new RuntimeException("AI Service returned no response");
    }

    @Override
    @Transactional
    public Flux<Map<String, Object>> streamMessage(Long sessionId, String content, String routingModel,
            String answerModel) {
        AIChatSession session = getSession(sessionId);

        // 1. Save User Message
        AIChatMessage userMessage = AIChatMessage.builder()
                .session(session)
                .content(content)
                .role(AIChatMessage.MessageRole.USER)
                .build();
        messageRepository.save(userMessage);

        if (session.getMessages().isEmpty() || "New Chat Session".equals(session.getTitle())) {
            String title = content.length() > 50 ? content.substring(0, 47) + "..." : content;
            session.setTitle(title);
        }
        session.setLastMessageAt(LocalDateTime.now());
        sessionRepository.save(session);

        // 2. Prepare History
        List<AIChatMessage> messages = messageRepository.findBySessionOrderByCreatedAtAsc(session);
        List<Map<String, String>> history = messages.stream()
                .skip(Math.max(0, messages.size() - 10))
                .map(msg -> {
                    Map<String, String> m = new HashMap<>();
                    m.put("role", msg.getRole().name());
                    m.put("content", msg.getContent());
                    return m;
                })
                .toList();

        // 3. Call AI Service (Python)
        String url = aiServiceUrl + "/api/chat/stream";
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", session.getUser().getId());
        payload.put("userRole", session.getUser().getRole().name());
        payload.put("userCode", session.getUser().getCode());
        payload.put("message", content);
        payload.put("history", history);
        payload.put("routingModel", routingModel);
        payload.put("answerModel", answerModel);

        StringBuilder fullAnswer = new StringBuilder();
        AtomicReference<String> redirectPath = new AtomicReference<>();
        AtomicReference<Map<String, Object>> actionRef = new AtomicReference<>();

        return webClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToFlux(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                })
                .doOnNext(chunk -> {
                    String type = (String) chunk.get("type");
                    if ("answer".equals(type)) {
                        fullAnswer.append((String) chunk.get("chunk"));
                    } else if ("redirect".equals(type)) {
                        redirectPath.set((String) chunk.get("path"));
                    } else if ("action".equals(type)) {
                        actionRef.set((Map<String, Object>) chunk.get("action"));
                    }
                })
                .doOnTerminate(() -> {
                    // Logic to handle terminal actions and save AI message
                    String finalAnswer = fullAnswer.toString();
                    Map<String, Object> action = actionRef.get();

                    if (action != null) {
                        String actionResult = aiChatActionService.handleAction(action);
                        if (actionResult != null) {
                            finalAnswer = actionResult;
                        }
                    }

                    if (!finalAnswer.isEmpty()) {
                        // Re-fetch session to avoid detached entity issues on Reactor thread
                        final String answerToSave = finalAnswer;
                        final String redirect = redirectPath.get();
                        final Long sid = sessionId; // sessionId validated above via getSession()
                        sessionRepository.findById(sid).ifPresent(freshSession -> {
                            AIChatMessage aiMessage = AIChatMessage.builder()
                                    .session(freshSession)
                                    .content(answerToSave)
                                    .role(AIChatMessage.MessageRole.ASSISTANT)
                                    .redirectPath(redirect)
                                    .build();
                            messageRepository.save(aiMessage);
                        });
                    }
                });
    }

    @Override
    public List<AIChatMessage> getSessionMessages(Long sessionId) {
        AIChatSession session = getSession(sessionId);
        return messageRepository.findBySessionOrderByCreatedAtAsc(session);
    }

    @Override
    @Transactional
    public Map<String, Object> uploadFile(Long sessionId, MultipartFile file, String routingModel, String answerModel) {
        AIChatSession session = getSession(sessionId);

        // 1. Prepare Metadata for AI Service
        List<AIChatMessage> messages = messageRepository.findBySessionOrderByCreatedAtAsc(session);
        List<Map<String, String>> history = messages.stream()
                .skip(Math.max(0, messages.size() - 10))
                .map(msg -> {
                    Map<String, String> m = new HashMap<>();
                    m.put("role", msg.getRole().name());
                    m.put("content", msg.getContent());
                    return m;
                })
                .toList();

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("userId", session.getUser().getId());
        metadata.put("userRole", session.getUser().getRole().name());
        metadata.put("userCode", session.getUser().getCode());
        metadata.put("history", history);
        metadata.put("routingModel", routingModel);
        metadata.put("answerModel", answerModel);

        // 2. Prepare Multipart Request
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        try {
            ByteArrayResource contentsAsResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            body.add("file", contentsAsResource);

            // Add metadata as a separate JSON part
            HttpHeaders jsonHeaders = new HttpHeaders();
            jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> metadataPart = new HttpEntity<>(metadata, jsonHeaders);
            body.add("data", metadataPart);

        } catch (Exception e) {
            throw new RuntimeException("Error processing file for upload: " + e.getMessage());
        }

        // 3. Call AI Service
        String url = aiServiceUrl + "/api/chat/analyze-excel";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> aiResponse = (Map<String, Object>) restTemplate.postForObject(url, requestEntity,
                    Map.class);

            if (aiResponse != null) {
                String answer = (String) aiResponse.get("answer");

                // Save User Message about upload
                AIChatMessage userMessage = AIChatMessage.builder()
                        .session(session)
                        .content("Đã tải lên file: " + file.getOriginalFilename())
                        .role(AIChatMessage.MessageRole.USER)
                        .build();
                messageRepository.save(userMessage);

                // Save AI Message with summary
                AIChatMessage aiMessage = AIChatMessage.builder()
                        .session(session)
                        .content(answer)
                        .role(AIChatMessage.MessageRole.ASSISTANT)
                        .build();
                messageRepository.save(aiMessage);

                session.setLastMessageAt(LocalDateTime.now());
                sessionRepository.save(session);

                return aiResponse;
            }
        } catch (Exception e) {
            throw new RuntimeException("Error calling AI Service for Excel: " + e.getMessage());
        }

        throw new RuntimeException("AI Service returned no response for Excel analysis");
    }

    @Override
    @Transactional
    public void deleteSession(Long sessionId) {
        if (sessionId == null)
            return;
        AIChatSession session = getSession(sessionId);
        if (session != null) {
            sessionRepository.delete(session);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> resolveAction(Map<String, Object> aiResponse) {
        Object directAction = aiResponse.get("action");
        if (directAction instanceof Map<?, ?>) {
            return (Map<String, Object>) directAction;
        }

        Object stepsRaw = aiResponse.get("thinkingSteps");
        if (!(stepsRaw instanceof List<?> steps)) {
            return null;
        }

        for (Object stepObj : steps) {
            if (!(stepObj instanceof Map<?, ?> step)) {
                continue;
            }
            Object detailObj = step.get("detail");
            if (!(detailObj instanceof String detail) || !detail.startsWith("Action:")) {
                continue;
            }
            String json = detail.substring("Action:".length()).trim();
            try {
                return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
                });
            } catch (Exception ignored) {
                // try next step
            }
        }

        return null;
    }

    private boolean isPlaceholderActionAnswer(String answer) {
        if (answer == null) {
            return false;
        }
        String normalized = answer.trim().toLowerCase();
        return normalized.equals("đang thực hiện thao tác theo yêu cầu của bạn.")
                || normalized.equals("dang thuc hien thao tac theo yeu cau cua ban.");
    }

    private Map<String, Object> synthesizeGroupChatAction(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }

        Matcher classMatcher = CLASS_NAME_PATTERN.matcher(content);
        String className = classMatcher.find() ? classMatcher.group(1).toUpperCase() : null;

        if (CREATE_GROUP_CHAT_PATTERN.matcher(content).find()) {
            Map<String, Object> params = new HashMap<>();
            if (className != null) {
                params.put("class_name", className);
            }
            return buildAction("CREATE_GROUP_CHAT", params);
        }

        return null;
    }

    private Map<String, Object> buildAction(String type, Map<String, Object> params) {
        Map<String, Object> action = new HashMap<>();
        action.put("type", type);
        action.put("params", params);
        return action;
    }
}
