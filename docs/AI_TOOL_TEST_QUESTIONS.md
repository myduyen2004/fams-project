# AI Tool Test Questions

Tài liệu này được generate từ tool surface hiện tại của chatbot.
Mỗi tool có câu hỏi test theo role được phép, case thiếu dữ liệu, case sai định dạng, và case không đủ quyền khi có.

## activate_user

- Agent: `admin`
- Allowed roles: `ADMIN`
- Required fields: `code`

### Happy Path
- `ADMIN`: Tôi là admin, hãy activate user với mã USR001.

### Validation Cases
- Missing field: Hãy activate user nhưng không cung cấp code.
- Invalid field: Hãy activate user với code = '??'.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy activate user với mã USR001.

## add_student_to_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`, `student_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy thêm student to class với mã lớp PRF192_SE1, mã sinh viên SE170001.

### Validation Cases
- Missing field: Hãy thêm student to class nhưng không cung cấp class_name.
- Invalid field: Hãy thêm student to class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy thêm student to class với mã lớp PRF192_SE1, mã sinh viên SE170001.

## approve_schedule_request

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `request_id`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy approve schedule request với mã yêu cầu 15.

### Validation Cases
- Missing field: Hãy approve schedule request nhưng không cung cấp request_id.
- Invalid field: Hãy approve schedule request với request_id = 'req A'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy approve schedule request với mã yêu cầu 15.

## assign_course_to_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `specialization_code`, `specialization_name`, `course_code`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy gán course to specialization với mã chuyên ngành SE, chuyên ngành Kỹ thuật phần mềm, mã môn PRF192, tên môn Programming Fundamentals.

### Validation Cases
- Missing field: Hãy gán course to specialization nhưng không cung cấp specialization_code.
- Invalid field: Hãy gán course to specialization với specialization_code = 'spec 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy gán course to specialization với mã chuyên ngành SE, chuyên ngành Kỹ thuật phần mềm, mã môn PRF192, tên môn Programming Fundamentals.

## assign_course_to_sub_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `sub_specialization_code`, `sub_specialization_name`, `course_code`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy gán course to sub specialization với mã chuyên ngành hẹp AI, chuyên ngành hẹp Trí tuệ nhân tạo, mã môn PRF192, tên môn Programming Fundamentals.

### Validation Cases
- Missing field: Hãy gán course to sub specialization nhưng không cung cấp sub_specialization_code.
- Invalid field: Hãy gán course to sub specialization với sub_specialization_code = 'sub 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy gán course to sub specialization với mã chuyên ngành hẹp AI, chuyên ngành hẹp Trí tuệ nhân tạo, mã môn PRF192, tên môn Programming Fundamentals.

## count_rooms_by_status

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy thống kê rooms by status với trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy thống kê rooms by status nhưng không cung cấp status.
- Invalid field: Hãy thống kê rooms by status với status = 'on'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy thống kê rooms by status với trạng thái ACTIVE.

## count_students_by_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_name`, `major_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy thống kê students by major với ngành Công nghệ thông tin, mã ngành SE.

### Validation Cases
- Missing field: Hãy thống kê students by major nhưng không cung cấp major_name.
- Invalid field: Hãy thống kê students by major với major_name = 'major_name Cong nghe thong tin'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy thống kê students by major với ngành Công nghệ thông tin, mã ngành SE.

## count_unread_notifications

- Agent: `notifications`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy thống kê unread notifications.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy thống kê unread notifications.
- `LECTURER`: Tôi là giảng viên, hãy thống kê unread notifications.
- `STUDENT`: Tôi là sinh viên, hãy thống kê unread notifications.

## count_users_by_role

- Agent: `admin`
- Allowed roles: `ADMIN`
- Required fields: `role`

### Happy Path
- `ADMIN`: Tôi là admin, hãy thống kê users by role với vai trò LECTURER.

### Validation Cases
- Missing field: Hãy thống kê users by role nhưng không cung cấp role.
- Invalid field: Hãy thống kê users by role với role = 'teacher'.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy thống kê users by role với vai trò LECTURER.

## create_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`, `course_code`, `lecturer_code`, `semester_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo class với mã lớp PRF192_SE1, mã môn PRF192, mã giảng viên GV001, mã học kỳ SP26.

### Validation Cases
- Missing field: Hãy tạo class nhưng không cung cấp class_name.
- Invalid field: Hãy tạo class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo class với mã lớp PRF192_SE1, mã môn PRF192, mã giảng viên GV001, mã học kỳ SP26.

## create_course

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`, `credits`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo course với mã USR001, tên Khoa học mới, 3 tín chỉ.

### Validation Cases
- Missing field: Hãy tạo course nhưng không cung cấp code.
- Invalid field: Hãy tạo course với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo course với mã USR001, tên Khoa học mới, 3 tín chỉ.

## create_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo major với mã USR001, tên Khoa học mới.

### Validation Cases
- Missing field: Hãy tạo major nhưng không cung cấp code.
- Invalid field: Hãy tạo major với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo major với mã USR001, tên Khoa học mới.

## create_notification

- Agent: `notifications`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy tạo notification.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo notification.
- `LECTURER`: Tôi là giảng viên, hãy tạo notification.

### Permission Case
- `STUDENT`: Tôi là sinh viên, hãy tạo notification.

## create_room

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `name`, `capacity`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo room với tên Khoa học mới, sức chứa 40.

### Validation Cases
- Missing field: Hãy tạo room nhưng không cung cấp name.
- Invalid field: Hãy tạo room với name = 'name Khoa hoc moi'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo room với tên Khoa học mới, sức chứa 40.

## create_schedule_request

- Agent: `schedule`
- Allowed roles: `LECTURER`
- Required fields: `original_slot_id`, `requested_slot_id`, `reason`

### Happy Path
- `LECTURER`: Tôi là giảng viên, hãy tạo schedule request với slot gốc 101, slot muốn đổi 202, lý do trùng lịch giảng dạy.

### Validation Cases
- Missing field: Hãy tạo schedule request nhưng không cung cấp original_slot_id.
- Invalid field: Hãy tạo schedule request với original_slot_id = 'goc A'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo schedule request với slot gốc 101, slot muốn đổi 202, lý do trùng lịch giảng dạy.

## create_semester

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`, `start_date`, `end_date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo semester với mã USR001, tên Khoa học mới, ngày bắt đầu 2026-03-20, ngày kết thúc 2026-03-27.

### Validation Cases
- Missing field: Hãy tạo semester nhưng không cung cấp code.
- Invalid field: Hãy tạo semester với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo semester với mã USR001, tên Khoa học mới, ngày bắt đầu 2026-03-20, ngày kết thúc 2026-03-27.

## create_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_code`, `spec_code`, `spec_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo specialization với mã ngành SE, mã chuyên ngành SE, tên chuyên ngành Kỹ thuật phần mềm.

### Validation Cases
- Missing field: Hãy tạo specialization nhưng không cung cấp major_code.
- Invalid field: Hãy tạo specialization với major_code = 'se nganh'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo specialization với mã ngành SE, mã chuyên ngành SE, tên chuyên ngành Kỹ thuật phần mềm.

## create_sub_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `sub_code`, `sub_name`, `spec_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo sub specialization với mã chuyên ngành hẹp AI, tên chuyên ngành hẹp Trí tuệ nhân tạo, mã chuyên ngành SE.

