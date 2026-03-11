package com.fams.backend.service.impl;

import com.fams.backend.dto.request.LoginRequest;
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
import jakarta.servlet.http.HttpServletRequest;
import com.fams.backend.service.UserActivityService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
    @Mock
    private SystemLogService systemLogService;
    @Mock
    private UserActivityService userActivityService;

    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.increment(anyString())).thenReturn(1L);
        
        authService = new AuthService(
            userRepository,
            passwordEncoder,
            jwtUtil,
            userSessionRepository,
            accessLogRepository,
            geoLocationService,
            dashboardBroadcastService,
            emailService,
            redisTemplate,
            userActivityService,
            systemLogService
        );

        activeUser = User.builder()
                .id(1L)
                .username("testuser")
                .password("encodedPassword")
                .status(User.UserStatus.ACTIVE)
                .role(User.UserRole.ADMIN)
                .build();
    }

    @Test
    @DisplayName("UTCID01 (Normal): Login thành công với thông tin hợp lệ")
    void login_Success() {
        // Arrange
        LoginRequest request = new LoginRequest("testuser", "password123");
        when(userRepository.findByUsernameWithProfiles("testuser")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtUtil.generateToken(anyString())).thenReturn("mocked-jwt-token");
        // Mocking IP and GeoLocation to avoid NullPointerException in helper methods
        when(httpRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        when(httpRequest.getHeader("User-Agent")).thenReturn("Test-Agent");
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mock(GeoLocationService.LocationData.class));

        // Act
        LoginResponse response = authService.login(request, httpRequest);

        // Assert
        assertNotNull(response);
        assertEquals("mocked-jwt-token", response.getToken());
        verify(dashboardBroadcastService, times(1)).broadcastUpdate();
        verify(userRepository, times(1)).findByUsernameWithProfiles("testuser");
    }

    @Test
    @DisplayName("UTCID02 (Abnormal): Tên đăng nhập trống")
    void login_EmptyUsername() {
        // Arrange
        LoginRequest request = new LoginRequest("", "password123");
        when(httpRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mock(GeoLocationService.LocationData.class));

        // Act & Assert
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.login(request, httpRequest));
        assertEquals("Username không được để trống", exception.getMessage());
    }

    @Test
    @DisplayName("UTCID03 (Abnormal): Sai mật khẩu")
    void login_InvalidPassword() {
        // Arrange
        LoginRequest request = new LoginRequest("testuser", "wrong-pass");
        when(userRepository.findByUsernameWithProfiles("testuser")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("wrong-pass", "encodedPassword")).thenReturn(false);
        when(httpRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mock(GeoLocationService.LocationData.class));

        // Act & Assert
        UnauthorizedException exception = assertThrows(UnauthorizedException.class,
                () -> authService.login(request, httpRequest));
        assertEquals("Tài khoản hoặc mật khẩu không đúng", exception.getMessage());
    }

    @Test
    @DisplayName("UTCID04 (Abnormal): Tài khoản bị khóa")
    void login_LockedAccount() {
        // Arrange
        activeUser.setStatus(User.UserStatus.LOCKED);
        LoginRequest request = new LoginRequest("testuser", "password123");
        when(userRepository.findByUsernameWithProfiles("testuser")).thenReturn(Optional.of(activeUser));
        when(httpRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mock(GeoLocationService.LocationData.class));

        // Act & Assert
        UnauthorizedException exception = assertThrows(UnauthorizedException.class,
                () -> authService.login(request, httpRequest));
        assertTrue(exception.getMessage().contains("Tài khoản đã bị khóa"));
    }
}
