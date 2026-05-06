package com.fams.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@ConditionalOnProperty(name = "app.discord.enabled", havingValue = "true")
public class DiscordNotificationService {

    @Value("${app.discord.webhook-url}")
    private String webhookUrl;

    @Value("${app.environment:unknown}")
    private String environment;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Async
    public void sendErrorNotification(
            String errorType,
            String errorMessage,
            String stackTrace,
            String endpoint,
            String method) {
        try {
            Map<String, Object> webhook = new HashMap<>();

            // Create embed
            Map<String, Object> embed = new HashMap<>();
            embed.put("title", "🚨 Production Error Alert");
            embed.put("color", 15158332); // Red color
            embed.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

            // Add fields
            List<Map<String, Object>> fields = List.of(
                    Map.of("name", "Environment", "value", "**" + environment.toUpperCase() + "**", "inline", true),
                    Map.of("name", "Error Type", "value", errorType, "inline", true),
                    Map.of("name", "Endpoint", "value", "`" + method + " " + endpoint + "`", "inline", false),
                    Map.of("name", "Error Message", "value", "```" + truncate(errorMessage, 1000) + "```", "inline",
                            false));

            if (stackTrace != null && !stackTrace.isEmpty()) {
                fields = new java.util.ArrayList<>(fields);
                fields.add(Map.of("name", "Stack Trace", "value", "```" + truncate(stackTrace, 500) + "```", "inline",
                        false));
            }

            embed.put("fields", fields);
            embed.put("footer", Map.of("text", "FAMS Backend Error Monitoring"));

            webhook.put("embeds", List.of(embed));
            webhook.put("username", "FAMS Error Monitor");
            webhook.put("avatar_url", "https://i.imgur.com/4M34hi2.png");

            // Send to Discord
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(webhook), headers);

            restTemplate.postForEntity(webhookUrl, request, String.class);

            log.info("Discord notification sent for error: {}", errorType);
        } catch (Exception e) {
            log.error("Failed to send Discord notification", e);
        }
    }

    @Async
    public void sendDeploymentNotification(String status, String branch, String details, String url) {
        try {
            Map<String, Object> webhook = new HashMap<>();

            Map<String, Object> embed = new HashMap<>();
            embed.put("title", status.equals("success") ? "✅ Deployment Successful" : "❌ Deployment Failed");
            embed.put("color", status.equals("success") ? 3066993 : 15158332); // Green or Red
            embed.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

            List<Map<String, Object>> fields = List.of(
                    Map.of("name", "Environment", "value", "**" + environment.toUpperCase() + "**", "inline", true),
                    Map.of("name", "Branch", "value", branch, "inline", true),
                    Map.of("name", "Status", "value", details, "inline", true));

            if (url != null && !url.isEmpty()) {
                fields = new java.util.ArrayList<>(fields);
                fields.add(Map.of("name", "Access URL", "value", "[Click to Open](" + url + ")", "inline", false));
            }

            embed.put("fields", fields);
            embed.put("footer", Map.of("text", "FAMS Deployment Monitor"));

            webhook.put("embeds", List.of(embed));
            webhook.put("username", "FAMS Deploy Monitor");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> request = new HttpEntity<>(objectMapper.writeValueAsString(webhook), headers);

            restTemplate.postForEntity(webhookUrl, request, String.class);

            log.info("Discord deployment notification sent: {}", status);
        } catch (Exception e) {
            log.error("Failed to send Discord deployment notification", e);
        }
    }

    private String truncate(String text, int maxLength) {
        if (text == null)
            return "";
        if (text.length() <= maxLength)
            return text;
        return text.substring(0, maxLength) + "...";
    }
}