### Validation Cases
- Missing field: Hãy tạo sub specialization nhưng không cung cấp sub_code.
- Invalid field: Hãy tạo sub specialization với sub_code = 'sub 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy tạo sub specialization với mã chuyên ngành hẹp AI, tên chuyên ngành hẹp Trí tuệ nhân tạo, mã chuyên ngành SE.

## create_user

- Agent: `admin`
- Allowed roles: `ADMIN`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy tạo user.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy tạo user.

## delete_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy xóa class nhưng không cung cấp class_name.
- Invalid field: Hãy xóa class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa class với mã lớp PRF192_SE1.

## delete_course

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa course với mã USR001, tên Khoa học mới.

### Validation Cases
- Missing field: Hãy xóa course nhưng không cung cấp code.
- Invalid field: Hãy xóa course với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa course với mã USR001, tên Khoa học mới.

## delete_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa major với mã USR001, tên Khoa học mới.

### Validation Cases
- Missing field: Hãy xóa major nhưng không cung cấp code.
- Invalid field: Hãy xóa major với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa major với mã USR001, tên Khoa học mới.

## delete_room

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `room_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa room với phòng A101.

### Validation Cases
- Missing field: Hãy xóa room nhưng không cung cấp room_name.
- Invalid field: Hãy xóa room với room_name = 'phong 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa room với phòng A101.

## delete_semester

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa semester với mã học kỳ SP26.

### Validation Cases
- Missing field: Hãy xóa semester nhưng không cung cấp semester_code.
- Invalid field: Hãy xóa semester với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa semester với mã học kỳ SP26.

## delete_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa specialization với mã USR001, tên Khoa học mới.

### Validation Cases
- Missing field: Hãy xóa specialization nhưng không cung cấp code.
- Invalid field: Hãy xóa specialization với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa specialization với mã USR001, tên Khoa học mới.

## delete_sub_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa sub specialization với mã USR001, tên Khoa học mới.

### Validation Cases
- Missing field: Hãy xóa sub specialization nhưng không cung cấp code.
- Invalid field: Hãy xóa sub specialization với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa sub specialization với mã USR001, tên Khoa học mới.

## delete_user

- Agent: `admin`
- Allowed roles: `ADMIN`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy xóa user.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa user.

## dynamic_sql

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy dynamic sql.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy dynamic sql.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy dynamic sql.

## excel_query

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy excel query.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy excel query.
- `LECTURER`: Tôi là giảng viên, hãy excel query.
- `STUDENT`: Tôi là sinh viên, hãy excel query.

## export_attendance_stats

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy export attendance stats.
- `LECTURER`: Tôi là giảng viên, hãy export attendance stats.

### Permission Case
- `ADMIN`: Tôi là admin, hãy export attendance stats.

## export_excel

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy export excel.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy export excel.
- `LECTURER`: Tôi là giảng viên, hãy export excel.

### Permission Case
- `STUDENT`: Tôi là sinh viên, hãy export excel.

## get_abnormal_attendance

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy abnormal attendance.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy abnormal attendance.

## get_active_semester

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy active semester.
- `LECTURER`: Tôi là giảng viên, hãy lấy active semester.
- `STUDENT`: Tôi là sinh viên, hãy lấy active semester.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy active semester.

## get_all_rooms_today

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy all rooms today.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy all rooms today.

## get_attendance_by_session_id

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `session_id`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance by session id với mã phiên 101.

### Validation Cases
- Missing field: Hãy lấy attendance by session id nhưng không cung cấp session_id.
- Invalid field: Hãy lấy attendance by session id với session_id = 'session A'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance by session id với mã phiên 101.

## get_attendance_by_slot

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `class_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance by slot với mã lớp PRF192_SE1, ngày 2026-03-20.
- `LECTURER`: Tôi là giảng viên, hãy lấy attendance by slot với mã lớp PRF192_SE1, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy attendance by slot nhưng không cung cấp class_name.
- Invalid field: Hãy lấy attendance by slot với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance by slot với mã lớp PRF192_SE1, ngày 2026-03-20.

## get_attendance_by_slot_number

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `slot_number`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance by slot number với slot 2, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy attendance by slot number nhưng không cung cấp slot_number.
- Invalid field: Hãy lấy attendance by slot number với slot_number = 'ca hai'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance by slot number với slot 2, ngày 2026-03-20.

## get_attendance_heatmap

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance heatmap với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy attendance heatmap nhưng không cung cấp class_name.
- Invalid field: Hãy lấy attendance heatmap với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance heatmap với mã lớp PRF192_SE1.

