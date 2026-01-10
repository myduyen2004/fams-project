package com.fams.backend.service.impl;

import com.fams.backend.entity.SystemLog;
import com.fams.backend.repository.SystemLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemLogService {

    private final SystemLogRepository systemLogRepository;

    @Async
    public void logInfo(String title, String description, String source) {
        log(title, description, SystemLog.LogType.INFO, source);
    }

    @Async
    public void logSuccess(String title, String description, String source) {
        log(title, description, SystemLog.LogType.SUCCESS, source);
    }

    @Async
    public void logWarning(String title, String description, String source) {
        log(title, description, SystemLog.LogType.WARNING, source);
    }

    @Async
    public void logError(String title, String description, String source) {
        log(title, description, SystemLog.LogType.ERROR, source);
    }

    private void log(String title, String description, SystemLog.LogType type, String source) {
        try {
            SystemLog logEntry = SystemLog.builder()
                    .title(title)
                    .description(description)
                    .type(type)
                    .source(source)
                    .build();
            systemLogRepository.save(logEntry);
            log.debug("System log saved: {} - {}", title, type);
        } catch (Exception e) {
            log.error("Failed to save system log: {}", e.getMessage(), e);
        }
    }

    // Convenience methods for user operations
    public void logUserCreated(String adminUsername, String userCode, String userName) {
        logSuccess(
                "Tạo người dùng mới",
                String.format("Admin %s đã tạo tài khoản mới cho %s (Mã: %s)", adminUsername, userName, userCode),
                "UserManagement");
    }

    public void logUserUpdated(String adminUsername, String userCode, String userName) {
        logInfo(
                "Cập nhật người dùng",
                String.format("Admin %s đã cập nhật thông tin cho %s (Mã: %s)", adminUsername, userName, userCode),
                "UserManagement");
    }

    public void logUserDeleted(String adminUsername, String userCode) {
        logWarning(
                "Xóa người dùng",
                String.format("Admin %s đã xóa tài khoản có mã: %s", adminUsername, userCode),
                "UserManagement");
    }

    public void logUsersActivated(String adminUsername, int count) {
        logSuccess(
                "Kích hoạt người dùng",
                String.format("Admin %s đã kích hoạt %d tài khoản người dùng", adminUsername, count),
                "UserManagement");
    }

    public void logPasswordChanged(String username) {
        logInfo(
                "Đổi mật khẩu",
                String.format("Người dùng %s đã thay đổi mật khẩu", username),
                "Authentication");
    }

    public void logImportStarted(String adminUsername, String filename, String mode) {
        logInfo(
                "Bắt đầu import người dùng",
                String.format("Admin %s đã bắt đầu import từ file '%s' (Chế độ: %s)", adminUsername, filename, mode),
                "UserImport");
    }

    public void logImportCompleted(String adminUsername, int successCount, int failedCount, String filename) {
        if (failedCount > 0) {
            logWarning(
                    "Import hoàn tất (có lỗi)",
                    String.format("Admin %s đã import từ '%s': %d thành công, %d thất bại",
                            adminUsername, filename, successCount, failedCount),
                    "UserImport");
        } else {
            logSuccess(
                    "Import hoàn tất",
                    String.format("Admin %s đã import thành công %d người dùng từ '%s'",
                            adminUsername, successCount, filename),
                    "UserImport");
        }
    }

    public void logImportFailed(String adminUsername, String filename, String error) {
        logError(
                "Import thất bại",
                String.format("Admin %s import từ '%s' thất bại: %s", adminUsername, filename, error),
                "UserImport");
    }
}
