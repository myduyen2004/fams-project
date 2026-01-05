package com.fams.backend.service;

import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.User;
import com.fams.backend.entity.UserSession;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.service.impl.AuthService;
import com.fams.backend.service.impl.AuthService;
import com.fams.backend.service.impl.DashboardBroadcastService;
import com.fams.backend.service.EmailService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit Test for the logout() function in AuthService
 */
@ExtendWith(MockitoExtension.class)
class LogoutTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserSessionRepository userSessionRepository;

    @Mock
    private AccessLogRepository accessLogRepository;

    @Mock
    private DashboardBroadcastService dashboardBroadcastService;

    @Mock
    private EmailService emailService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @InjectMocks
    private AuthService authService;

    @Test
    void whenLogout_thenInvalidateSessions() {
        // Mock Security Context
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("admin");
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);

        // Mock User
        User user = new User();
        user.setId(1L);
        user.setUsername("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        // Mock Session
        UserSession session = new UserSession();
        session.setIsActive(true);
        when(userSessionRepository.findActiveSessionsByUserId(1L)).thenReturn(Collections.singletonList(session));
        when(accessLogRepository.findTopByUserIdOrderByAccessTimeDesc(1L)).thenReturn(Optional.of(new AccessLog()));

        authService.logout();

        assertFalse(session.getIsActive());
        verify(userSessionRepository).saveAll(anyList());
        verify(dashboardBroadcastService).broadcastUpdate();
    }
}
