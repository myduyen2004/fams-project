package com.fams.backend.controller;

import com.fams.backend.dto.request.CreateGradeOtpRequest;
import com.fams.backend.dto.request.VerifyGradeOtpRequest;
import com.fams.backend.dto.response.LecturerOtpStatusResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.LecturerGradeOtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/lecturer/grade-otp")
@RequiredArgsConstructor
@Tag(name = "Lecturer Grade OTP", description = "APIs for managing lecturer grade OTP")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerGradeOtpController {

    private final LecturerGradeOtpService lecturerGradeOtpService;
    private final UserRepository userRepository;

    @GetMapping("/status")
    @Operation(summary = "Kiểm tra trạng thái OTP", description = "Kiểm tra xem giảng viên đã có OTP chưa")
    public ResponseEntity<LecturerOtpStatusResponse> getOtpStatus(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        LecturerOtpStatusResponse response = lecturerGradeOtpService.getOtpStatus(userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/create")
    @Operation(summary = "Tạo OTP mới", description = "Tạo mã OTP 6 số cho giảng viên")
    public ResponseEntity<Map<String, Object>> createOtp(
            @Valid @RequestBody CreateGradeOtpRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        lecturerGradeOtpService.createOtp(userId, request);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Tạo mã OTP thành công"));
    }

    @PostMapping("/verify")
    @Operation(summary = "Xác thực OTP", description = "Xác thực mã OTP để mở khóa chỉnh sửa điểm")
    public ResponseEntity<Map<String, Object>> verifyOtp(
            @Valid @RequestBody VerifyGradeOtpRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        boolean verified = lecturerGradeOtpService.verifyOtp(userId, request);
        return ResponseEntity.ok(Map.of(
                "verified", verified,
                "message", verified ? "Xác thực thành công" : "Mã OTP không chính xác"));
    }

    @GetMapping("/session")
    @Operation(summary = "Kiểm tra session OTP", description = "Kiểm tra xem session OTP còn hiệu lực không")
    public ResponseEntity<Map<String, Object>> checkSession(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        boolean hasValidSession = lecturerGradeOtpService.hasValidSession(userId);
        return ResponseEntity.ok(Map.of(
                "hasValidSession", hasValidSession));
    }

    @PutMapping("/regenerate")
    @Operation(summary = "Đổi OTP", description = "Thay đổi mã OTP hiện tại")
    public ResponseEntity<Map<String, Object>> regenerateOtp(
            @Valid @RequestBody CreateGradeOtpRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        lecturerGradeOtpService.regenerateOtp(userId, request);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đổi mã OTP thành công"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất session OTP", description = "Hủy session xác thực OTP")
    public ResponseEntity<Map<String, Object>> logoutSession(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = getUserId(userDetails);
        lecturerGradeOtpService.invalidateSession(userId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã đăng xuất khỏi session OTP"));
    }

    private Long getUserId(UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }
}