## get_attendance_rate_by_course

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `course_name`, `course_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance rate by course với tên môn Programming Fundamentals, mã môn PRF192.
- `LECTURER`: Tôi là giảng viên, hãy lấy attendance rate by course với tên môn Programming Fundamentals, mã môn PRF192.

### Validation Cases
- Missing field: Hãy lấy attendance rate by course nhưng không cung cấp course_name.
- Invalid field: Hãy lấy attendance rate by course với course_name = 'course_name Programming Fundamentals'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance rate by course với tên môn Programming Fundamentals, mã môn PRF192.

## get_attendance_report_by_student

- Agent: `attendance`
- Allowed roles: `STUDENT`
- Required fields: `Không có`

### Happy Path
- `STUDENT`: Tôi là sinh viên, hãy lấy attendance report by student.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance report by student.

## get_attendance_stats_by_class

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance stats by class với mã lớp PRF192_SE1.
- `LECTURER`: Tôi là giảng viên, hãy lấy attendance stats by class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy attendance stats by class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy attendance stats by class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance stats by class với mã lớp PRF192_SE1.

## get_attendance_trends

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy attendance trends với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy attendance trends nhưng không cung cấp class_name.
- Invalid field: Hãy lấy attendance trends với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy attendance trends với mã lớp PRF192_SE1.

## get_available_classes_for_student

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`, `student_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy available classes for student với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy available classes for student nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy available classes for student với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy available classes for student với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_available_slots_for_room

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `room_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy available slots for room với phòng A101, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy available slots for room nhưng không cung cấp room_name.
- Invalid field: Hãy lấy available slots for room với room_name = 'phong 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy available slots for room với phòng A101, ngày 2026-03-20.

## get_best_performing_classes

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy best performing classes với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy best performing classes nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy best performing classes với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy best performing classes với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_class_health_check

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy class health check với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy class health check nhưng không cung cấp class_name.
- Invalid field: Hãy lấy class health check với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy class health check với mã lớp PRF192_SE1.

## get_class_info

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy class info với mã lớp PRF192_SE1.
- `LECTURER`: Tôi là giảng viên, hãy lấy class info với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy class info nhưng không cung cấp class_name.
- Invalid field: Hãy lấy class info với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy class info với mã lớp PRF192_SE1.

## get_class_leaderboard

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy class leaderboard với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy class leaderboard nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy class leaderboard với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy class leaderboard với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_class_next_session

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy class next session với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy class next session nhưng không cung cấp class_name.
- Invalid field: Hãy lấy class next session với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy class next session với mã lớp PRF192_SE1.

## get_class_schedule

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `class_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy class schedule với mã lớp PRF192_SE1, ngày 2026-03-20.
- `LECTURER`: Tôi là giảng viên, hãy lấy class schedule với mã lớp PRF192_SE1, ngày 2026-03-20.
- `STUDENT`: Tôi là sinh viên, hãy lấy class schedule với mã lớp PRF192_SE1, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy class schedule nhưng không cung cấp class_name.
- Invalid field: Hãy lấy class schedule với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy class schedule với mã lớp PRF192_SE1, ngày 2026-03-20.

## get_classes_by_semester

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `semester_code`, `semester_name`, `semester`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy classes by semester với mã học kỳ SP26, tên học kỳ Spring 2026.
- `LECTURER`: Tôi là giảng viên, hãy lấy classes by semester với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy classes by semester nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy classes by semester với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy classes by semester với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_classmates

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy classmates với mã sinh viên SE170001.

### Validation Cases
- Missing field: Hãy lấy classmates nhưng không cung cấp student_code.
- Invalid field: Hãy lấy classmates với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy classmates với mã sinh viên SE170001.

## get_consecutive_absences

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy consecutive absences với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy consecutive absences nhưng không cung cấp class_name.
- Invalid field: Hãy lấy consecutive absences với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy consecutive absences với mã lớp PRF192_SE1.

## get_courses_by_name

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `course_name`, `course_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy courses by name với tên môn Programming Fundamentals, mã môn PRF192.
- `LECTURER`: Tôi là giảng viên, hãy lấy courses by name với tên môn Programming Fundamentals, mã môn PRF192.
- `STUDENT`: Tôi là sinh viên, hãy lấy courses by name với tên môn Programming Fundamentals, mã môn PRF192.

### Validation Cases
- Missing field: Hãy lấy courses by name nhưng không cung cấp course_name.
- Invalid field: Hãy lấy courses by name với course_name = 'course_name Programming Fundamentals'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy courses by name với tên môn Programming Fundamentals, mã môn PRF192.

## get_courses_by_spec

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `STUDENT`
- Required fields: `specialization_name`, `specialization_code`, `major_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy courses by spec với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.
- `STUDENT`: Tôi là sinh viên, hãy lấy courses by spec với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.

### Validation Cases
- Missing field: Hãy lấy courses by spec nhưng không cung cấp specialization_name.
- Invalid field: Hãy lấy courses by spec với specialization_name = 'specialization_name Ky thuat phan mem'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy courses by spec với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.

## get_courses_by_sub_spec

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `STUDENT`
- Required fields: `sub_specialization_name`, `sub_specialization_code`, `specialization_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy courses by sub spec với chuyên ngành hẹp Trí tuệ nhân tạo, mã chuyên ngành hẹp AI.
- `STUDENT`: Tôi là sinh viên, hãy lấy courses by sub spec với chuyên ngành hẹp Trí tuệ nhân tạo, mã chuyên ngành hẹp AI.

### Validation Cases
- Missing field: Hãy lấy courses by sub spec nhưng không cung cấp sub_specialization_name.
- Invalid field: Hãy lấy courses by sub spec với sub_specialization_name = 'sub_specialization_name Tri tue nhan tao'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy courses by sub spec với chuyên ngành hẹp Trí tuệ nhân tạo, mã chuyên ngành hẹp AI.

## get_detail_course_grade

- Agent: `grades`
- Allowed roles: `STUDENT`
- Required fields: `course_name`, `course_code`

### Happy Path
- `STUDENT`: Tôi là sinh viên, hãy lấy detail course grade với tên môn Programming Fundamentals, mã môn PRF192.

### Validation Cases
- Missing field: Hãy lấy detail course grade nhưng không cung cấp course_name.
- Invalid field: Hãy lấy detail course grade với course_name = 'course_name Programming Fundamentals'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy detail course grade với tên môn Programming Fundamentals, mã môn PRF192.

## get_empty_rooms

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `date`, `slot_number`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy empty rooms với ngày 2026-03-20, slot 2.

### Validation Cases
- Missing field: Hãy lấy empty rooms nhưng không cung cấp date.
- Invalid field: Hãy lấy empty rooms với date = 'mai nhe'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy empty rooms với ngày 2026-03-20, slot 2.

