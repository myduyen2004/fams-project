package com.fams.backend.service.impl;

import com.fams.backend.entity.SystemLog;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemLogServiceTest {

    @Mock
    private SystemLogPersistenceService persistenceService;

    @InjectMocks
    private SystemLogService systemLogService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    // ----------------------------------------------------
    // Function 1: logImportCompleted
    // ----------------------------------------------------
    @Test
    void testLogImportCompleted_FailedCountGreaterThanZero() {
        systemLogService.logImportCompleted("admin", 10, 5, "users.xlsx");
        verify(persistenceService).saveLogEntry(
                eq("Import hoàn tất (có lỗi)"),
                eq("Admin admin đã import từ 'users.xlsx': 10 thành công, 5 thất bại"),
                eq(SystemLog.LogType.WARNING),
                eq("UserImport"),
                eq("admin"),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogImportCompleted_FailedCountZero() {
        systemLogService.logImportCompleted("admin", 10, 0, "users.xlsx");
        verify(persistenceService).saveLogEntry(
                eq("Import hoàn tất"),
                eq("Admin admin đã import thành công 10 người dùng từ 'users.xlsx'"),
                eq(SystemLog.LogType.SUCCESS),
                eq("UserImport"),
                eq("admin"),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogImportCompleted_ZeroSuccessZeroFail() {
        systemLogService.logImportCompleted("admin2", 0, 0, "empty.xlsx");
        verify(persistenceService).saveLogEntry(
                eq("Import hoàn tất"),
                eq("Admin admin2 đã import thành công 0 người dùng từ 'empty.xlsx'"),
                eq(SystemLog.LogType.SUCCESS),
                eq("UserImport"),
                eq("admin2"),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogImportCompleted_NegativeFail() {
        systemLogService.logImportCompleted("admin", 10, -1, "users.xlsx");
        // Due to failedCount > 0 condition check, it goes to SUCCESS
        verify(persistenceService).saveLogEntry(
                eq("Import hoàn tất"),
                eq("Admin admin đã import thành công 10 người dùng từ 'users.xlsx'"),
                eq(SystemLog.LogType.SUCCESS),
                eq("UserImport"),
                eq("admin"),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogImportCompleted_NullFilename() {
        systemLogService.logImportCompleted("admin", 5, 1, null);
        verify(persistenceService).saveLogEntry(
                eq("Import hoàn tất (có lỗi)"),
                eq("Admin admin đã import từ 'null': 5 thành công, 1 thất bại"),
                eq(SystemLog.LogType.WARNING),
                eq("UserImport"),
                eq("admin"),
                any(), any(), any(), any()
        );
    }

    // ----------------------------------------------------
    // Function 2: logLecturerImportCompleted
    // ----------------------------------------------------
    @Test
    void testLogLecturerImportCompleted_WithFailAndAuth() {
        setupSecurityContext("lecturerAdmin");
        systemLogService.logLecturerImportCompleted(5, 5, 2);
        verify(persistenceService).saveLogEntry(
                eq("Import giảng viên (có lỗi)"),
                eq("Import giảng viên: 5 tạo mới, 5 cập nhật, 2 thất bại"),
                eq(SystemLog.LogType.WARNING),
                eq("LecturerImport"),
                eq("lecturerAdmin"),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogLecturerImportCompleted_NoFailAndAuth() {
        setupSecurityContext("lecturerAdmin");
        systemLogService.logLecturerImportCompleted(10, 0, 0);
        verify(persistenceService).saveLogEntry(
                eq("Import giảng viên thành công"),
                eq("Import giảng viên: 10 tạo mới, 0 cập nhật"),
                eq(SystemLog.LogType.SUCCESS),
                eq("LecturerImport"),
                eq("lecturerAdmin"),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogLecturerImportCompleted_NoAuthContext() {
        // No security context setup -> performer is null
        systemLogService.logLecturerImportCompleted(5, 0, 1);
        verify(persistenceService).saveLogEntry(
                eq("Import giảng viên (có lỗi)"),
                eq("Import giảng viên: 5 tạo mới, 0 cập nhật, 1 thất bại"),
                eq(SystemLog.LogType.WARNING),
                eq("LecturerImport"),
                isNull(),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogLecturerImportCompleted_AuthThrowsException() {
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenThrow(new RuntimeException("Error"));
        SecurityContextHolder.setContext(securityContext);

        systemLogService.logLecturerImportCompleted(5, 0, 0);
        verify(persistenceService).saveLogEntry(
                eq("Import giảng viên thành công"),
                eq("Import giảng viên: 5 tạo mới, 0 cập nhật"),
                eq(SystemLog.LogType.SUCCESS),
                eq("LecturerImport"),
                isNull(),
                any(), any(), any(), any()
        );
    }

    @Test
    void testLogLecturerImportCompleted_NullAuth() {
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(securityContext);

        systemLogService.logLecturerImportCompleted(2, 2, 0);
        verify(persistenceService).saveLogEntry(
                eq("Import giảng viên thành công"),
                eq("Import giảng viên: 2 tạo mới, 2 cập nhật"),
                eq(SystemLog.LogType.SUCCESS),
                eq("LecturerImport"),
                isNull(),
                any(), any(), any(), any()
        );
    }

    // ----------------------------------------------------
    // Function 3: log() (Core function testing IP/UA resolve)
    // ----------------------------------------------------
    @Test
    void testLog_NoRequestAttributes() {
        // RequestContextHolder has no attributes -> null ip/ua
        systemLogService.logInfo("Title", "Desc", "Src");
        verify(persistenceService).saveLogEntry(
                eq("Title"), eq("Desc"), eq(SystemLog.LogType.INFO), eq("Src"), isNull(),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    @Test
    void testLog_WithRequestAttributesAndXForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "192.168.1.5");
        request.addHeader("User-Agent", "Chrome");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        systemLogService.logInfo("Title", "Desc", "Src");
        verify(persistenceService).saveLogEntry(
                eq("Title"), eq("Desc"), eq(SystemLog.LogType.INFO), eq("Src"), isNull(),
                eq("192.168.1.5"), eq("Chrome"), isNull(), isNull()
        );
    }

    @Test
    void testLog_WithRequestAttributesNoXForwardedFor() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        request.addHeader("User-Agent", "Firefox");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        systemLogService.logInfo("Title", "Desc", "Src");
        verify(persistenceService).saveLogEntry(
                eq("Title"), eq("Desc"), eq(SystemLog.LogType.INFO), eq("Src"), isNull(),
                eq("10.0.0.1"), eq("Firefox"), isNull(), isNull()
        );
    }

    @Test
    void testLog_WithRequestAttributesXForwardedForUnknown() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "unknown");
        request.setRemoteAddr("10.0.0.2");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        systemLogService.logInfo("Title", "Desc", "Src");
        verify(persistenceService).saveLogEntry(
                eq("Title"), eq("Desc"), eq(SystemLog.LogType.INFO), eq("Src"), isNull(),
                eq("10.0.0.2"), isNull(), isNull(), isNull()
        );
    }

    @Test
    void testLog_RequestAttributesExceptionHandling() {
        // We mock ServletRequestAttributes but it throws error on getRequest()
        ServletRequestAttributes attrs = mock(ServletRequestAttributes.class);
        when(attrs.getRequest()).thenThrow(new RuntimeException("No Request"));
        RequestContextHolder.setRequestAttributes(attrs);

        systemLogService.logInfo("Title", "Desc", "Src");
        verify(persistenceService).saveLogEntry(
                eq("Title"), eq("Desc"), eq(SystemLog.LogType.INFO), eq("Src"), isNull(),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    // ----------------------------------------------------
    // Function 4: logRoomDeleted
    // ----------------------------------------------------
    @Test
    void testLogRoomDeleted_ValidUser() {
        setupSecurityContext("roomAdmin");
        systemLogService.logRoomDeleted(101L);
        verify(persistenceService).saveLogEntry(
                eq("Xóa phòng học"),
                eq("Đã xóa phòng học ID: 101"),
                eq(SystemLog.LogType.WARNING),
                eq("RoomManagement"),
                eq("roomAdmin"),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    @Test
    void testLogRoomDeleted_NullContextUser() {
        systemLogService.logRoomDeleted(102L);
        verify(persistenceService).saveLogEntry(
                eq("Xóa phòng học"),
                eq("Đã xóa phòng học ID: 102"),
                eq(SystemLog.LogType.WARNING),
                eq("RoomManagement"),
                isNull(),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    @Test
    void testLogRoomDeleted_ExceptionUser() {
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenThrow(new RuntimeException("Auth fail"));
        SecurityContextHolder.setContext(context);

        systemLogService.logRoomDeleted(-1L);
        verify(persistenceService).saveLogEntry(
                eq("Xóa phòng học"),
                eq("Đã xóa phòng học ID: -1"),
                eq(SystemLog.LogType.WARNING),
                eq("RoomManagement"),
                isNull(),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    @Test
    void testLogRoomDeleted_NullAuthentication() {
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(context);

        systemLogService.logRoomDeleted(0L);
        verify(persistenceService).saveLogEntry(
                eq("Xóa phòng học"),
                eq("Đã xóa phòng học ID: 0"),
                eq(SystemLog.LogType.WARNING),
                eq("RoomManagement"),
                isNull(),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    @Test
    void testLogRoomDeleted_MaxId() {
        setupSecurityContext("systemAdmin");
        systemLogService.logRoomDeleted(Long.MAX_VALUE);
        verify(persistenceService).saveLogEntry(
                eq("Xóa phòng học"),
                eq("Đã xóa phòng học ID: " + Long.MAX_VALUE),
                eq(SystemLog.LogType.WARNING),
                eq("RoomManagement"),
                eq("systemAdmin"),
                isNull(), isNull(), isNull(), isNull()
        );
    }

    private void setupSecurityContext(String username) {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn(username);
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(context);
    }

}
