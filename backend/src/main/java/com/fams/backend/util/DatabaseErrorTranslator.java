package com.fams.backend.util;

import lombok.extern.slf4j.Slf4j;

/**
 * Utility to translate low-level database (JDBC/PostgreSQL) errors 
 * into user-friendly Vietnamese notifications.
 */
@Slf4j
public class DatabaseErrorTranslator {

    /**
     * Translates database exceptions into user-friendly Vietnamese messages.
     * 
     * @param e The exception to translate
     * @return A user-friendly Vietnamese message
     */
    public static String translate(Throwable e) {
        if (e == null) {
            return "Đã xảy ra lỗi không xác định.";
        }

        String message = e.getMessage();
        if (message == null) {
            return "Đã xảy ra lỗi hệ thống thông tin.";
        }

        log.debug("Translating database error: {}", message);

        // 1. Foreign Key Violation (PostgreSQL format or generic JDBC)
        // Happens when trying to delete/update data that is referenced elsewhere
        if (message.contains("violates foreign key constraint") || 
            message.contains("is still referenced from table") ||
            message.contains("Foreign key constraint violation")) {
            
            // Specific overrides for known relationships
            if (message.contains("schedule_requests")) {
                return "Không thể thực hiện vì có các 'Yêu cầu đổi lịch' đang liên kết với dữ liệu này. Vui lòng xử lý hoặc xóa các yêu cầu liên quan trước khi thao tác.";
            }
            if (message.contains("timetable_slots")) {
                return "Không thể xóa dữ liệu này vì nó đã được xếp vào thời khóa biểu.";
            }
            if (message.contains("enrollments")) {
                return "Dữ liệu này đang có sinh viên đăng ký học, không thể xóa hoặc thay đổi mã.";
            }
            if (message.contains("class_sections")) {
                return "Dữ liệu này đang được sử dụng bởi các lớp học phần.";
            }
            if (message.contains("attendance_sessions") || message.contains("attendances")) {
                return "Không thể xóa vì đã có dữ liệu điểm danh liên quan.";
            }

            return "Không thể thực hiện hành động này vì dữ liệu đang được tham chiếu hoặc sử dụng ở nơi khác trong hệ thống.";
        }

        // 2. Unique Constraint Violation
        // Happens when trying to insert/update a duplicate value (code, name, email, etc.)
        if (message.contains("violates unique constraint") || 
            message.contains("duplicate key value")) {
            return "Dữ liệu này đã tồn tại trong hệ thống (ví dụ: bị trùng Mã, Tên hoặc Email). Vui lòng kiểm tra và nhập giá trị khác.";
        }

        // 3. Not Null Constraint
        // Happens when a mandatory field is missing
        if (message.contains("violates not-null constraint") || 
            message.contains("null value in column")) {
            return "Một số thông tin bắt buộc còn thiếu hoặc không hợp lệ. Vui lòng điền đầy đủ các trường yêu cầu.";
        }

        // 4. Check Constraint
        if (message.contains("violates check constraint")) {
            return "Dữ liệu nhập vào không thỏa mãn các điều kiện quy định của hệ thống.";
        }

        // 5. Generic JDBC/SQL cleanup
        // If it starts with technical JDBC prefix, we trim it if we didn't catch specific patterns
        if (message.contains("JDBC exception executing SQL") || message.contains("could not execute statement")) {
            return "Lỗi truy cập cơ sở dữ liệu. Vui lòng thử lại sau hoặc thông báo cho bộ phận kỹ thuật.";
        }

        // Fallback: return the message but prefixed to indicate a system error
        return "Lỗi hệ thống: " + message;
    }
}
