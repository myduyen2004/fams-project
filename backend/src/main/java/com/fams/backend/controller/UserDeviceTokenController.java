package com.fams.backend.controller;

import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.UserDeviceTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/device-tokens")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Device Token", description = "Endpoints for managing FCM device tokens")
public class UserDeviceTokenController {

    private final UserDeviceTokenService tokenService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    @Operation(summary = "Register or update a device token")
    public ResponseEntity<Void> registerToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody TokenRequest request) {
        if (userDetails == null) {
            log.warn("Device token register rejected: unauthenticated request");
            throw new RuntimeException("Unauthenticated request");
        }

        log.info("Device token register request: username={}, tokenLength={}, platform={}, deviceId={}",
            userDetails.getUsername(),
            request.getToken() != null ? request.getToken().length() : 0,
            request.getPlatform(),
            request.getDeviceId());

        User currentUser = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        tokenService.registerToken(
                currentUser.getId(),
                request.getToken(),
                request.getPlatform(),
                request.getDeviceId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/unregister")
    @Operation(summary = "Unregister a device token")
    public ResponseEntity<Void> unregisterToken(@RequestBody TokenUnregisterRequest request) {
        log.info("Device token unregister request: tokenLength={}",
                request.getToken() != null ? request.getToken().length() : 0);
        tokenService.unregisterToken(request.getToken());
        return ResponseEntity.ok().build();
    }

    @Data
    public static class TokenRequest {
        private String token;
        private String platform;
        private String deviceId;
    }

    @Data
    public static class TokenUnregisterRequest {
        private String token;
    }
}