## get_enrollments_by_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy enrollments by class với mã lớp PRF192_SE1.
- `LECTURER`: Tôi là giảng viên, hãy lấy enrollments by class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy enrollments by class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy enrollments by class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy enrollments by class với mã lớp PRF192_SE1.

## get_full_grade_sheet

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy full grade sheet với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy full grade sheet nhưng không cung cấp class_name.
- Invalid field: Hãy lấy full grade sheet với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy full grade sheet với mã lớp PRF192_SE1.

## get_gpa_stats_by_major

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_name`, `major_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy gpa stats by major với ngành Công nghệ thông tin, mã ngành SE.

### Validation Cases
- Missing field: Hãy lấy gpa stats by major nhưng không cung cấp major_name.
- Invalid field: Hãy lấy gpa stats by major với major_name = 'major_name Cong nghe thong tin'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy gpa stats by major với ngành Công nghệ thông tin, mã ngành SE.

## get_grade_components_by_course

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `course_name`, `course_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade components by course với tên môn Programming Fundamentals, mã môn PRF192.
- `LECTURER`: Tôi là giảng viên, hãy lấy grade components by course với tên môn Programming Fundamentals, mã môn PRF192.
- `STUDENT`: Tôi là sinh viên, hãy lấy grade components by course với tên môn Programming Fundamentals, mã môn PRF192.

### Validation Cases
- Missing field: Hãy lấy grade components by course nhưng không cung cấp course_name.
- Invalid field: Hãy lấy grade components by course với course_name = 'course_name Programming Fundamentals'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade components by course với tên môn Programming Fundamentals, mã môn PRF192.

## get_grade_distribution

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade distribution với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy grade distribution nhưng không cung cấp class_name.
- Invalid field: Hãy lấy grade distribution với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade distribution với mã lớp PRF192_SE1.

## get_grade_histogram

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade histogram với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy grade histogram nhưng không cung cấp class_name.
- Invalid field: Hãy lấy grade histogram với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade histogram với mã lớp PRF192_SE1.

## get_grade_improvement_on_retake

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `course_code`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade improvement on retake với mã môn PRF192, tên môn Programming Fundamentals.

### Validation Cases
- Missing field: Hãy lấy grade improvement on retake nhưng không cung cấp course_code.
- Invalid field: Hãy lấy grade improvement on retake với course_code = 'oop'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade improvement on retake với mã môn PRF192, tên môn Programming Fundamentals.

## get_grade_report_by_class

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade report by class với mã lớp PRF192_SE1.
- `LECTURER`: Tôi là giảng viên, hãy lấy grade report by class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy grade report by class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy grade report by class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade report by class với mã lớp PRF192_SE1.

## get_grade_report_by_course

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `course_name`, `course_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade report by course với tên môn Programming Fundamentals, mã môn PRF192.

### Validation Cases
- Missing field: Hãy lấy grade report by course nhưng không cung cấp course_name.
- Invalid field: Hãy lấy grade report by course với course_name = 'course_name Programming Fundamentals'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade report by course với tên môn Programming Fundamentals, mã môn PRF192.

## get_grade_trend_by_student

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy grade trend by student.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy grade trend by student.

## get_high_risk_classes

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy high risk classes với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy high risk classes nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy high risk classes với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy high risk classes với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_idle_lecturers

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy idle lecturers với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy idle lecturers nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy idle lecturers với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy idle lecturers với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_lecturer_by_code

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `lecturer_code`, `full_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy lecturer by code với mã giảng viên GV001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy lecturer by code nhưng không cung cấp lecturer_code.
- Invalid field: Hãy lấy lecturer by code với lecturer_code = 'gv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy lecturer by code với mã giảng viên GV001, họ tên Nguyen Van A.

## get_lecturer_schedule_by_search

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `lecturer_code`, `full_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy lecturer schedule by search với mã giảng viên GV001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy lecturer schedule by search nhưng không cung cấp lecturer_code.
- Invalid field: Hãy lấy lecturer schedule by search với lecturer_code = 'gv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy lecturer schedule by search với mã giảng viên GV001, họ tên Nguyen Van A.

## get_lecturer_workload

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `lecturer_code`, `full_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy lecturer workload với mã giảng viên GV001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy lecturer workload nhưng không cung cấp lecturer_code.
- Invalid field: Hãy lấy lecturer workload với lecturer_code = 'gv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy lecturer workload với mã giảng viên GV001, họ tên Nguyen Van A.

## get_lecturer_workload_comparison

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy lecturer workload comparison với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy lecturer workload comparison nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy lecturer workload comparison với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy lecturer workload comparison với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_lecturers_by_expertise

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `expertise`, `department`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy lecturers by expertise với chuyên môn Java, bộ môn CNTT.

### Validation Cases
- Missing field: Hãy lấy lecturers by expertise nhưng không cung cấp expertise.
- Invalid field: Hãy lấy lecturers by expertise với expertise = 'expertise Java'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy lecturers by expertise với chuyên môn Java, bộ môn CNTT.

## get_lecturers_by_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_name`, `major_code`, `department`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy lecturers by major với ngành Công nghệ thông tin, mã ngành SE.

### Validation Cases
- Missing field: Hãy lấy lecturers by major nhưng không cung cấp major_name.
- Invalid field: Hãy lấy lecturers by major với major_name = 'major_name Cong nghe thong tin'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy lecturers by major với ngành Công nghệ thông tin, mã ngành SE.

## get_major_curriculum_tree

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_code`, `major_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy major curriculum tree với mã ngành SE, ngành Công nghệ thông tin.

### Validation Cases
- Missing field: Hãy lấy major curriculum tree nhưng không cung cấp major_code.
- Invalid field: Hãy lấy major curriculum tree với major_code = 'se nganh'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy major curriculum tree với mã ngành SE, ngành Công nghệ thông tin.

## get_major_id_by_name

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_name`, `major_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy major id by name với ngành Công nghệ thông tin, mã ngành SE.

### Validation Cases
- Missing field: Hãy lấy major id by name nhưng không cung cấp major_name.
- Invalid field: Hãy lấy major id by name với major_name = 'major_name Cong nghe thong tin'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy major id by name với ngành Công nghệ thông tin, mã ngành SE.

