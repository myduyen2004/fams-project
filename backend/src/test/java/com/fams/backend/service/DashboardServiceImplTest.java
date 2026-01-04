package com.fams.backend.service;

import com.fams.backend.dto.response.*;
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

        when(alertRepository.findTop5ByIsResolvedFalseOrderByCreatedAtDesc())
                .thenReturn(Collections.singletonList(alert));

        List<AlertResponse> results = dashboardService.getAlerts();

        assertFalse(results.isEmpty());
        assertEquals("High Temp", results.get(0).getTitle());
        assertEquals("error", results.get(0).getLevel());
    }

    @Test
    void whenGetNotifications_thenReturnMappedList() {
        Notification notification = new Notification();
        notification.setTitle("New Message");
        notification.setDescription("Hello");
        notification.setCreatedAt(LocalDateTime.now());
        notification.setIsRead(false);

        when(notificationRepository.findTop5ByOrderByCreatedAtDesc())
                .thenReturn(Collections.singletonList(notification));

        List<NotificationResponse> results = dashboardService.getNotifications();

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
