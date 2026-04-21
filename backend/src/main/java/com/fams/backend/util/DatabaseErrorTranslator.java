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

        // Get the most meaningful message from the exception chain
        Throwable rootCause = e;
        while (rootCause.getCause() != null && rootCause != rootCause.getCause()) {
            rootCause = rootCause.getCause();
        }
        
        String message = rootCause.getMessage();
        if (message == null) {
            message = e.getMessage();
        }
        
        if (message == null) {
            return "Đã xảy ra lỗi hệ thống thông tin.";
        }

        log.debug("Translating database error: {}", message);

        // 1. Foreign Key Violation
        if (message.contains("violates foreign key constraint") || 
            message.contains("is still referenced from table") ||
            message.contains("ConstraintViolationException") ||
            message.contains("foreign key")) {
            
            if (message.contains("schedule_requests")) {
                return "Không thể xóa lớp học này vì đang có các 'Yêu cầu đổi lịch' liên quan. Vui lòng xử lý hoặc xóa các yêu cầu đổi lịch trước.";
            }
            if (message.contains("timetable_slots")) {
                return "Không thể xóa hoặc thay đổi dữ liệu này vì nó đã được xếp vào thời khóa biểu.";
            }
            if (message.contains("enrollments")) {
                return "Lớp học đang có sinh viên đăng ký, không thể xóa.";
            }
            if (message.contains("attendance_sessions") || message.contains("attendances")) {
                return "Dữ liệu này đã có thông tin điểm danh, không thể xóa.";
            }
            if (message.contains("exam_grades") || message.contains("student_grades")) {
                return "Dữ liệu này đã có điểm số liên quan, không thể xóa.";
            }
            if (message.contains("class_sections")) {
                return "Dữ liệu này đang được sử dụng bởi một hoặc nhiều lớp học phần.";
            }

            return "Không thể xóa hoặc thay đổi dữ liệu này vì nó đang được sử dụng ở các phần khác trong hệ thống.";
        }

        // 2. Unique Constraint Violation
        if (message.contains("violates unique constraint") || 
            message.contains("duplicate key value")) {
            
            if (message.contains("class_name")) {
                return "Tên lớp học này đã tồn tại. Vui lòng chọn tên khác.";
            }
            if (message.contains("user_email") || message.contains("email")) {
                return "Email này đã được sử dụng bởi một người dùng khác.";
            }
            if (message.contains("user_code") || message.contains("code")) {
                return "Mã số này đã tồn tại trong hệ thống.";
            }
            
            return "Dữ liệu bị trùng lặp: Một trong số các thông tin bạn nhập đã tồn tại trong hệ thống.";
        }

        // 3. Not Null Constraint
        if (message.contains("violates not-null constraint") || 
            message.contains("null value in column")) {
            return "Vui lòng điền đầy đủ các thông tin bắt buộc.";
        }

        // 4. Data Conversion/Type errors
        if (message.contains("invalid input syntax") || message.contains("numeric field overflow")) {
            return "Dữ liệu nhập vào không đúng định dạng (ví dụ: sai kiểu số, ngày tháng).";
        }

        // 5. Generic Database errors
        if (message.contains("could not execute batch") || message.contains("could not execute statement")) {
            return "Không thể thực hiện thao tác trên cơ sở dữ liệu. Có thể do ràng buộc dữ liệu liên quan.";
        }

        // Fallback for other technical errors
        return "Lỗi dữ liệu: " + (message.length() > 100 ? message.substring(0, 100) + "..." : message);
    }
}
