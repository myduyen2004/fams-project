package com.fams.backend.service;

import com.fams.backend.entity.UserDeviceToken;
import com.fams.backend.repository.UserDeviceTokenRepository;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FcmService {

    private final UserDeviceTokenRepository tokenRepository;

    @Value("${app.firebase.config-path:}")
    private String configPath;

    private boolean initialized = false;

    @PostConstruct
    public void init() {
        if (configPath == null || configPath.isEmpty()) {
            log.warn("Firebase config path is empty. Push notifications will be disabled.");
            return;
        }

        try (FileInputStream serviceAccount = new FileInputStream(configPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
            initialized = true;
            log.info("Firebase Admin SDK initialized successfully from {}", configPath);
        } catch (IOException e) {
            log.error("Failed to initialize Firebase Admin SDK: {}", e.getMessage());
        }
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
                        .setBody(body)
                        .build())
                .putAllData(data)
                .addAllTokens(tokenValues)
                .build();

        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("Sent push notification to user {}: {} success, {} failure",
                    userId, response.getSuccessCount(), response.getFailureCount());

            // Handle invalid tokens (maybe user uninstalled app)
            if (response.getFailureCount() > 0) {
                // In a production app, we would check for error codes like
                // 'registration-token-not-registered'
                // and remove invalid tokens from the database.
            }
        } catch (FirebaseMessagingException e) {
            log.error("Error sending FCM message: {}", e.getMessage());
        }
    }
}
