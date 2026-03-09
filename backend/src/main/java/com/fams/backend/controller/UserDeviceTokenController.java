package com.fams.backend.controller;

import com.fams.backend.entity.User;
import com.fams.backend.service.UserDeviceTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/device-tokens")
@RequiredArgsConstructor
@Tag(name = "Device Token", description = "Endpoints for managing FCM device tokens")
public class UserDeviceTokenController {

    private final UserDeviceTokenService tokenService;

    @PostMapping("/register")
    @Operation(summary = "Register or update a device token")
    public ResponseEntity<Void> registerToken(
            @AuthenticationPrincipal User currentUser,
            @RequestBody TokenRequest request) {
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
