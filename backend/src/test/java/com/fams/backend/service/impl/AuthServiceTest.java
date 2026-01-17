package com.fams.backend.service.impl;

import com.fams.backend.dto.request.ForgotPasswordRequest;
import com.fams.backend.dto.request.LoginRequest;
import com.fams.backend.dto.request.ResetPasswordRequest;
import com.fams.backend.dto.request.VerifyOtpRequest;
import com.fams.backend.dto.response.LoginResponse;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.UnauthorizedException;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.security.jwt.JwtUtil;
import com.fams.backend.service.EmailService;
import com.fams.backend.service.GeoLocationService;
import com.fams.backend.service.impl.DashboardBroadcastService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private UserSessionRepository userSessionRepository;
    @Mock
    private AccessLogRepository accessLogRepository;
    @Mock
    private GeoLocationService geoLocationService;
    @Mock
    private DashboardBroadcastService dashboardBroadcastService;
    @Mock
    private EmailService emailService;
    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private HttpServletRequest httpRequest;

    @InjectMocks
    private AuthService authService;

    private User activeUser;
    private User lockedUser;
    private User inactiveUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(1L)
                .username("testuser")
                .password("hashed_pass")
                .role(User.UserRole.STUDENT)
                .status(User.UserStatus.ACTIVE)
                .email("test@example.com")
                .build();

        lockedUser = User.builder()
                .id(2L)
                .username("lockeduser")
                .status(User.UserStatus.LOCKED)
                .build();

        inactiveUser = User.builder()
                .id(3L)
                .username("inactiveuser")
                .status(User.UserStatus.INACTIVE)
                .build();

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        // Mock common HTTP headers
        lenient().when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        lenient().when(httpRequest.getHeader(anyString())).thenReturn("mocked-header");

        // Mock GeoLocation default
        lenient().when(geoLocationService.getLocationFromIP(anyString())).thenReturn(
                GeoLocationService.LocationData.builder()
                        .province("Province")
                        .city("City")
                        .latitude(java.math.BigDecimal.ZERO)
                        .longitude(java.math.BigDecimal.ZERO)
                        .build());
    }

    @Nested
    @DisplayName("FE-39: Login Tests")
    class LoginTests {

        @Test
        @DisplayName("UTCID01/05 (Normal): Login thành công với các loại Header IP")
        void login_Success_VariousIPHeaders() {
            LoginRequest request = new LoginRequest("testuser", "password123");
            when(httpRequest.getHeader("X-Forwarded-For")).thenReturn("1.2.3.4, 5.6.7.8");
            when(httpRequest.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(activeUser));
            when(passwordEncoder.matches("password123", "hashed_pass")).thenReturn(true);
            when(jwtUtil.generateToken("testuser")).thenReturn("token123");

            LoginResponse response = authService.login(request, httpRequest);

            assertNotNull(response);
            assertEquals("token123", response.getToken());
            verify(geoLocationService).getLocationFromIP("1.2.3.4"); // Takes first IP
            verify(userSessionRepository).save(any());
            verify(dashboardBroadcastService).broadcastUpdate();
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): Username trống")
        void login_EmptyUsername_ThrowsException() {
            LoginRequest request = new LoginRequest("", "pass");
            assertThrows(BadRequestException.class, () -> authService.login(request, httpRequest));
        }

        @Test
        @DisplayName("UTCID06 (Abnormal): Tài khoản bị LOCKED")
        void login_LockedAccount() {
            LoginRequest request = new LoginRequest("lockeduser", "pass");
            when(userRepository.findByUsername("lockeduser")).thenReturn(Optional.of(lockedUser));

            UnauthorizedException ex = assertThrows(UnauthorizedException.class,
                    () -> authService.login(request, httpRequest));
            assertEquals("Tài khoản đã bị khóa. Vui lòng liên hệ admin", ex.getMessage());
        }

        @Test
        @DisplayName("UTCID07 (Abnormal): Sai mật khẩu")
        void login_WrongPassword_ThrowsException() {
            LoginRequest request = new LoginRequest("testuser", "wrong_pass");
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(activeUser));
            when(passwordEncoder.matches("wrong_pass", "hashed_pass")).thenReturn(false);

            assertThrows(UnauthorizedException.class, () -> authService.login(request, httpRequest));
        }

        @Test
        @DisplayName("UTCID09 (Abnormal): Tài khoản không tồn tại")
        void login_UserNotFound_ThrowsException() {
            LoginRequest request = new LoginRequest("ghost", "pass");
            when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

            assertThrows(UnauthorizedException.class, () -> authService.login(request, httpRequest));
        }

        @Test
        @DisplayName("UTCID08 (Boundary): Lỗi lưu Session (DB) - không làm hỏng Login")
        void login_SessionSaveFails_StillReturnsToken() {
            LoginRequest request = new LoginRequest("testuser", "password123");
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(activeUser));
            when(passwordEncoder.matches("password123", "hashed_pass")).thenReturn(true);
            when(jwtUtil.generateToken("testuser")).thenReturn("token123");

            // Mock session save error
            when(userSessionRepository.save(any())).thenThrow(new RuntimeException("DB Error"));

            LoginResponse response = authService.login(request, httpRequest);

            assertNotNull(response);
            assertEquals("token123", response.getToken());
        }

        @Test
        @DisplayName("UTCID10 (Boundary): GeoLocation trả về lỗi - Vẫn cho login")
        void login_GeoLocationFails_StillReturnsToken() {
            LoginRequest request = new LoginRequest("testuser", "password123");
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(activeUser));
            when(passwordEncoder.matches("password123", "hashed_pass")).thenReturn(true);
            when(jwtUtil.generateToken("testuser")).thenReturn("token123");
            when(geoLocationService.getLocationFromIP(anyString())).thenThrow(new RuntimeException("API Down"));

            LoginResponse response = authService.login(request, httpRequest);

            assertNotNull(response);
            assertEquals("token123", response.getToken());
            verify(userSessionRepository).save(argThat(session -> "Unknown".equals(session.getProvince())));
        }
    }

    @Nested
    @DisplayName("Logout Tests")
    class LogoutTests {
        @Test
        @DisplayName("Logout thành công")
        void logout_Success() {
            // Mock security context
            Authentication auth = mock(Authentication.class);
            when(auth.getName()).thenReturn("testuser");
            SecurityContextHolder.getContext().setAuthentication(auth);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(activeUser));
            when(userSessionRepository.findActiveSessionsByUserId(activeUser.getId()))
                    .thenReturn(Collections.singletonList(new com.fams.backend.entity.UserSession()));
            when(accessLogRepository.findTopByUserIdOrderByAccessTimeDesc(activeUser.getId()))
                    .thenReturn(Optional.of(new com.fams.backend.entity.AccessLog()));

            authService.logout();

            verify(userSessionRepository).saveAll(anyList());
            verify(accessLogRepository).save(any());
            verify(dashboardBroadcastService).broadcastUpdate();
        }

        @Test
        @DisplayName("Logout khi không có session active")
        void logout_NoActiveSessions_Graceful() {
            Authentication auth = mock(Authentication.class);
            when(auth.getName()).thenReturn("testuser");
            SecurityContextHolder.getContext().setAuthentication(auth);

            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(activeUser));
            when(userSessionRepository.findActiveSessionsByUserId(activeUser.getId()))
                    .thenReturn(Collections.emptyList());

            authService.logout();

            verify(userSessionRepository).saveAll(argThat(list -> !list.iterator().hasNext()));
            verify(dashboardBroadcastService).broadcastUpdate();
        }
    }

    @Nested
    @DisplayName("FE-35: forgotPassword() Tests")
    class ForgotPasswordTests {

        @Test
        @DisplayName("UTCID01 (Abnormal): Email not found in Repo - Throw BadRequestException")
        void forgotPassword_EmailNotFound_ThrowsBadRequest() {
            // Mock: userRepository.findByEmail returns empty
            ForgotPasswordRequest request = new ForgotPasswordRequest("notexist@example.com");
            when(userRepository.findByEmail("notexist@example.com")).thenReturn(Optional.empty());

            // Confirm: Throw BadRequestException
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> authService.forgotPassword(request));
            assertTrue(ex.getMessage().contains("không tồn tại"));
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): Found user is LOCKED - Throw BadRequestException")
        void forgotPassword_LockedUser_ThrowsBadRequest() {
            // Mock: Found user is LOCKED
            lockedUser.setEmail("locked@example.com");
            ForgotPasswordRequest request = new ForgotPasswordRequest("locked@example.com");
            when(userRepository.findByEmail("locked@example.com")).thenReturn(Optional.of(lockedUser));

            // Confirm: Throw BadRequestException
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> authService.forgotPassword(request));
            assertTrue(ex.getMessage().contains("kích hoạt") || ex.getMessage().contains("khóa"));
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): Found user is INACTIVE - Throw BadRequestException")
        void forgotPassword_InactiveUser_ThrowsBadRequest() {
            // Mock: Found user is INACTIVE
            inactiveUser.setEmail("inactive@example.com");
            ForgotPasswordRequest request = new ForgotPasswordRequest("inactive@example.com");
            when(userRepository.findByEmail("inactive@example.com")).thenReturn(Optional.of(inactiveUser));

            // Confirm: Throw BadRequestException
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> authService.forgotPassword(request));
            assertTrue(ex.getMessage().contains("kích hoạt") || ex.getMessage().contains("khóa"));
        }

        @Test
        @DisplayName("UTCID04 (Normal): Found user is ACTIVE - OTP sent successfully")
        void forgotPassword_ActiveUser_Success() {
            // Mock: Found user is ACTIVE
            ForgotPasswordRequest request = new ForgotPasswordRequest("test@example.com");
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));

            authService.forgotPassword(request);

            // Confirm: redisTemplate.opsForValue().set called
            verify(valueOperations).set(startsWith("otp:"), anyString(), anyLong(), any());
            // Confirm: emailService.sendOtpEmail called
            verify(emailService).sendOtpEmail(eq("test@example.com"), anyString());
        }

        @Test
        @DisplayName("UTCID05 (Abnormal): emailService throws Exception - Throw BadRequestException")
        void forgotPassword_EmailServiceThrows_Exception() {
            // Mock: Found ACTIVE user, email throws
            ForgotPasswordRequest request = new ForgotPasswordRequest("test@example.com");
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));
            doThrow(new RuntimeException("Email service error")).when(emailService).sendOtpEmail(anyString(),
                    anyString());

            // Confirm: Exception propagates
            assertThrows(RuntimeException.class, () -> authService.forgotPassword(request));
        }

        @Test
        @DisplayName("UTCID06 (Abnormal): redisTemplate throws Exception")
        void forgotPassword_RedisThrows_Exception() {
            // Mock: Found ACTIVE user, redis throws
            ForgotPasswordRequest request = new ForgotPasswordRequest("test@example.com");
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));
            doThrow(new RuntimeException("Redis error")).when(valueOperations).set(anyString(), anyString(), anyLong(),
                    any());

            // Confirm: Exception propagates
            assertThrows(RuntimeException.class, () -> authService.forgotPassword(request));
        }
    }

    @Nested
    @DisplayName("FE-36: verifyOtp() Tests")
    class VerifyOtpTests {

        @Test
        @DisplayName("UTCID01 (Normal): Redis value exists and matches Input - Return true")
        void verifyOtp_ValidOtp_ReturnsTrue() {
            // Mock: redisValue exists and matches
            VerifyOtpRequest request = new VerifyOtpRequest("test@example.com", "123456");
            when(valueOperations.get("otp:test@example.com")).thenReturn("123456");

            // Confirm: Return true
            boolean result = authService.verifyOtp(request);
            assertTrue(result);
        }

        @Test
        @DisplayName("UTCID02 (Abnormal): Redis value is NULL (Expired) - Throw BadRequestException")
        void verifyOtp_Expired_ThrowsBadRequest() {
            // Mock: redisValue is NULL
            VerifyOtpRequest request = new VerifyOtpRequest("test@example.com", "123456");
            when(valueOperations.get("otp:test@example.com")).thenReturn(null);

            // Confirm: Throw BadRequestException with message
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> authService.verifyOtp(request));
            assertTrue(ex.getMessage().contains("hết hạn"));
        }

        @Test
        @DisplayName("UTCID03 (Abnormal): Redis value exists but NOT matching - Throw BadRequestException")
        void verifyOtp_Mismatch_ThrowsBadRequest() {
            // Mock: redisValue exists but NOT matching
            VerifyOtpRequest request = new VerifyOtpRequest("test@example.com", "123456");
            when(valueOperations.get("otp:test@example.com")).thenReturn("654321");

            // Confirm: Throw BadRequestException with message
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> authService.verifyOtp(request));
            assertTrue(ex.getMessage().contains("không chính xác"));
        }

        @Test
        @DisplayName("UTCID04 (Abnormal): Input OTP is Empty String - Throw BadRequestException")
        void verifyOtp_EmptyOtp_ThrowsBadRequest() {
            // Mock: redisValue exists, but input is empty
            VerifyOtpRequest request = new VerifyOtpRequest("test@example.com", "");
            when(valueOperations.get("otp:test@example.com")).thenReturn("123456");

            // Confirm: Throw BadRequestException (empty "" != "123456")
            BadRequestException ex = assertThrows(BadRequestException.class,
                    () -> authService.verifyOtp(request));
            assertTrue(ex.getMessage().contains("không chính xác"));
        }

        @Test
        @DisplayName("UTCID05 (Abnormal): Redis Connection Refused - Throw RuntimeException")
        void verifyOtp_RedisConnectionRefused_ThrowsException() {
            // Mock: Redis throws exception
            VerifyOtpRequest request = new VerifyOtpRequest("test@example.com", "123456");
            when(valueOperations.get(anyString())).thenThrow(new RuntimeException("Redis connection refused"));

            // Confirm: Throw RedisException (RuntimeException)
            assertThrows(RuntimeException.class, () -> authService.verifyOtp(request));
        }
    }

    @Nested
    @DisplayName("FE-37: resetPassword() Tests")
    class ResetPasswordTests {

        @Test
        @DisplayName("UTCID01 (Normal): Reset Password success - delete OTP")
        void resetPassword_Success() {
            ResetPasswordRequest request = new ResetPasswordRequest("test@example.com", "123456", "newPass");
            when(valueOperations.get("otp:test@example.com")).thenReturn("123456");
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(activeUser));

            authService.resetPassword(request);

            verify(passwordEncoder).encode("newPass");
            verify(redisTemplate).delete("otp:test@example.com");
            verify(userRepository).save(activeUser);
            assertTrue(activeUser.getIsPasswordChanged());
        }
    }
}
