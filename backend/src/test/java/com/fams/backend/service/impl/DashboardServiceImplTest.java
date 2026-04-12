package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AlertResponse;
import com.fams.backend.dto.response.DashboardNotificationResponse;
import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.dto.response.RecentAccessResponse;
import com.fams.backend.dto.response.SystemLogResponse;
import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.Alert;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.AlertRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.SystemLogRepository;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.UserNotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

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
    private SystemLogRepository systemLogRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserNotificationService notificationService;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ==============================================================
    // 1. View Access Log (getRecentAccess) -> 5 test cases
    // ==============================================================

    @Test
    void testGetRecentAccess_RoleStudent() {
        AccessLog log = createMockAccessLog(User.UserRole.STUDENT);
        when(accessLogRepository.findTop10ByOrderByAccessTimeDesc()).thenReturn(List.of(log));
        List<RecentAccessResponse> result = dashboardService.getRecentAccess();
        assertEquals(1, result.size());
        assertEquals("Sinh viên", result.get(0).getRole());
    }

    @Test
    void testGetRecentAccess_RoleLecturer() {
        AccessLog log = createMockAccessLog(User.UserRole.LECTURER);
        when(accessLogRepository.findTop10ByOrderByAccessTimeDesc()).thenReturn(List.of(log));
        List<RecentAccessResponse> result = dashboardService.getRecentAccess();
        assertEquals("Giảng viên", result.get(0).getRole());
    }

    @Test
    void testGetRecentAccess_RoleAdmin() {
        AccessLog log = createMockAccessLog(User.UserRole.ADMIN);
        when(accessLogRepository.findTop10ByOrderByAccessTimeDesc()).thenReturn(List.of(log));
        List<RecentAccessResponse> result = dashboardService.getRecentAccess();
        assertEquals("Quản trị viên", result.get(0).getRole());
    }

    @Test
    void testGetRecentAccess_RoleAcademicStaff() {
        AccessLog log = createMockAccessLog(User.UserRole.ACADEMIC_STAFF);
        when(accessLogRepository.findTop10ByOrderByAccessTimeDesc()).thenReturn(List.of(log));
        List<RecentAccessResponse> result = dashboardService.getRecentAccess();
        assertEquals("Phòng đào tạo", result.get(0).getRole());
    }

    @Test
    void testGetRecentAccess_EmptyList() {
        when(accessLogRepository.findTop10ByOrderByAccessTimeDesc()).thenReturn(Collections.emptyList());
        List<RecentAccessResponse> result = dashboardService.getRecentAccess();
        assertTrue(result.isEmpty());
    }

    private AccessLog createMockAccessLog(User.UserRole role) {
        User user = User.builder().email("test@fpt.edu.vn").role(role).build();
        AccessLog log = new AccessLog();
        log.setUser(user);
        log.setAccessTime(LocalDateTime.now());
        return log;
    }

    // ==============================================================
    // 2. View System Log (getSystemLogs) -> 5 test cases
    // ==============================================================

    @Test
    void testGetSystemLogs_SuccessLog() {
        SystemLog log = createMockSystemLog(SystemLog.LogType.SUCCESS);
        when(systemLogRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(log));
        List<SystemLogResponse> result = dashboardService.getSystemLogs();
        assertEquals(1, result.size());
        assertEquals("success", result.get(0).getType());
    }

    @Test
    void testGetSystemLogs_InfoLog() {
        SystemLog log = createMockSystemLog(SystemLog.LogType.INFO);
        when(systemLogRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(log));
        List<SystemLogResponse> result = dashboardService.getSystemLogs();
        assertEquals("info", result.get(0).getType());
    }

    @Test
    void testGetSystemLogs_WarningLog() {
        SystemLog log = createMockSystemLog(SystemLog.LogType.WARNING);
        when(systemLogRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(log));
        List<SystemLogResponse> result = dashboardService.getSystemLogs();
        assertEquals("warning", result.get(0).getType());
    }

    @Test
    void testGetSystemLogs_ErrorLog() {
        SystemLog log = createMockSystemLog(SystemLog.LogType.ERROR);
        when(systemLogRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(log));
        List<SystemLogResponse> result = dashboardService.getSystemLogs();
        assertEquals("error", result.get(0).getType());
    }

    @Test
    void testGetSystemLogs_EmptyList() {
        when(systemLogRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());
        List<SystemLogResponse> result = dashboardService.getSystemLogs();
        assertTrue(result.isEmpty());
    }

    private SystemLog createMockSystemLog(SystemLog.LogType type) {
        SystemLog log = new SystemLog();
        log.setType(type);
        log.setCreatedAt(LocalDateTime.now());
        return log;
    }

    // ==============================================================
    // 3. View Alerts (getAlerts) -> 5 test cases
    // ==============================================================

    @Test
    void testGetAlerts_InfoLevel() {
        Alert alert = createMockAlert(Alert.AlertLevel.INFO);
        when(alertRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(alert));
        List<AlertResponse> result = dashboardService.getAlerts();
        assertEquals(1, result.size());
        assertEquals("info", result.get(0).getLevel());
    }

    @Test
    void testGetAlerts_WarningLevel() {
        Alert alert = createMockAlert(Alert.AlertLevel.WARNING);
        when(alertRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(alert));
        List<AlertResponse> result = dashboardService.getAlerts();
        assertEquals("warning", result.get(0).getLevel());
    }

    @Test
    void testGetAlerts_CriticalLevel() {
        Alert alert = createMockAlert(Alert.AlertLevel.CRITICAL);
        when(alertRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(alert));
        List<AlertResponse> result = dashboardService.getAlerts();
        assertEquals("critical", result.get(0).getLevel());
    }

    @Test
    void testGetAlerts_EmptyList() {
        when(alertRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(Collections.emptyList());
        List<AlertResponse> result = dashboardService.getAlerts();
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetAlerts_MultipleAlerts() {
        Alert alert1 = createMockAlert(Alert.AlertLevel.WARNING);
        Alert alert2 = createMockAlert(Alert.AlertLevel.INFO);
        when(alertRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(alert1, alert2));
        List<AlertResponse> result = dashboardService.getAlerts();
        assertEquals(2, result.size());
        assertEquals("warning", result.get(0).getLevel());
        assertEquals("info", result.get(1).getLevel());
    }

    private Alert createMockAlert(Alert.AlertLevel level) {
        Alert alert = new Alert();
        alert.setLevel(level);
        alert.setCreatedAt(LocalDateTime.now());
        return alert;
    }

    // ==============================================================
    // 4. View System Notifications (getNotificationById) -> 5 test cases
    // ==============================================================

    private void setupSecurityContext(String username) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn("testuser principal");
        when(auth.getName()).thenReturn(username);
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);
    }

    @Test
    void testGetNotificationById_Unauthenticated() {
        // No SecurityContext set
        NotFoundException ex = assertThrows(NotFoundException.class, () -> dashboardService.getNotificationById(1L));
        assertEquals("Người dùng chưa xác thực", ex.getMessage());
    }

    @Test
    void testGetNotificationById_UserNotFound() {
        setupSecurityContext("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());

        NotFoundException ex = assertThrows(NotFoundException.class, () -> dashboardService.getNotificationById(1L));
        assertEquals("Người dùng không tìm thấy", ex.getMessage());
    }

    @Test
    void testGetNotificationById_ReadPersonalNotification() {
        setupSecurityContext("student1");
        User user = new User();
        user.setRole(User.UserRole.STUDENT);
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user));

        NotificationResponse personalNotif = NotificationResponse.builder()
                .id(1L)
                .title("Personal Notif")
                .isRead(true)
                .build();
        when(notificationService.getMyNotificationById(1L)).thenReturn(Optional.of(personalNotif));

        DashboardNotificationResponse result = dashboardService.getNotificationById(1L);
        assertEquals("Personal Notif", result.getTitle());
        assertTrue(result.getIsRead());
    }

    @Test
    void testGetNotificationById_AdminFallbackToGlobalNotification() {
        setupSecurityContext("admin1");
        User user = new User();
        user.setRole(User.UserRole.ADMIN);
        when(userRepository.findByUsername("admin1")).thenReturn(Optional.of(user));

        // Not present in personal notifications
        when(notificationService.getMyNotificationById(1L)).thenReturn(Optional.empty());

        Notification globalNotif = new Notification();
        globalNotif.setId(1L);
        globalNotif.setTitle("Global System Alert");
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(globalNotif));

        DashboardNotificationResponse result = dashboardService.getNotificationById(1L);
        assertEquals("Global System Alert", result.getTitle());
        assertTrue(result.getIsRead());
        assertEquals("Hệ thống", result.getSenderFullName());
    }

    @Test
    void testGetNotificationById_StudentUnauthorizedFallback() {
        setupSecurityContext("student1");
        User user = new User();
        user.setRole(User.UserRole.STUDENT);
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user));

        // Not present in personal notifications
        when(notificationService.getMyNotificationById(1L)).thenReturn(Optional.empty());

        // Since role is STUDENT and it's not a personal notification, throws exception
        NotFoundException ex = assertThrows(NotFoundException.class, () -> dashboardService.getNotificationById(1L));
        assertEquals("Không tìm thấy thông báo hoặc bạn không có quyền xem", ex.getMessage());
    }
}