## get_makeup_slot_candidates

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`, `start_time`, `end_time`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy makeup slot candidates với mã lớp PRF192_SE1, bắt đầu 07:00.

### Validation Cases
- Missing field: Hãy lấy makeup slot candidates nhưng không cung cấp class_name.
- Invalid field: Hãy lấy makeup slot candidates với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy makeup slot candidates với mã lớp PRF192_SE1, bắt đầu 07:00.

## get_most_absent_students

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy most absent students với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy most absent students nhưng không cung cấp class_name.
- Invalid field: Hãy lấy most absent students với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy most absent students với mã lớp PRF192_SE1.

## get_my_attendance_status

- Agent: `attendance`
- Allowed roles: `STUDENT`
- Required fields: `Không có`

### Happy Path
- `STUDENT`: Tôi là sinh viên, hãy lấy my attendance status.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy my attendance status.

## get_my_courses

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy my courses.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy my courses.

## get_my_grades

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy my grades.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy my grades.

## get_my_notifications

- Agent: `notifications`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy lấy my notifications.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy my notifications.
- `LECTURER`: Tôi là giảng viên, hãy lấy my notifications.
- `STUDENT`: Tôi là sinh viên, hãy lấy my notifications.

## get_my_schedule

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy my schedule.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy my schedule.

## get_my_schedule_requests

- Agent: `schedule`
- Allowed roles: `LECTURER`
- Required fields: `Không có`

### Happy Path
- `LECTURER`: Tôi là giảng viên, hãy lấy my schedule requests.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy my schedule requests.

## get_my_schedule_targeted

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy my schedule targeted.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy my schedule targeted.

## get_notification_history_for_user

- Agent: `notifications`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `user_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy notification history for user với mã người dùng SE170001.

### Validation Cases
- Missing field: Hãy lấy notification history for user nhưng không cung cấp user_code.
- Invalid field: Hãy lấy notification history for user với user_code = '???'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy notification history for user với mã người dùng SE170001.

## get_open_sessions_now

- Agent: `admin`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy open sessions now.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy open sessions now.

## get_other_lecturer_schedule

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `lecturer_code`, `full_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy other lecturer schedule với mã giảng viên GV001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy other lecturer schedule nhưng không cung cấp lecturer_code.
- Invalid field: Hãy lấy other lecturer schedule với lecturer_code = 'gv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy other lecturer schedule với mã giảng viên GV001, họ tên Nguyen Van A.

## get_other_student_schedule

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`, `full_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy other student schedule với mã sinh viên SE170001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy other student schedule nhưng không cung cấp student_code.
- Invalid field: Hãy lấy other student schedule với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy other student schedule với mã sinh viên SE170001, họ tên Nguyen Van A.

## get_own_grades

- Agent: `grades`
- Allowed roles: `STUDENT`
- Required fields: `Không có`

### Happy Path
- `STUDENT`: Tôi là sinh viên, hãy lấy own grades.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy own grades.

## get_own_schedule

- Agent: `schedule`
- Allowed roles: `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `LECTURER`: Tôi là giảng viên, hãy lấy own schedule.
- `STUDENT`: Tôi là sinh viên, hãy lấy own schedule.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy own schedule.

## get_room_fill_rate_by_weekday

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `room_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy room fill rate by weekday với phòng A101.

### Validation Cases
- Missing field: Hãy lấy room fill rate by weekday nhưng không cung cấp room_name.
- Invalid field: Hãy lấy room fill rate by weekday với room_name = 'phong 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy room fill rate by weekday với phòng A101.

## get_room_info

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `room_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy room info với phòng A101.

### Validation Cases
- Missing field: Hãy lấy room info nhưng không cung cấp room_name.
- Invalid field: Hãy lấy room info với room_name = 'phong 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy room info với phòng A101.

## get_room_usage_weekly

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `room_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy room usage weekly với phòng A101, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy room usage weekly nhưng không cung cấp room_name.
- Invalid field: Hãy lấy room usage weekly với room_name = 'phong 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy room usage weekly với phòng A101, ngày 2026-03-20.

## get_rooms_busy_now

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy rooms busy now.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy rooms busy now.

## get_schedule_request_detail

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `request_id`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy schedule request detail với mã yêu cầu 15.
- `LECTURER`: Tôi là giảng viên, hãy lấy schedule request detail với mã yêu cầu 15.

### Validation Cases
- Missing field: Hãy lấy schedule request detail nhưng không cung cấp request_id.
- Invalid field: Hãy lấy schedule request detail với request_id = 'req A'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy schedule request detail với mã yêu cầu 15.

## get_schedule_request_list

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy schedule request list với trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy lấy schedule request list nhưng không cung cấp status.
- Invalid field: Hãy lấy schedule request list với status = 'on'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy schedule request list với trạng thái ACTIVE.

## get_semester_countdown

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy semester countdown.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy semester countdown.

## get_semester_overview

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy semester overview với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy semester overview nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy semester overview với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy semester overview với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_sessions_by_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy sessions by class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy sessions by class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy sessions by class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy sessions by class với mã lớp PRF192_SE1.

## get_shared_courses_across_specs

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `course_code`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy shared courses across specs với mã môn PRF192, tên môn Programming Fundamentals.

### Validation Cases
- Missing field: Hãy lấy shared courses across specs nhưng không cung cấp course_code.
- Invalid field: Hãy lấy shared courses across specs với course_code = 'oop'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy shared courses across specs với mã môn PRF192, tên môn Programming Fundamentals.

## get_slot_detail_by_id

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `slot_id`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy slot detail by id với mã slot 101.

### Validation Cases
- Missing field: Hãy lấy slot detail by id nhưng không cung cấp slot_id.
- Invalid field: Hãy lấy slot detail by id với slot_id = 'slot A'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy slot detail by id với mã slot 101.

## get_slot_time_info

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy slot time info.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy slot time info.

## get_slots_by_date

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy slots by date với ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy slots by date nhưng không cung cấp date.
- Invalid field: Hãy lấy slots by date với date = 'mai nhe'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy slots by date với ngày 2026-03-20.

## get_slots_by_slot_number

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `slot_number`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy slots by slot number với slot 2, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy slots by slot number nhưng không cung cấp slot_number.
- Invalid field: Hãy lấy slots by slot number với slot_number = 'ca hai'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy slots by slot number với slot 2, ngày 2026-03-20.

## get_slots_by_time_range

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `date`, `time_start`, `time_end`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy slots by time range với ngày 2026-03-20, từ 07:00.

### Validation Cases
- Missing field: Hãy lấy slots by time range nhưng không cung cấp date.
- Invalid field: Hãy lấy slots by time range với date = 'mai nhe'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy slots by time range với ngày 2026-03-20, từ 07:00.

## get_specialization_id_by_name

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `specialization_name`, `specialization_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy specialization id by name với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.

