package com.fams.backend.service.impl;

import com.fams.backend.entity.SystemLog;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemLogService {

    private final SystemLogPersistenceService persistenceService;

    public void logInfo(String title, String description, String source) {
        log(title, description, SystemLog.LogType.INFO, source, null, null, null);
    }

    public void logInfo(String title, String description, String source, String performerUsername) {
        log(title, description, SystemLog.LogType.INFO, source, performerUsername, null, null);
    }

    public void logSuccess(String title, String description, String source) {
        log(title, description, SystemLog.LogType.SUCCESS, source, null, null, null);
    }

    public void logSuccess(String title, String description, String source, String performerUsername) {
        log(title, description, SystemLog.LogType.SUCCESS, source, performerUsername, null, null);
    }

    public void logWarning(String title, String description, String source) {
        log(title, description, SystemLog.LogType.WARNING, source, null, null, null);
    }

    public void logWarning(String title, String description, String source, String performerUsername) {
        log(title, description, SystemLog.LogType.WARNING, source, performerUsername, null, null);
    }

    public void logError(String title, String description, String source) {
        log(title, description, SystemLog.LogType.ERROR, source, null, null, null);
    }

    public void logError(String title, String description, String source, String performerUsername) {
        log(title, description, SystemLog.LogType.ERROR, source, performerUsername, null, null);
    }

    public void log(String title, String description, SystemLog.LogType type, String source, String performerUsername,
            String oldValue, String newValue) {
        RequestMetadata meta = getRequestMetadata();
        persistenceService.saveLogEntry(title, description, type, source, performerUsername, meta.ip(), meta.ua(),
                oldValue, newValue);
    }

    private RequestMetadata getRequestMetadata() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder
                    .getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                String ua = request.getHeader("User-Agent");
                return new RequestMetadata(ip, ua);
            }
        } catch (Exception e) {
            // Context might not be available in non-request threads
        }
        return new RequestMetadata(null, null);
    }

    private record RequestMetadata(String ip, String ua) {
    }

    private String getCurrentUsername() {
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                return auth.getName();
            }
        } catch (Exception e) {
            log.warn("Could not get current username for logging: {}", e.getMessage());
        }
        return null;
    }

    // ==================== USER MANAGEMENT ====================
    public void logUserCreated(String adminUsername, String userCode, String userName) {
        logSuccess(
                "Tạo người dùng mới",
                String.format("Admin %s đã tạo tài khoản mới cho %s (Mã: %s)", adminUsername, userName, userCode),
                "UserManagement",
                adminUsername);
    }

    public void logUserUpdated(String adminUsername, String userCode, String userName) {
        logInfo(
                "Cập nhật người dùng",
                String.format("Admin %s đã cập nhật thông tin cho %s (Mã: %s)", adminUsername, userName, userCode),
                "UserManagement",
                adminUsername);
    }

    public void logUserDeleted(String adminUsername, String userCode) {
        logWarning(
                "Xóa người dùng",
                String.format("Admin %s đã xóa tài khoản có mã: %s", adminUsername, userCode),
                "UserManagement",
                adminUsername);
    }

    public void logUsersActivated(String adminUsername, int count) {
        logSuccess(
                "Kích hoạt người dùng",
                String.format("Admin %s đã kích hoạt %d tài khoản người dùng", adminUsername, count),
                "UserManagement",
                adminUsername);
    }

    public void logPasswordChanged(String username) {
        logInfo(
                "Đổi mật khẩu",
                String.format("Người dùng %s đã thay đổi mật khẩu", username),
                "Authentication",
                username);
    }

    public void logImportStarted(String adminUsername, String filename, String mode) {
        logInfo(
                "Bắt đầu import người dùng",
                String.format("Admin %s đã bắt đầu import từ file '%s' (Chế độ: %s)", adminUsername, filename, mode),
                "UserImport",
                adminUsername);
    }

    public void logImportCompleted(String adminUsername, int successCount, int failedCount, String filename) {
        if (failedCount > 0) {
            logWarning(
                    "Import hoàn tất (có lỗi)",
                    String.format("Admin %s đã import từ '%s': %d thành công, %d thất bại",
                            adminUsername, filename, successCount, failedCount),
                    "UserImport",
                    adminUsername);
        } else {
            logSuccess(
                    "Import hoàn tất",
                    String.format("Admin %s đã import thành công %d người dùng từ '%s'",
                            adminUsername, successCount, filename),
                    "UserImport",
                    adminUsername);
        }
    }

    public void logImportFailed(String adminUsername, String filename, String error) {
        logError(
                "Import thất bại",
                String.format("Admin %s import từ '%s' thất bại: %s", adminUsername, filename, error),
                "UserImport",
                adminUsername);
    }

    // ==================== LECTURER MANAGEMENT ====================
    public void logLecturerUpdated(String lecturerCode, String lecturerName) {
        String performer = getCurrentUsername();
        logInfo("Cập nhật giảng viên",
                String.format("Cập nhật thông tin giảng viên %s (Mã: %s)", lecturerName, lecturerCode),
                "LecturerManagement",
                performer);
    }

    public void logLecturerDeleted(String lecturerCode) {
        String performer = getCurrentUsername();
        logWarning("Xóa giảng viên",
                String.format("Đã xóa giảng viên có mã: %s", lecturerCode),
                "LecturerManagement",
                performer);
    }

    public void logLecturersDeleted(int count) {
        String performer = getCurrentUsername();
        logWarning("Xóa nhiều giảng viên",
                String.format("Đã xóa %d giảng viên", count),
                "LecturerManagement",
                performer);
    }

    public void logLecturerImportCompleted(int created, int updated, int failed) {
        String performer = getCurrentUsername();
        if (failed > 0) {
            logWarning("Import giảng viên (có lỗi)",
                    String.format("Import giảng viên: %d tạo mới, %d cập nhật, %d thất bại", created, updated, failed),
                    "LecturerImport",
                    performer);
        } else {
            logSuccess("Import giảng viên thành công",
                    String.format("Import giảng viên: %d tạo mới, %d cập nhật", created, updated),
                    "LecturerImport",
                    performer);
        }
    }

    public void logLecturerExported() {
        logInfo("Xuất danh sách giảng viên", "Đã xuất danh sách giảng viên ra file Excel", "LecturerManagement",
                getCurrentUsername());
    }

    // ==================== STUDENT MANAGEMENT ====================
    public void logStudentUpdated(String studentCode, String studentName) {
        String performer = getCurrentUsername();
        logInfo("Cập nhật sinh viên",
                String.format("Cập nhật thông tin sinh viên %s (Mã: %s)", studentName, studentCode),
                "StudentManagement",
                performer);
    }

    public void logStudentDeleted(String studentCode) {
        String performer = getCurrentUsername();
        logWarning("Xóa sinh viên",
                String.format("Đã xóa sinh viên có mã: %s", studentCode),
                "StudentManagement",
                performer);
    }

    public void logStudentsDeleted(int count) {
        String performer = getCurrentUsername();
        logWarning("Xóa nhiều sinh viên",
                String.format("Đã xóa %d sinh viên", count),
                "StudentManagement",
                performer);
    }

    public void logStudentImportCompleted(int created, int updated, int failed) {
        String performer = getCurrentUsername();
        if (failed > 0) {
            logWarning("Import sinh viên (có lỗi)",
                    String.format("Import sinh viên: %d tạo mới, %d cập nhật, %d thất bại", created, updated, failed),
                    "StudentImport",
                    performer);
        } else {
            logSuccess("Import sinh viên thành công",
                    String.format("Import sinh viên: %d tạo mới, %d cập nhật", created, updated),
                    "StudentImport",
                    performer);
        }
    }

    public void logStudentExported() {
        logInfo("Xuất danh sách sinh viên", "Đã xuất danh sách sinh viên ra file Excel", "StudentManagement",
                getCurrentUsername());
    }

    // ==================== COURSE MANAGEMENT ====================
    public void logCourseCreated(String courseCode, String courseName) {
        logSuccess("Tạo khóa học mới",
                String.format("Tạo khóa học mới: %s (Mã: %s)", courseName, courseCode),
                "CourseManagement",
                getCurrentUsername());
    }

    public void logCourseUpdated(String courseCode, String courseName) {
        logInfo("Cập nhật khóa học",
                String.format("Cập nhật khóa học: %s (Mã: %s)", courseName, courseCode),
                "CourseManagement",
                getCurrentUsername());
    }

    public void logCourseDeleted(String courseCode) {
        logWarning("Xóa khóa học",
                String.format("Đã xóa khóa học có mã: %s", courseCode),
                "CourseManagement",
                getCurrentUsername());
    }

    public void logCourseStatusChanged(String courseCode, String newStatus) {
        logInfo("Thay đổi trạng thái khóa học",
                String.format("Khóa học %s đã đổi trạng thái sang: %s", courseCode, newStatus),
                "CourseManagement",
                getCurrentUsername());
    }

    public void logCourseImportCompleted(int created, int failed) {
        String performer = getCurrentUsername();
        if (failed > 0) {
            logWarning("Import khóa học (có lỗi)",
                    String.format("Import khóa học: %d tạo mới, %d thất bại", created, failed),
                    "CourseImport",
                    performer);
        } else {
            logSuccess("Import khóa học thành công",
                    String.format("Import thành công %d khóa học", created),
                    "CourseImport",
                    performer);
        }
    }

    public void logCourseExported() {
        logInfo("Xuất danh sách khóa học", "Đã xuất danh sách khóa học ra file Excel", "CourseManagement",
                getCurrentUsername());
    }

    // ==================== CLASS SECTION MANAGEMENT ====================
    public void logClassCreated(String className) {
        logSuccess("Tạo lớp học phần",
                String.format("Tạo lớp học phần mới: %s", className),
                "ClassManagement",
                getCurrentUsername());
    }

    public void logClassUpdated(String className) {
        logInfo("Cập nhật lớp học phần",
                String.format("Cập nhật lớp học phần: %s", className),
                "ClassManagement",
                getCurrentUsername());
    }

    public void logClassDeleted(String className) {
        logWarning("Xóa lớp học phần",
                String.format("Đã xóa lớp học phần: %s", className),
                "ClassManagement",
                getCurrentUsername());
    }

    public void logClassesDeleted(int count) {
        logWarning("Xóa nhiều lớp học phần",
                String.format("Đã xóa %d lớp học phần", count),
                "ClassManagement",
                getCurrentUsername());
    }

    public void logEnrollmentCreated(String studentCode, String className) {
        logInfo("Thêm sinh viên vào lớp",
                String.format("Thêm sinh viên %s vào lớp %s", studentCode, className),
                "ClassManagement",
                getCurrentUsername());
    }

    public void logEnrollmentDeleted(String studentCode, String className) {
        logWarning("Xóa sinh viên khỏi lớp",
                String.format("Xóa sinh viên %s khỏi lớp %s", studentCode, className),
                "ClassManagement",
                getCurrentUsername());
    }

    public void logEnrollmentsTransferred(int count, String targetClassName) {
        logInfo("Chuyển sinh viên giữa các lớp",
                String.format("Chuyển %d sinh viên sang lớp %s", count, targetClassName),
                "ClassManagement",
                getCurrentUsername());
    }

    // ==================== SCHEDULE REQUEST ====================
    public void logScheduleRequestApproved(Long requestId, String approverName, String className) {
        logSuccess("Phê duyệt yêu cầu đổi lịch",
                String.format("%s đã phê duyệt yêu cầu #%d cho lớp %s", approverName, requestId, className),
                "ScheduleRequest",
                getCurrentUsername());
    }

    public void logScheduleRequestRejected(Long requestId, String approverName, String className) {
        logWarning("Từ chối yêu cầu đổi lịch",
                String.format("%s đã từ chối yêu cầu #%d cho lớp %s", approverName, requestId, className),
                "ScheduleRequest",
                getCurrentUsername());
    }

    // ==================== SEMESTER MANAGEMENT ====================
    public void logSemesterCreated(String semesterCode, String semesterName) {
        logSuccess("Tạo học kỳ mới",
                String.format("Tạo học kỳ mới: %s (%s)", semesterName, semesterCode),
                "SemesterManagement",
                getCurrentUsername());
    }

    public void logSemesterUpdated(String semesterCode, String semesterName) {
        logInfo("Cập nhật học kỳ",
                String.format("Cập nhật học kỳ: %s (%s)", semesterName, semesterCode),
                "SemesterManagement",
                getCurrentUsername());
    }

    public void logSemesterDeleted(String semesterCode) {
        logWarning("Xóa học kỳ",
                String.format("Đã xóa học kỳ: %s", semesterCode),
                "SemesterManagement",
                getCurrentUsername());
    }

    public void logSemesterConfigUpdated(String semesterCode) {
        logInfo("Cập nhật cấu hình học kỳ",
                String.format("Cập nhật cấu hình cho học kỳ: %s", semesterCode),
                "SemesterManagement",
                getCurrentUsername());
    }

    // ==================== ROOM MANAGEMENT ====================
    public void logRoomCreated(String roomCode, String roomName) {
        logSuccess("Tạo phòng học mới",
                String.format("Tạo phòng học mới: %s (%s)", roomName, roomCode),
                "RoomManagement",
                getCurrentUsername());
    }

    public void logRoomUpdated(String roomCode, String roomName) {
        logInfo("Cập nhật phòng học",
                String.format("Cập nhật phòng học: %s (%s)", roomName, roomCode),
                "RoomManagement",
                getCurrentUsername());
    }

    public void logRoomDeleted(Long roomId) {
        logWarning("Xóa phòng học",
                String.format("Đã xóa phòng học ID: %d", roomId),
                "RoomManagement",
                getCurrentUsername());
    }

    // ==================== AUTHENTICATION ====================
    public void logLoginSuccess(String username) {
        logInfo("Đăng nhập thành công",
                String.format("Người dùng %s đã đăng nhập thành công", username),
                "Authentication",
                username);
    }

    public void logLoginFailed(String username) {
        logWarning("Đăng nhập thất bại",
                String.format("Đăng nhập thất bại cho tài khoản: %s", username),
                "Authentication",
                username);
    }

    public void logBruteForceWarning(String username, int attempts) {
        logWarning("Cảnh báo Brute Force",
                String.format("Phát hiện %d lần đăng nhập thất bại liên tiếp cho tài khoản: %s", attempts, username),
                "Security",
                username);
    }

    public void logUnauthorizedAccess(String username, String resource) {
        logWarning("Truy cập trái phép",
                String.format("Người dùng %s đã cố gắng truy cập tài nguyên bị hạn chế: %s", username, resource),
                "Security",
                username);
    }

    // ==================== SENSITIVE DATA ====================
    public void logRoleChanged(String adminUsername, String targetUsername, String oldRole, String newRole) {
        logWarning("Thay đổi quyền hạn",
                String.format("Admin %s đã thay đổi vai trò của %s từ %s sang %s", adminUsername, targetUsername,
                        oldRole, newRole),
                "UserManagement",
                adminUsername);
    }

    public void logSensitiveDataChange(String performer, String target, String field, String oldValue,
            String newValue) {
        logWarning("Thay đổi dữ liệu nhạy cảm",
                String.format("%s đã thay đổi %s cho %s", performer, field, target),
                "DataIntegrity",
                performer);
    }

    // ==================== ATTENDANCE CONFIG ====================
    public void logAttendanceConfigUpdated() {
        logInfo("Cập nhật cấu hình điểm danh",
                "Đã cập nhật cấu hình hệ thống điểm danh",
                "AttendanceConfig",
                getCurrentUsername());
    }
}
