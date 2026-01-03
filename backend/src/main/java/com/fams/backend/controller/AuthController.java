package com.fams.backend.controller;

import com.fams.backend.dto.request.LoginRequest;
import com.fams.backend.dto.response.LoginResponse;
import com.fams.backend.service.impl.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "API xác thực người dùng")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private final AuthService authService;
    private final com.fams.backend.service.UserService userService;

    /**
     * POST /auth/login
     * Đăng nhập
     */
    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Đăng nhập bằng username và password")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        log.info("POST /auth/login - username: {}", request.getUsername());
        LoginResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /auth/logout
     * Đăng xuất
     */
    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Đăng xuất khỏi hệ thống")
    public ResponseEntity<Void> logout() {
        log.info("POST /auth/logout");
        authService.logout();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/change-password")
    @Operation(summary = "Đổi mật khẩu", description = "Đổi mật khẩu cho người dùng đã đăng nhập")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody com.fams.backend.dto.request.ChangePasswordRequest request) {
        // Get current user ID from SecurityContext
        try {
            org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).build();
            }
            // Get username directly from Authentication object
            String username = authentication.getName();

            userService.changePassword(username, request.getNewPassword());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Change password error", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * GET /auth/me
     * Lấy thông tin user hiện tại (cần JWT token)
     */
    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin người dùng hiện tại")
    public ResponseEntity<?> getCurrentUser() {
        // TODO: Implement get current user from JWT
        return ResponseEntity.ok().build();
    }
}