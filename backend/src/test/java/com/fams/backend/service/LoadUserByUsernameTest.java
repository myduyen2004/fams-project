package com.fams.backend.service;

import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.impl.AuthService;
import com.fams.backend.service.impl.DashboardBroadcastService;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.UserSessionRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.fams.backend.security.jwt.JwtUtil;
import com.fams.backend.service.impl.SystemLogService;
import com.fams.backend.repository.UserPermissionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit Test for the loadUserByUsername() function in AuthService
 */
@ExtendWith(MockitoExtension.class)
class LoadUserByUsernameTest {

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
    private SystemLogService systemLogService;
    @Mock
    private UserPermissionRepository userPermissionRepository;

    @InjectMocks
    private AuthService authService;

    @Test
    void whenUsernameExists_thenReturnUserDetails() {
        User user = new User();
        user.setId(1L);
        user.setUsername("admin");
        user.setPassword("pass");
        user.setRole(User.UserRole.ADMIN);

        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
        when(userPermissionRepository.findPermissionsByUserId(1L)).thenReturn(java.util.Collections.emptyList());

        UserDetails userDetails = authService.loadUserByUsername("admin");

        assertNotNull(userDetails);
        assertEquals("admin", userDetails.getUsername());
    }

    @Test
    void whenUsernameDoesNotExist_thenThrowUsernameNotFoundException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> authService.loadUserByUsername("unknown"));
    }
}