### Validation Cases
- Missing field: Hãy lấy specialization id by name nhưng không cung cấp specialization_name.
- Invalid field: Hãy lấy specialization id by name với specialization_name = 'specialization_name Ky thuat phan mem'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy specialization id by name với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.

## get_specializations_by_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `STUDENT`
- Required fields: `major_name`, `major_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy specializations by major với ngành Công nghệ thông tin, mã ngành SE.
- `STUDENT`: Tôi là sinh viên, hãy lấy specializations by major với ngành Công nghệ thông tin, mã ngành SE.

### Validation Cases
- Missing field: Hãy lấy specializations by major nhưng không cung cấp major_name.
- Invalid field: Hãy lấy specializations by major với major_name = 'major_name Cong nghe thong tin'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy specializations by major với ngành Công nghệ thông tin, mã ngành SE.

## get_student_academic_standing

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student academic standing với mã sinh viên SE170001.

### Validation Cases
- Missing field: Hãy lấy student academic standing nhưng không cung cấp student_code.
- Invalid field: Hãy lấy student academic standing với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student academic standing với mã sinh viên SE170001.

## get_student_academic_timeline

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student academic timeline.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student academic timeline.

## get_student_attendance_by_class

- Agent: `attendance`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`, `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student attendance by class với mã sinh viên SE170001, mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy student attendance by class nhưng không cung cấp student_code.
- Invalid field: Hãy lấy student attendance by class với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student attendance by class với mã sinh viên SE170001, mã lớp PRF192_SE1.

## get_student_by_code

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `student_code`, `full_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student by code với mã sinh viên SE170001, họ tên Nguyen Van A.
- `LECTURER`: Tôi là giảng viên, hãy lấy student by code với mã sinh viên SE170001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy student by code nhưng không cung cấp student_code.
- Invalid field: Hãy lấy student by code với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student by code với mã sinh viên SE170001, họ tên Nguyen Van A.

## get_student_gpa_comparison

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`, `full_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student gpa comparison với mã sinh viên SE170001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy student gpa comparison nhưng không cung cấp student_code.
- Invalid field: Hãy lấy student gpa comparison với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student gpa comparison với mã sinh viên SE170001, họ tên Nguyen Van A.

## get_student_ranking_in_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student ranking in class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy student ranking in class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy student ranking in class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student ranking in class với mã lớp PRF192_SE1.

## get_student_schedule_by_search

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`, `full_name`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student schedule by search với mã sinh viên SE170001, họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy lấy student schedule by search nhưng không cung cấp student_code.
- Invalid field: Hãy lấy student schedule by search với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student schedule by search với mã sinh viên SE170001, họ tên Nguyen Van A.

## get_student_vs_class_grade

- Agent: `grades`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`, `student_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy student vs class grade với mã lớp PRF192_SE1, mã sinh viên SE170001.

### Validation Cases
- Missing field: Hãy lấy student vs class grade nhưng không cung cấp class_name.
- Invalid field: Hãy lấy student vs class grade với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy student vs class grade với mã lớp PRF192_SE1, mã sinh viên SE170001.

## get_students_at_risk

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `gpa_threshold`, `major_name`, `major_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy students at risk với ngưỡng GPA 2.5, ngành Công nghệ thông tin.
- `LECTURER`: Tôi là giảng viên, hãy lấy students at risk với ngưỡng GPA 2.5, ngành Công nghệ thông tin.

### Validation Cases
- Missing field: Hãy lấy students at risk nhưng không cung cấp gpa_threshold.
- Invalid field: Hãy lấy students at risk với gpa_threshold = 'hai cham nam'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy students at risk với ngưỡng GPA 2.5, ngành Công nghệ thông tin.

## get_students_by_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `class_name`, `course_code`, `course_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy students by class với mã lớp PRF192_SE1, mã môn PRF192.
- `LECTURER`: Tôi là giảng viên, hãy lấy students by class với mã lớp PRF192_SE1, mã môn PRF192.

### Validation Cases
- Missing field: Hãy lấy students by class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy students by class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy students by class với mã lớp PRF192_SE1, mã môn PRF192.

## get_students_by_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `major_name`, `major_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy students by major với ngành Công nghệ thông tin, mã ngành SE.

### Validation Cases
- Missing field: Hãy lấy students by major nhưng không cung cấp major_name.
- Invalid field: Hãy lấy students by major với major_name = 'major_name Cong nghe thong tin'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy students by major với ngành Công nghệ thông tin, mã ngành SE.

## get_students_without_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy students without class.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy students without class.

## get_sub_specializations

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `STUDENT`
- Required fields: `specialization_name`, `specialization_code`, `major_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy sub specializations với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.
- `STUDENT`: Tôi là sinh viên, hãy lấy sub specializations với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.

### Validation Cases
- Missing field: Hãy lấy sub specializations nhưng không cung cấp specialization_name.
- Invalid field: Hãy lấy sub specializations với specialization_name = 'specialization_name Ky thuat phan mem'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy sub specializations với chuyên ngành Kỹ thuật phần mềm, mã chuyên ngành SE.

## get_suitable_rooms_for_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy suitable rooms for class với mã lớp PRF192_SE1.

### Validation Cases
- Missing field: Hãy lấy suitable rooms for class nhưng không cung cấp class_name.
- Invalid field: Hãy lấy suitable rooms for class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy suitable rooms for class với mã lớp PRF192_SE1.

## get_teaching_effectiveness

- Agent: `admin`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy teaching effectiveness với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy teaching effectiveness nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy teaching effectiveness với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy teaching effectiveness với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_timetable_conflicts

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `lecturer_code`, `date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy timetable conflicts với mã giảng viên GV001, ngày 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy timetable conflicts nhưng không cung cấp lecturer_code.
- Invalid field: Hãy lấy timetable conflicts với lecturer_code = 'gv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy timetable conflicts với mã giảng viên GV001, ngày 2026-03-20.

