package com.fams.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuration for RestTemplate used by services calling the AI Service.
 * Automatically attaches the X-API-Key header to every outgoing request.
 */
@Configuration
public class AiServiceClientConfig {

    @Value("${ai-service.api-key:}")
    private String aiServiceApiKey;

    /**
     * RestTemplate bean that injects X-API-Key header for AI service calls.
     * When AI_SERVICE_API_KEY is not configured, no header is added (backward compatible).
     */
    @Bean
    public RestTemplate aiServiceRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        if (aiServiceApiKey != null && !aiServiceApiKey.isBlank()) {
            List<ClientHttpRequestInterceptor> interceptors = new ArrayList<>(restTemplate.getInterceptors());
            interceptors.add((request, body, execution) -> {
                request.getHeaders().set("X-API-Key", aiServiceApiKey);
                return execution.execute(request, body);
            });
            restTemplate.setInterceptors(interceptors);
        }

        return restTemplate;
    }
}
