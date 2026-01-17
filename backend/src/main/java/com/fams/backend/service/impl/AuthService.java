package com.fams.backend.service.impl;

import com.fams.backend.dto.request.LoginRequest;
import com.fams.backend.dto.response.LoginResponse;
import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.User;
import com.fams.backend.entity.UserSession;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.UnauthorizedException;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.security.jwt.JwtUtil;
import com.fams.backend.dto.request.ForgotPasswordRequest;
import com.fams.backend.dto.request.ResetPasswordRequest;
import com.fams.backend.dto.request.VerifyOtpRequest;
import com.fams.backend.service.EmailService;
import com.fams.backend.service.GeoLocationService;
import org.springframework.data.redis.core.StringRedisTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

/**
 * @author MyDuyen
 */

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserSessionRepository userSessionRepository;
    private final AccessLogRepository accessLogRepository;
    private final GeoLocationService geoLocationService;
    private final DashboardBroadcastService dashboardBroadcastService;
    private final EmailService emailService;
    private final StringRedisTemplate redisTemplate;

    private static final String OTP_PREFIX = "otp:";
    private static final long OTP_EXPIRY_MINUTES = 10;

    /**
     * Đăng nhập
     */
    /**
     * Đăng nhập (với xử lý geolocation bên ngoài transaction)
     */
    public LoginResponse login(LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        log.info("AuthService.login start - username: {}", request.getUsername());

        // 1. Lấy vị trí từ IP (Bên ngoài transaction để tránh treo connection pool)
        String ipAddress = getClientIP(httpRequest);
        log.info("Client IP: {}", ipAddress);

        GeoLocationService.LocationData location;
        try {
            location = geoLocationService.getLocationFromIP(ipAddress);
        } catch (Exception e) {
            log.warn("GeoLocation service failed, using null location", e);
            location = null;
        }
        log.info("Location fetched: {}", location != null ? location.getProvince() : "Unknown");

        // 2. Gọi logic login chính (Bên trong transaction)
        log.info("Calling performLogin...");
        LoginResponse response = performLogin(request, httpRequest, ipAddress, location);
        log.info("performLogin completed successfully");

        // 3. Broadcast update bên ngoài transaction để tránh deadlock/treo connection
        // pool
        try {
            log.info("Triggering async dashboard broadcast...");
            dashboardBroadcastService.broadcastUpdate();
        } catch (Exception e) {
            log.error("Failed to broadcast login update", e);
        }

        log.info("AuthService.login end - returning response");
        return response;
    }

    @Transactional
    public LoginResponse performLogin(LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest,
            String ipAddress, GeoLocationService.LocationData location) {
        String username = request.getUsername();
        log.info("Login attempt | username={}", username);

        // 1. Validate input
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            log.warn("Login failed | username=<empty> | reason=EMPTY_USERNAME");
            throw new BadRequestException("Username không được để trống");
        }
        if (request.getPassword() == null || request.getPassword().isEmpty()) {
            log.warn("Login failed | username={} | reason=EMPTY_PASSWORD", username);
            throw new BadRequestException("Password không được để trống");
        }

        // 2. Tìm user theo username
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("Login failed | username={} | reason=USER_NOT_FOUND", username);
                    return new UnauthorizedException("Tài khoản hoặc mật khẩu không đúng");
                });

        // 3. Kiểm tra status
        if (user.getStatus() == User.UserStatus.INACTIVE) {
            log.warn("Login failed | username={} | reason=ACCOUNT_INACTIVE | userId={}",
                    username, user.getId());
            throw new UnauthorizedException("Tài khoản đã bị vô hiệu hóa");
        }
        if (user.getStatus() == User.UserStatus.LOCKED) {
            log.warn("Login failed | username={} | reason=ACCOUNT_LOCKED | userId={}",
                    username, user.getId());
            throw new UnauthorizedException("Tài khoản đã bị khóa. Vui lòng liên hệ admin");
        }

        // 4. Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed | username={} | reason=INVALID_PASSWORD | userId={}",
                    username, user.getId());
            throw new UnauthorizedException("Tài khoản hoặc mật khẩu không đúng");
        }

        // 5. Generate JWT token
        String token = jwtUtil.generateToken(user.getUsername());

        // 6. Create user session and access log (Đã có location từ bên ngoài)
        log.info("Creating user session...");
        createUserSession(user, ipAddress, httpRequest.getHeader("User-Agent"), location);

        log.info("Creating access log...");
        createAccessLog(user, ipAddress, httpRequest.getHeader("User-Agent"), location);

        // 7. Create response
        log.info("Login successful | username={} | userId={} | role={}",
                username, user.getId(), user.getRole());
        return LoginResponse.builder()
                .token(token)
                .type("Bearer")
                .user(LoginResponse.fromUser(user))
                .build();
    }

    /**
     * Create user session with geolocation data
     */
    private void createUserSession(User user, String ipAddress, String userAgent,
            GeoLocationService.LocationData location) {
        try {
            // Create session
            UserSession session = UserSession.builder()
                    .user(user)
                    .ipAddress(ipAddress)
                    .province(location != null ? location.getProvince() : "Unknown")
                    .city(location != null ? location.getCity() : "Unknown")
                    .latitude(location != null ? location.getLatitude() : null)
                    .longitude(location != null ? location.getLongitude() : null)
                    .loginTime(java.time.LocalDateTime.now())
                    .lastActivityTime(java.time.LocalDateTime.now())
                    .isActive(true)
                    .userAgent(userAgent)
                    .build();

            userSessionRepository.save(session);

            log.info("User session created | userId={} | ip={} | province={}",
                    user.getId(), ipAddress, location != null ? location.getProvince() : "Unknown");

        } catch (Exception e) {
            log.error("Failed to create user session | userId={}", user.getId(), e);
            // Don't fail login if session creation fails
        }
    }

    /**
     * Create access log for dashboard
     */
    private void createAccessLog(User user, String ipAddress, String userAgent,
            GeoLocationService.LocationData location) {
        try {
            AccessLog accessLog = AccessLog.builder()
                    .user(user)
                    .location(location != null ? (location.getProvince() + ", " + location.getCity()) : "Unknown")
                    .status("Đang hoạt động")
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .accessTime(java.time.LocalDateTime.now())
                    .build();

            accessLogRepository.save(accessLog);
            log.info("Access log created | userId={} | ip={}", user.getId(), ipAddress);
        } catch (Exception e) {
            log.error("Failed to create access log | userId={}", user.getId(), e);
        }
    }

    /**
     * Extract client IP address from request
     */
    private String getClientIP(jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // If multiple IPs, take the first one
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    /**
     * Logout
     */
    public void logout() {
        performLogout();

        // Broadcast update outside transaction
        try {
            dashboardBroadcastService.broadcastUpdate();
        } catch (Exception e) {
            log.error("Failed to broadcast logout update", e);
        }
    }

    @Transactional
    public void performLogout() {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .getAuthentication().getName();

            log.info("Logout attempt | username={}", username);

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

            List<UserSession> activeSessions = userSessionRepository.findActiveSessionsByUserId(user.getId());
            for (UserSession session : activeSessions) {
                session.setIsActive(false);
                session.setLastActivityTime(java.time.LocalDateTime.now());
            }
            userSessionRepository.saveAll(activeSessions);

            // Update latest access log status
            accessLogRepository.findTopByUserIdOrderByAccessTimeDesc(user.getId())
                    .ifPresent(logEntry -> {
                        logEntry.setStatus("Đã đăng xuất");
                        accessLogRepository.save(logEntry);
                    });

            log.info("Logout successful | username={} | invalidatedSessions={}", username, activeSessions.size());
        } catch (Exception e) {
            log.error("Error during logout", e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }

    /**
     * Gửi OTP khôi phục mật khẩu
     */
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Email không tồn tại trong hệ thống"));

        if (user.getStatus() != User.UserStatus.ACTIVE) {
            throw new BadRequestException("Tài khoản chưa được kích hoạt hoặc đã bị khóa");
        }

        // Generate 6-digit OTP
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));

        // Store in Redis (10 minutes)
        redisTemplate.opsForValue().set(OTP_PREFIX + email, otp, OTP_EXPIRY_MINUTES,
                java.util.concurrent.TimeUnit.MINUTES);

        // Send email
        emailService.sendOtpEmail(email, otp);
        log.info("OTP sent to email: {}", email);
    }

    /**
     * Xác thực OTP
     */
    public boolean verifyOtp(VerifyOtpRequest request) {
        String storedOtp = redisTemplate.opsForValue().get(OTP_PREFIX + request.getEmail());
        if (storedOtp == null) {
            throw new BadRequestException("Mã OTP đã hết hạn hoặc không tồn tại");
        }

        if (!storedOtp.equals(request.getOtp())) {
            throw new BadRequestException("Mã OTP không chính xác");
        }

        return true;
    }

    /**
     * Đổi mật khẩu mới sau khi xác thực OTP
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // Double check OTP
        verifyOtp(new VerifyOtpRequest(request.getEmail(), request.getOtp()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Email không tồn tại"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setIsPasswordChanged(true);
        userRepository.save(user);

        // Delete OTP after use
        redisTemplate.delete(OTP_PREFIX + request.getEmail());
        log.info("Password reset successful for email: {}", request.getEmail());
    }
}
