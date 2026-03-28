package com.fams.backend.service;

import java.util.Map;

public interface AIChatActionService {
    /**
     * Handles mutation actions from the AI service.
     * 
     * @param action The action map containing type and params.
     * @return A success or error message to be returned by the chatbot.
     */
    String handleAction(Map<String, Object> action);
}