## get_top_lecturers_by_pass_rate

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `semester_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy top lecturers by pass rate với mã học kỳ SP26, tên học kỳ Spring 2026.

### Validation Cases
- Missing field: Hãy lấy top lecturers by pass rate nhưng không cung cấp semester_code.
- Invalid field: Hãy lấy top lecturers by pass rate với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy top lecturers by pass rate với mã học kỳ SP26, tên học kỳ Spring 2026.

## get_top_students

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy top students.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy top students.

## get_user_by_code

- Agent: `people`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `code`

### Happy Path
- `ADMIN`: Tôi là admin, hãy lấy user by code với mã USR001.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy user by code với mã USR001.

### Validation Cases
- Missing field: Hãy lấy user by code nhưng không cung cấp code.
- Invalid field: Hãy lấy user by code với code = '??'.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy lấy user by code với mã USR001.

## get_weekly_timetable_grid

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `date`, `start_date`, `end_date`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy lấy weekly timetable grid với ngày 2026-03-20, ngày bắt đầu 2026-03-20.

### Validation Cases
- Missing field: Hãy lấy weekly timetable grid nhưng không cung cấp date.
- Invalid field: Hãy lấy weekly timetable grid với date = 'mai nhe'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy lấy weekly timetable grid với ngày 2026-03-20, ngày bắt đầu 2026-03-20.

## import_component_grades

- Agent: `grades`
- Allowed roles: `LECTURER`
- Required fields: `Không có`

### Happy Path
- `LECTURER`: Tôi là giảng viên, hãy import component grades.

### Permission Case
- `ADMIN`: Tôi là admin, hãy import component grades.

## list_courses

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy danh sách courses.

### Permission Case
- `ADMIN`: Tôi là admin, hãy danh sách courses.

## list_lecturers

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy danh sách lecturers.

### Permission Case
- `ADMIN`: Tôi là admin, hãy danh sách lecturers.

## list_majors

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy danh sách majors.
- `STUDENT`: Tôi là sinh viên, hãy danh sách majors.

### Permission Case
- `ADMIN`: Tôi là admin, hãy danh sách majors.

## list_notifications

- Agent: `notifications`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy danh sách notifications.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy danh sách notifications.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy danh sách notifications.

## list_semesters

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy danh sách semesters.
- `LECTURER`: Tôi là giảng viên, hãy danh sách semesters.
- `STUDENT`: Tôi là sinh viên, hãy danh sách semesters.

### Permission Case
- `ADMIN`: Tôi là admin, hãy danh sách semesters.

## reject_schedule_request

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `request_id`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy reject schedule request với mã yêu cầu 15.

### Validation Cases
- Missing field: Hãy reject schedule request nhưng không cung cấp request_id.
- Invalid field: Hãy reject schedule request với request_id = 'req A'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy reject schedule request với mã yêu cầu 15.

## remove_student_from_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`, `student_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy xóa student from class với mã lớp PRF192_SE1, mã sinh viên SE170001.

### Validation Cases
- Missing field: Hãy xóa student from class nhưng không cung cấp class_name.
- Invalid field: Hãy xóa student from class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy xóa student from class với mã lớp PRF192_SE1, mã sinh viên SE170001.

## search_user_by_name

- Agent: `people`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `full_name`

### Happy Path
- `ADMIN`: Tôi là admin, hãy search user by name với họ tên Nguyen Van A.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy search user by name với họ tên Nguyen Van A.
- `LECTURER`: Tôi là giảng viên, hãy search user by name với họ tên Nguyen Van A.

### Validation Cases
- Missing field: Hãy search user by name nhưng không cung cấp full_name.
- Invalid field: Hãy search user by name với full_name = 'full_name Nguyen Van A'.

### Permission Case
- `STUDENT`: Tôi là sinh viên, hãy search user by name với họ tên Nguyen Van A.

## send_email

- Agent: `notifications`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy send email.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy send email.
- `LECTURER`: Tôi là giảng viên, hãy send email.

### Permission Case
- `STUDENT`: Tôi là sinh viên, hãy send email.

## update_attendance_manually

- Agent: `attendance`
- Allowed roles: `LECTURER`
- Required fields: `status`, `student_code`, `session_id`

### Happy Path
- `LECTURER`: Tôi là giảng viên, hãy cập nhật attendance manually với trạng thái ACTIVE, mã sinh viên SE170001, mã phiên 101.

### Validation Cases
- Missing field: Hãy cập nhật attendance manually nhưng không cung cấp status.
- Invalid field: Hãy cập nhật attendance manually với status = 'on'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật attendance manually với trạng thái ACTIVE, mã sinh viên SE170001, mã phiên 101.

## update_class

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `class_name`, `lecturer_code`, `semester_code`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật class với mã lớp PRF192_SE1, mã giảng viên GV001, mã học kỳ SP26.

### Validation Cases
- Missing field: Hãy cập nhật class nhưng không cung cấp class_name.
- Invalid field: Hãy cập nhật class với class_name = 'lop 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật class với mã lớp PRF192_SE1, mã giảng viên GV001, mã học kỳ SP26.

## update_course

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `course_code`, `name`, `credits`, `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật course với mã môn PRF192, tên Khoa học mới, 3 tín chỉ, trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy cập nhật course nhưng không cung cấp course_code.
- Invalid field: Hãy cập nhật course với course_code = 'oop'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật course với mã môn PRF192, tên Khoa học mới, 3 tín chỉ, trạng thái ACTIVE.

## update_lecturer_info

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `lecturer_code`, `expertise`, `department`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật lecturer info với mã giảng viên GV001, chuyên môn Java, bộ môn CNTT.

### Validation Cases
- Missing field: Hãy cập nhật lecturer info nhưng không cung cấp lecturer_code.
- Invalid field: Hãy cập nhật lecturer info với lecturer_code = 'gv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật lecturer info với mã giảng viên GV001, chuyên môn Java, bộ môn CNTT.

