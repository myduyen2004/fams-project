package com.fams.backend.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DatabaseErrorTranslatorTest {

    @Test
    void testTranslateForeignKeyViolation_ScheduleRequests() {
        String originalMessage = "JDBC exception executing SQL [delete from timetable_slots ...] [ERROR: update or delete on table \"timetable_slots\" violates foreign key constraint \"schedule_requests_requested_slot_id_fkey\" on table \"schedule_requests\" Detail: Key (id)=(39334) is still referenced from table \"schedule_requests\".]";
        Exception ex = new Exception(originalMessage);
        
        String translated = DatabaseErrorTranslator.translate(ex);
        
        assertEquals("Không thể thực hiện vì có các 'Yêu cầu đổi lịch' đang liên kết với dữ liệu này. Vui lòng xử lý hoặc xóa các yêu cầu liên quan trước khi thao tác.", translated);
    }

    @Test
    void testTranslateForeignKeyViolation_Generic() {
        String originalMessage = "ERROR: update or delete on table \"some_table\" violates foreign key constraint \"some_fkey\" on table \"other_table\"";
        Exception ex = new Exception(originalMessage);
        
        String translated = DatabaseErrorTranslator.translate(ex);
        
        assertEquals("Không thể thực hiện hành động này vì dữ liệu đang được tham chiếu hoặc sử dụng ở nơi khác trong hệ thống.", translated);
    }

    @Test
    void testTranslateUniqueViolation() {
        String originalMessage = "ERROR: duplicate key value violates unique constraint \"users_email_key\" Detail: Key (email)=(test@gmail.com) already exists.";
        Exception ex = new Exception(originalMessage);
        
        String translated = DatabaseErrorTranslator.translate(ex);
        
        assertTrue(translated.contains("đã tồn tại trong hệ thống"));
    }

    @Test
    void testTranslateNullViolation() {
        String originalMessage = "ERROR: null value in column \"name\" violates not-null constraint";
        Exception ex = new Exception(originalMessage);
        
        String translated = DatabaseErrorTranslator.translate(ex);
        
        assertTrue(translated.contains("thông tin bắt buộc còn thiếu"));
    }

    @Test
    void testTranslateFallback() {
        String originalMessage = "Something went wrong in the matrix";
        Exception ex = new Exception(originalMessage);
        
        String translated = DatabaseErrorTranslator.translate(ex);
        
        assertEquals("Lỗi hệ thống: Something went wrong in the matrix", translated);
    }
}
