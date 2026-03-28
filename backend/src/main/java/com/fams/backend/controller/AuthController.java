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
public class AuthController {

    private final AuthService authService;
    private final com.fams.backend.service.UserService userService;
    private final com.fams.backend.service.impl.SystemLogService systemLogService;

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
        try {
            LoginResponse response = authService.login(request, httpRequest);
            systemLogService.logLoginSuccess(request.getUsername());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            systemLogService.logLoginFailed(request.getUsername());
            throw e;
        }
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

    @PostMapping("/forgot-password")
    @Operation(summary = "Quên mật khẩu", description = "Gửi mã OTP về email để khôi phục mật khẩu")
    public ResponseEntity<Void> forgotPassword(
            @Valid @RequestBody com.fams.backend.dto.request.ForgotPasswordRequest request) {
        log.info("POST /auth/forgot-password - email: {}", request.getEmail());
        authService.forgotPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Xác thực OTP", description = "Xác thực mã OTP được gửi về email")
    public ResponseEntity<Void> verifyOtp(
            @Valid @RequestBody com.fams.backend.dto.request.VerifyOtpRequest request) {
        log.info("POST /auth/verify-otp - email: {}", request.getEmail());
        authService.verifyOtp(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu mới", description = "Reset mật khẩu mới sau khi xác thực OTP")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody com.fams.backend.dto.request.ResetPasswordRequest request) {
        log.info("POST /auth/reset-password - email: {}", request.getEmail());
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }

    @PutMapping(value = "/profile", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Cập nhật thông tin cá nhân", description = "Cập nhật SĐT, Ngày sinh (Sv/Gv) và Avatar (Gv only)")
    public ResponseEntity<com.fams.backend.dto.response.UserResponse> updateProfile(
            @RequestPart("data") @Valid com.fams.backend.dto.request.UpdateProfileRequest request,
            @RequestPart(value = "avatar", required = false) org.springframework.web.multipart.MultipartFile avatar) {

        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        log.info("PUT /auth/profile - user: {}", username);

        return ResponseEntity.ok(userService.updateMyProfile(username, request, avatar));
    }

    @GetMapping("/user/{id}/profile")
    @Operation(summary = "Lấy thông tin công khai của người dùng", description = "Sử dụng cho sinh viên xem thông tin giảng viên")
    public ResponseEntity<com.fams.backend.dto.response.UserResponse> getPublicUserProfile(@PathVariable Long id) {
        log.info("GET /auth/user/{}/profile", id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * GET /auth/me
     * Lấy thông tin user hiện tại (cần JWT token)
     */
    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin người dùng hiện tại")
    public ResponseEntity<com.fams.backend.dto.response.UserResponse> getCurrentUser() {
        log.info("GET /auth/me - Hot reload is working!");
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }
}