## update_major

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`, `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật major với mã USR001, tên Khoa học mới, trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy cập nhật major nhưng không cung cấp code.
- Invalid field: Hãy cập nhật major với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật major với mã USR001, tên Khoa học mới, trạng thái ACTIVE.

## update_room

- Agent: `facilities`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `room_name`, `capacity`, `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật room với phòng A101, sức chứa 40, trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy cập nhật room nhưng không cung cấp room_name.
- Invalid field: Hãy cập nhật room với room_name = 'phong 1'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật room với phòng A101, sức chứa 40, trạng thái ACTIVE.

## update_semester

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `semester_code`, `name`, `start_date`, `end_date`, `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật semester với mã học kỳ SP26, tên Khoa học mới, ngày bắt đầu 2026-03-20, ngày kết thúc 2026-03-27, trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy cập nhật semester nhưng không cung cấp semester_code.
- Invalid field: Hãy cập nhật semester với semester_code = 'spring 2026'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật semester với mã học kỳ SP26, tên Khoa học mới, ngày bắt đầu 2026-03-20, ngày kết thúc 2026-03-27, trạng thái ACTIVE.

## update_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`, `status`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật specialization với mã USR001, tên Khoa học mới, trạng thái ACTIVE.

### Validation Cases
- Missing field: Hãy cập nhật specialization nhưng không cung cấp code.
- Invalid field: Hãy cập nhật specialization với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật specialization với mã USR001, tên Khoa học mới, trạng thái ACTIVE.

## update_student_info

- Agent: `people`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `student_code`, `major_code`, `major_name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật student info với mã sinh viên SE170001, mã ngành SE, ngành Công nghệ thông tin.

### Validation Cases
- Missing field: Hãy cập nhật student info nhưng không cung cấp student_code.
- Invalid field: Hãy cập nhật student info với student_code = 'sv abc'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật student info với mã sinh viên SE170001, mã ngành SE, ngành Công nghệ thông tin.

## update_sub_specialization

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`
- Required fields: `code`, `name`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật sub specialization với mã USR001, tên Khoa học mới.

### Validation Cases
- Missing field: Hãy cập nhật sub specialization nhưng không cung cấp code.
- Invalid field: Hãy cập nhật sub specialization với code = '??'.

### Permission Case
- `ADMIN`: Tôi là admin, hãy cập nhật sub specialization với mã USR001, tên Khoa học mới.

## update_user

- Agent: `admin`
- Allowed roles: `ADMIN`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy cập nhật user.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy cập nhật user.

## view_alerts

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở alerts.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở alerts.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở alerts.

## view_assignments

- Agent: `courses`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở assignments.
- `LECTURER`: Tôi là giảng viên, hãy mở assignments.
- `STUDENT`: Tôi là sinh viên, hãy mở assignments.

### Permission Case
- `ADMIN`: Tôi là admin, hãy mở assignments.

## view_classes

- Agent: `schedule`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở classes.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở classes.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở classes.

## view_courses

- Agent: `courses`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở courses.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở courses.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở courses.

## view_dashboard

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở dashboard.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở dashboard.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở dashboard.

## view_grades

- Agent: `grades`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở grades.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở grades.
- `LECTURER`: Tôi là giảng viên, hãy mở grades.
- `STUDENT`: Tôi là sinh viên, hãy mở grades.

## view_inactive_users

- Agent: `people`
- Allowed roles: `ADMIN`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở inactive users.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở inactive users.

## view_lecturers

- Agent: `people`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở lecturers.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở lecturers.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở lecturers.

## view_logs

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở logs.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở logs.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở logs.

## view_majors

- Agent: `courses`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở majors.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở majors.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở majors.

## view_messages

- Agent: `notifications`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở messages.
- `LECTURER`: Tôi là giảng viên, hãy mở messages.
- `STUDENT`: Tôi là sinh viên, hãy mở messages.

### Permission Case
- `ADMIN`: Tôi là admin, hãy mở messages.

## view_notifications

- Agent: `notifications`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở notifications.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở notifications.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở notifications.

## view_profile

- Agent: `people`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở profile.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở profile.
- `LECTURER`: Tôi là giảng viên, hãy mở profile.
- `STUDENT`: Tôi là sinh viên, hãy mở profile.

## view_results

- Agent: `admin`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở results.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở results.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở results.

## view_rooms

- Agent: `facilities`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở rooms.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở rooms.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở rooms.

## view_schedule

- Agent: `schedule`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`, `LECTURER`, `STUDENT`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở schedule.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở schedule.
- `LECTURER`: Tôi là giảng viên, hãy mở schedule.
- `STUDENT`: Tôi là sinh viên, hãy mở schedule.

## view_schedule_requests

- Agent: `schedule`
- Allowed roles: `ACADEMIC_STAFF`, `LECTURER`
- Required fields: `Không có`

### Happy Path
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở schedule requests.
- `LECTURER`: Tôi là giảng viên, hãy mở schedule requests.

### Permission Case
- `ADMIN`: Tôi là admin, hãy mở schedule requests.

## view_semesters

- Agent: `schedule`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở semesters.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở semesters.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở semesters.

## view_specializations

- Agent: `courses`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở specializations.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở specializations.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở specializations.

## view_students

- Agent: `people`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở students.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở students.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở students.

## view_sub_specializations

- Agent: `courses`
- Allowed roles: `ADMIN`, `ACADEMIC_STAFF`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở sub specializations.
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở sub specializations.

### Permission Case
- `LECTURER`: Tôi là giảng viên, hãy mở sub specializations.

## view_teaching_classes

- Agent: `schedule`
- Allowed roles: `LECTURER`
- Required fields: `Không có`

### Happy Path
- `LECTURER`: Tôi là giảng viên, hãy mở teaching classes.

### Permission Case
- `ADMIN`: Tôi là admin, hãy mở teaching classes.

## view_users

- Agent: `admin`
- Allowed roles: `ADMIN`
- Required fields: `Không có`

### Happy Path
- `ADMIN`: Tôi là admin, hãy mở users.

### Permission Case
- `ACADEMIC_STAFF`: Tôi là nhân viên đào tạo, hãy mở users.
