package com.fams.backend.service;

import com.fams.backend.dto.response.*;
import com.fams.backend.dto.response.DashboardNotificationResponse;
import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.Alert;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.repository.*;
import com.fams.backend.service.impl.DashboardServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AccessLogRepository accessLogRepository;
    @Mock
    private AlertRepository alertRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationRecipientRepository notificationRecipientRepository;
    @Mock
    private SystemLogRepository systemLogRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void whenGetStatistics_thenReturnCorrectCounts() {
        when(userRepository.countByRole(User.UserRole.STUDENT)).thenReturn(50L);
        when(userRepository.countByRole(User.UserRole.LECTURER)).thenReturn(10L);
        when(userRepository.count()).thenReturn(60L);

        DashboardStatsResponse stats = dashboardService.getStatistics();

        assertEquals(50, stats.getTotalStudents());
        assertEquals(10, stats.getTotalUsers());
        assertEquals(60, stats.getTotalAccounts());
    }

    @Test
    void whenGetRecentAccess_thenReturnMappedList() {
        User user = new User();
        user.setEmail("test@fams.com");
        user.setRole(User.UserRole.ADMIN);

        AccessLog log = new AccessLog();
        log.setUser(user);
        log.setAccessTime(LocalDateTime.now());
        log.setLocation("Hanoi");
        log.setStatus("Success");

        when(accessLogRepository.findTop10ByOrderByAccessTimeDesc()).thenReturn(Collections.singletonList(log));

        List<RecentAccessResponse> results = dashboardService.getRecentAccess();

        assertFalse(results.isEmpty());
        assertEquals("test@fams.com", results.get(0).getEmail());
        assertEquals("Quản trị viên", results.get(0).getRole());
    }

    @Test
    void whenGetAlerts_thenReturnMappedList() {
        Alert alert = new Alert();
        alert.setTitle("High Temp");
        alert.setDescription("Too hot");
        alert.setCreatedAt(LocalDateTime.now());
        alert.setLevel(Alert.AlertLevel.ERROR);

        when(alertRepository.findTop5ByOrderByCreatedAtDesc())
                .thenReturn(Collections.singletonList(alert));

        List<AlertResponse> results = dashboardService.getAlerts();

        assertFalse(results.isEmpty());
        assertEquals("High Temp", results.get(0).getTitle());
        assertEquals("error", results.get(0).getLevel());
    }

    @Test
    void whenGetNotifications_thenReturnMappedList() {
        // Arrange
        String username = "testuser";
        User user = new User();
        user.setUsername(username);

        // Mock Security Context
        org.springframework.security.core.Authentication authentication = mock(
                org.springframework.security.core.Authentication.class);
        org.springframework.security.core.context.SecurityContext securityContext = mock(
                org.springframework.security.core.context.SecurityContext.class);
        org.springframework.security.core.context.SecurityContextHolder.setContext(securityContext);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(username);
        when(userRepository.findByUsername(username)).thenReturn(java.util.Optional.of(user));

        Notification notification = new Notification();
        notification.setTitle("New Message");
        notification.setContent("Hello");
        notification.setType(Notification.NotificationType.SYSTEM);
        notification.setStatus(Notification.NotificationStatus.SENT);
        notification.setCreatedAt(LocalDateTime.now());

        com.fams.backend.entity.NotificationRecipient recipient = com.fams.backend.entity.NotificationRecipient
                .builder()
                .notification(notification)
                .recipient(user)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        // Use findByRecipientOrderByCreatedAtDesc as per Service implementation
        when(notificationRecipientRepository.findByRecipientOrderByCreatedAtDesc(user))
                .thenReturn(Collections.singletonList(recipient));

        // Act
        List<DashboardNotificationResponse> results = dashboardService.getNotifications();

        // Assert
        assertFalse(results.isEmpty());
        assertEquals("New Message", results.get(0).getTitle());
        assertFalse(results.get(0).getIsRead());
    }

    @Test
    void whenGetSystemLogs_thenReturnMappedList() {
        SystemLog log = new SystemLog();
        log.setTitle("System Start");
        log.setDescription("Booting up");
        log.setCreatedAt(LocalDateTime.now());
        log.setType(SystemLog.LogType.INFO);

        when(systemLogRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(Collections.singletonList(log));

        List<SystemLogResponse> results = dashboardService.getSystemLogs();

        assertFalse(results.isEmpty());
        assertEquals("System Start", results.get(0).getTitle());
        assertEquals("info", results.get(0).getType());
    }
}
