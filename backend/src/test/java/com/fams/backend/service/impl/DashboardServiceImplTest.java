package com.fams.backend.service.impl;

import com.fams.backend.dto.response.DashboardStatsResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.AlertRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.SystemLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    @DisplayName("UTCID-DASH01 (Normal): Get Dashboard Statistics")
    void getStatistics() {
        // Arrange
        when(userRepository.countByRole(User.UserRole.STUDENT)).thenReturn(50L);
        when(userRepository.countByRole(User.UserRole.LECTURER)).thenReturn(10L);
        when(userRepository.count()).thenReturn(60L);

        // Act
        DashboardStatsResponse stats = dashboardService.getStatistics();

        // Assert
        assertEquals(50, stats.getTotalStudents());
        assertEquals(10, stats.getTotalUsers()); // In code totalUsers maps to lecturers display
        assertEquals(60, stats.getTotalAccounts());

        verify(userRepository, times(1)).countByRole(User.UserRole.STUDENT);
        verify(userRepository, times(1)).countByRole(User.UserRole.LECTURER);
        verify(userRepository, times(1)).count();
    }

    @Test
    @DisplayName("UTCID-DASH02 (Boundary): Empty Database")
    void getStatistics_EmptyDatabase() {
        when(userRepository.countByRole(User.UserRole.STUDENT)).thenReturn(0L);
        when(userRepository.countByRole(User.UserRole.LECTURER)).thenReturn(0L);
        when(userRepository.count()).thenReturn(0L);

        DashboardStatsResponse stats = dashboardService.getStatistics();

        assertEquals(0, stats.getTotalStudents());
        assertEquals(0, stats.getTotalUsers());
        assertEquals(0, stats.getTotalAccounts());
    }

    @Test
    @DisplayName("UTCID-DASH03 (Abnormal): Repository Error")
    void getStatistics_RepoError_ThrowsException() {
        when(userRepository.countByRole(any())).thenReturn(0L);
        when(userRepository.count()).thenThrow(new RuntimeException("DB Error"));

        assertThrows(RuntimeException.class, () -> dashboardService.getStatistics());
    }
}
