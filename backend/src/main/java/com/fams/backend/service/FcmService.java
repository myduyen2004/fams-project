package com.fams.backend.service;

import com.fams.backend.entity.UserDeviceToken;
import com.fams.backend.repository.UserDeviceTokenRepository;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Collections;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FcmService {

    private static final String FIREBASE_MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

    private final UserDeviceTokenRepository tokenRepository;

    @Value("${app.firebase.config-path:}")
    private String configPath;

    private boolean initialized = false;
    private GoogleCredentials firebaseCredentials;

    @PostConstruct
    public void init() {
        try (InputStream serviceAccount = openServiceAccountStream()) {
            if (serviceAccount == null) {
                log.warn("Firebase Admin SDK config not found. Push notifications will be disabled.");
                return;
            }

                firebaseCredentials = GoogleCredentials.fromStream(serviceAccount)
                    .createScoped(Collections.singletonList(FIREBASE_MESSAGING_SCOPE));

                FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(firebaseCredentials)
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }

            initialized = true;
            log.info("Firebase Admin SDK initialized successfully");
        } catch (IOException e) {
            log.error("Failed to initialize Firebase Admin SDK: {}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("Failed to initialize Firebase Admin SDK (unexpected): {}", e.getMessage(), e);
        }
    }


    private InputStream openServiceAccountStream() throws IOException {
        if (configPath != null && !configPath.isBlank()) {
            Path configuredPath = Paths.get(configPath).normalize();
            if (Files.exists(configuredPath)) {
                log.info("Loading Firebase Admin SDK config from {}", configuredPath.toAbsolutePath());
                return new FileInputStream(configuredPath.toFile());
            }

            log.warn("Configured Firebase Admin SDK path does not exist: {}", configuredPath.toAbsolutePath());

            String resourceName = configuredPath.getFileName() != null
                    ? configuredPath.getFileName().toString()
                    : null;
            if (resourceName != null && !resourceName.isBlank()) {
                ClassPathResource configuredResource = new ClassPathResource(resourceName);
                if (configuredResource.exists()) {
                    log.info("Loading Firebase Admin SDK config from classpath resource {}", resourceName);
                    return configuredResource.getInputStream();
                }
            }
        }

        ClassPathResource resource = new ClassPathResource("firebase-adminsdk.json");
        if (resource.exists()) {
            log.info("Loading Firebase Admin SDK config from classpath resource firebase-adminsdk.json");
            return resource.getInputStream();
        }

        return null;
    }

    public void sendPushNotification(Long userId, String title, String body, Map<String, String> data) {
        if (!initialized) {
            log.warn("Cannot send push notification to user {}: Firebase not initialized", userId);
            return;
        }



        List<UserDeviceToken> tokens = tokenRepository.findByUserId(userId);
        if (tokens.isEmpty()) {
            log.debug("No device tokens found for user {}", userId);
            return;
        }

        List<String> tokenValues = tokens.stream()
                .map(UserDeviceToken::getToken)
                .collect(Collectors.toList());

        MulticastMessage message = MulticastMessage.builder()
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(stripHtml(body))
                        .build())
                .putAllData(data)
                .addAllTokens(tokenValues)
                .build();

        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("Sent push notification to user {}: {} success, {} failure",
                    userId, response.getSuccessCount(), response.getFailureCount());

            if (response.getFailureCount() > 0) {
                List<String> tokensToRemove = new ArrayList<>();
                List<SendResponse> sendResponses = response.getResponses();

                for (int i = 0; i < sendResponses.size(); i++) {
                    SendResponse sendResponse = sendResponses.get(i);
                    if (sendResponse.isSuccessful()) {
                        continue;
                    }

                    String failedToken = tokenValues.get(i);
                    FirebaseMessagingException ex = sendResponse.getException();
                    String errorCode = ex != null && ex.getMessagingErrorCode() != null
                            ? ex.getMessagingErrorCode().name()
                            : "UNKNOWN";
                    String errorMsg = ex != null ? ex.getMessage() : "Unknown send error";

                    log.warn("FCM send failed for user {} token={}... code={} message={}",
                            userId,
                            failedToken.substring(0, Math.min(24, failedToken.length())),
                            errorCode,
                            errorMsg);

                        if (ex != null) {
                        log.debug("FCM token failure stack for user {} tokenPrefix={}...", userId,
                            failedToken.substring(0, Math.min(24, failedToken.length())), ex);
                        }

                    // Remove dead tokens to avoid repeated failures on next sends.
                    if (ex != null && ex.getMessagingErrorCode() != null &&
                            (ex.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                                    || ex.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT)) {
                        tokensToRemove.add(failedToken);
                    }
                }

                if (!tokensToRemove.isEmpty()) {
                    tokensToRemove.forEach(tokenRepository::deleteByToken);
                    log.info("Removed {} invalid FCM token(s) for user {}", tokensToRemove.size(), userId);
                }
            }
        } catch (FirebaseMessagingException e) {
            log.error("Error sending FCM message: {}", e.getMessage(), e);
        }
    }

    public void sendPushNotificationsForUsers(List<Long> userIds, String title, String body, Map<String, String> data) {
        if (!initialized) {
            log.warn("Cannot send push notifications: Firebase not initialized");
            return;
        }

        if (userIds == null || userIds.isEmpty()) return;

        List<UserDeviceToken> tokens = tokenRepository.findByUserIdIn(userIds);
        if (tokens.isEmpty()) {
            log.debug("No device tokens found for {} users", userIds.size());
            return;
        }

        List<String> tokenValues = tokens.stream()
                .map(UserDeviceToken::getToken)
                .collect(Collectors.toList());

        // Process in chunks of 500 (Firebase limit)
        for (int i = 0; i < tokenValues.size(); i += 500) {
            int end = Math.min(i + 500, tokenValues.size());
            List<String> chunk = tokenValues.subList(i, end);

            MulticastMessage message = MulticastMessage.builder()
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(stripHtml(body))
                            .build())
                    .putAllData(data)
                    .addAllTokens(chunk)
                    .build();

            try {
                BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
                log.info("Sent batch push notification to {} tokens: {} success, {} failure",
                        chunk.size(), response.getSuccessCount(), response.getFailureCount());

                if (response.getFailureCount() > 0) {
                    List<String> tokensToRemove = new ArrayList<>();
                    List<SendResponse> sendResponses = response.getResponses();

                    for (int j = 0; j < sendResponses.size(); j++) {
                        SendResponse sendResponse = sendResponses.get(j);
                        if (!sendResponse.isSuccessful()) {
                            String failedToken = chunk.get(j);
                            FirebaseMessagingException ex = sendResponse.getException();
                            if (ex != null && ex.getMessagingErrorCode() != null &&
                                    (ex.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                                            || ex.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT)) {
                                tokensToRemove.add(failedToken);
                            }
                        }
                    }

                    if (!tokensToRemove.isEmpty()) {
                        tokensToRemove.forEach(tokenRepository::deleteByToken);
                        log.info("Removed {} invalid FCM token(s)", tokensToRemove.size());
                    }
                }
            } catch (FirebaseMessagingException e) {
                log.error("Error sending FCM batch message: {}", e.getMessage(), e);
            }
        }
    }

    public String formatPushBody(String content, int maxLength) {
        String plainText = stripHtml(content);
        if (plainText == null) {
            return "";
        }

        String normalized = plainText.replaceAll("\\s+", " ").trim();
        if (maxLength <= 0 || normalized.length() <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, maxLength - 1).trim() + "...";
    }

    /**
     * Strip HTML tags from a string so push notification body displays as plain text.
     */
    private String stripHtml(String html) {
        if (html == null || html.isBlank()) return html;
        // Remove hidden spans
        String text = html.replaceAll("(?is)<span[^>]*display:\\s*none[^>]*>.*?</span>", "");
        // Convert <br> and </p> to newlines
        text = text.replaceAll("(?i)<br\\s*/?>", "\n");
        text = text.replaceAll("(?i)</p>", "\n");
        // Strip all remaining HTML tags
        text = text.replaceAll("<[^>]*>", "");
        // Decode common HTML entities
        text = text.replace("&nbsp;", " ")
                   .replace("&amp;", "&")
                   .replace("&lt;", "<")
                   .replace("&gt;", ">")
                   .replace("&quot;", "\"")
                   .replace("&apos;", "'");
        return text.trim();
    }
}
