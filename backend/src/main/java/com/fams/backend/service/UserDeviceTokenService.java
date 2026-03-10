package com.fams.backend.service;

import com.fams.backend.entity.User;
import com.fams.backend.entity.UserDeviceToken;
import com.fams.backend.repository.UserDeviceTokenRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDeviceTokenService {

    private final UserDeviceTokenRepository tokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public void registerToken(Long userId, String token, String platform, String deviceId) {
        log.info("Registering device token for user {}: {}", userId, token);

        // Remove this token if it already exists for another user (avoid duplication)
        tokenRepository.findByToken(token).ifPresent(existing -> {
            if (!existing.getUser().getId().equals(userId)) {
                tokenRepository.delete(existing);
            }
        });

        // Find existing token for this user and device
        Optional<UserDeviceToken> existingToken = tokenRepository.findByUserId(userId).stream()
                .filter(t -> t.getToken().equals(token))
                .findFirst();

        if (existingToken.isPresent()) {
            UserDeviceToken t = existingToken.get();
            t.setPlatform(platform);
            t.setDeviceId(deviceId);
            tokenRepository.save(t);
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            UserDeviceToken newToken = UserDeviceToken.builder()
                    .user(user)
                    .token(token)
                    .platform(platform)
                    .deviceId(deviceId)
                    .build();
            tokenRepository.save(newToken);
        }
    }

    @Transactional
    public void unregisterToken(String token) {
        log.info("Unregistering device token: {}", token);
        tokenRepository.deleteByToken(token);
    }
}
