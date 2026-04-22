package com.fams.backend.service;

import com.fams.backend.dto.request.LoginRequest;
import com.fams.backend.dto.response.LoginResponse;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.UnauthorizedException;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.security.jwt.JwtUtil;
import com.fams.backend.repository.UserPermissionRepository;
import com.fams.backend.service.impl.AlertService;
import com.fams.backend.service.impl.AuthService;
import com.fams.backend.service.impl.DashboardBroadcastService;
import com.fams.backend.service.impl.SystemLogService;
import org.springframework.data.redis.core.ValueOperations;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit Test for the login() function in AuthService
 */
@ExtendWith(MockitoExtension.class)
class LoginTest {

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
    private HttpServletRequest httpServletRequest;

    @Mock
    private SystemLogService systemLogService;

    @Mock
    private UserPermissionRepository userPermissionRepository;

    @Mock
    private AlertService alertService;

    private AuthService authService;

    private LoginRequest loginRequest;
    private User testUser;

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
            systemLogService,
            userPermissionRepository,
            alertService
        );

        loginRequest = new LoginRequest();
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("admin");
        testUser.setPassword("encodedPassword");
        testUser.setStatus(User.UserStatus.ACTIVE);
        testUser.setRole(User.UserRole.ADMIN);
    }

    @Test
    void whenLoginWithEmptyUsername_thenThrowBadRequestException() {
        loginRequest.setUsername("");
        loginRequest.setPassword("password123");
        when(httpServletRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        GeoLocationService.LocationData mockLocation = mock(GeoLocationService.LocationData.class);
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mockLocation);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.login(loginRequest, httpServletRequest));

        assertEquals("Username không được để trống", exception.getMessage());
    }

    @Test
    void whenLoginWithEmptyPassword_thenThrowBadRequestException() {
        loginRequest.setUsername("admin");
        loginRequest.setPassword("");
        when(httpServletRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        GeoLocationService.LocationData mockLocation = mock(GeoLocationService.LocationData.class);
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mockLocation);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> authService.login(loginRequest, httpServletRequest));

        assertEquals("Password không được để trống", exception.getMessage());
    }

    @Test
    void whenLoginSuccess_thenReturnLoginResponse() {
        loginRequest.setUsername("admin");
        loginRequest.setPassword("password123");

        when(userRepository.findByUsernameWithProfiles("admin")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtUtil.generateToken("admin")).thenReturn("mock-jwt-token");

        when(httpServletRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        when(httpServletRequest.getHeader("User-Agent")).thenReturn("Test-Agent");
        GeoLocationService.LocationData mockLocation = mock(GeoLocationService.LocationData.class);
        when(mockLocation.getProvince()).thenReturn("Hanoi");
        when(mockLocation.getCity()).thenReturn("Hanoi");
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mockLocation);

        LoginResponse response = authService.login(loginRequest, httpServletRequest);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.getToken());
        verify(dashboardBroadcastService).broadcastUpdate();
    }

    @Test
    void whenLoginWithWrongPassword_thenThrowUnauthorizedException() {
        loginRequest.setUsername("admin");
        loginRequest.setPassword("wrongPassword");

        when(userRepository.findByUsernameWithProfiles("admin")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);
        when(httpServletRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        GeoLocationService.LocationData mockLocation = mock(GeoLocationService.LocationData.class);
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mockLocation);

        UnauthorizedException exception = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginRequest, httpServletRequest));

        assertEquals("Tài khoản hoặc mật khẩu không đúng", exception.getMessage());
    }

    @Test
    void whenLoginWithInactiveUser_thenThrowUnauthorizedException() {
        loginRequest.setUsername("admin");
        loginRequest.setPassword("password123");
        testUser.setStatus(User.UserStatus.INACTIVE);

        when(userRepository.findByUsernameWithProfiles("admin")).thenReturn(Optional.of(testUser));
        when(httpServletRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        GeoLocationService.LocationData mockLocation = mock(GeoLocationService.LocationData.class);
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mockLocation);

        UnauthorizedException exception = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginRequest, httpServletRequest));

        assertEquals("Tài khoản đã bị vô hiệu hóa", exception.getMessage());
    }

    @Test
    void whenLoginWithLockedUser_thenThrowUnauthorizedException() {
        loginRequest.setUsername("admin");
        loginRequest.setPassword("password123");
        testUser.setStatus(User.UserStatus.LOCKED);

        when(userRepository.findByUsernameWithProfiles("admin")).thenReturn(Optional.of(testUser));
        when(httpServletRequest.getHeader("X-Forwarded-For")).thenReturn("127.0.0.1");
        GeoLocationService.LocationData mockLocation = mock(GeoLocationService.LocationData.class);
        when(geoLocationService.getLocationFromIP(anyString())).thenReturn(mockLocation);

        UnauthorizedException exception = assertThrows(UnauthorizedException.class,
                () -> authService.login(loginRequest, httpServletRequest));

        assertEquals("Tài khoản đã bị khóa. Vui lòng liên hệ admin", exception.getMessage());
    }
}
