from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Set

from app.services.chat.router.core_tool_inventory import is_kept_tool

ROLE_GUIDANCE: Dict[str, str] = {
    "ADMIN": (
        "Ưu tiên trả lời chi tiết, rõ cấu trúc hệ thống, chính sách vận hành, dữ liệu quản trị, "
        "màn hình điều hướng và tác động thao tác. Khi câu hỏi chuyên môn học tập xuất hiện, vẫn trả lời đúng nhưng bao quát toàn hệ thống."
    ),
    "ACADEMIC_STAFF": (
        "Ưu tiên trả lời chi tiết về quy trình đào tạo, lớp học, lịch học, điểm, chuyên ngành, học kỳ, điều phối vận hành học thuật."
    ),
    "LECTURER": (
        "Ưu tiên góc nhìn giảng dạy: lớp phụ trách, lịch dạy, điểm danh, bảng điểm, sinh viên trong lớp. "
        "Nếu câu hỏi thiên về hệ thống, trả lời khái quát thay vì quá kỹ thuật."
    ),
    "STUDENT": (
        "Ưu tiên góc nhìn học tập cá nhân: lịch học, môn học, điểm số, điểm danh, thông báo, lớp học, yêu cầu học vụ. "
        "Nếu câu hỏi thiên về vận hành hệ thống, trả lời ngắn gọn, bao quát."
    ),
}


FIELD_META: Dict[str, Dict[str, str]] = {
    "class_name": {
        "label": "Mã lớp",
        "placeholder": "VD: PRF192_SE1 hoặc SE18B01-PRF192",
        "inputType": "text",
        "formatHint": "Định dạng mã lớp, ví dụ: PRF192_SE1 hoặc SE18B01-PRF192",
    },
    "student_code": {
        "label": "Mã sinh viên",
        "placeholder": "VD: SE170001",
        "inputType": "text",
        "formatHint": "Định dạng: SE******, HE****** hoặc IA******",
    },
    "lecturer_code": {
        "label": "Mã giảng viên",
        "placeholder": "VD: GV001",
        "inputType": "text",
        "formatHint": "Định dạng: GV******",
    },
    "course_code": {
        "label": "Mã môn học",
        "placeholder": "VD: PRF192",
        "inputType": "text",
        "formatHint": "Định dạng mã môn, ví dụ: PRF192, MAD101, OOP201",
    },
    "course_name": {
        "label": "Tên môn học",
        "placeholder": "VD: Programming Fundamentals",
        "inputType": "text",
    },
    "major_code": {
        "label": "Mã ngành",
        "placeholder": "VD: CNTT",
        "inputType": "text",
        "formatHint": "Định dạng mã ngành viết hoa, không dấu, ví dụ: CNTT hoặc SE",
    },
    "major_name": {
        "label": "Tên ngành",
        "placeholder": "VD: Công nghệ thông tin",
        "inputType": "text",
    },
    "specialization_code": {
        "label": "Mã chuyên ngành",
        "placeholder": "VD: SE",
        "inputType": "text",
        "formatHint": "Định dạng mã chuyên ngành viết hoa, ví dụ: SE",
    },
    "specialization_name": {
        "label": "Tên chuyên ngành",
        "placeholder": "VD: Kỹ thuật phần mềm",
        "inputType": "text",
    },
    "sub_specialization_code": {
        "label": "Mã chuyên ngành hẹp",
        "placeholder": "VD: AI",
        "inputType": "text",
        "formatHint": "Định dạng mã viết hoa, ví dụ: AI",
    },
    "sub_specialization_name": {
        "label": "Tên chuyên ngành hẹp",
        "placeholder": "VD: Trí tuệ nhân tạo",
        "inputType": "text",
    },
    "spec_code": {
        "label": "Mã chuyên ngành",
        "placeholder": "VD: SE",
        "inputType": "text",
        "formatHint": "Định dạng mã chuyên ngành viết hoa, ví dụ: SE",
    },
    "spec_name": {
        "label": "Tên chuyên ngành",
        "placeholder": "VD: Kỹ thuật phần mềm",
        "inputType": "text",
    },
    "sub_code": {
        "label": "Mã chuyên ngành hẹp",
        "placeholder": "VD: AI",
        "inputType": "text",
        "formatHint": "Định dạng mã viết hoa, ví dụ: AI",
    },
    "sub_name": {
        "label": "Tên chuyên ngành hẹp",
        "placeholder": "VD: Trí tuệ nhân tạo",
        "inputType": "text",
    },
    "semester_code": {
        "label": "Mã học kỳ",
        "placeholder": "VD: SP26",
        "inputType": "text",
        "formatHint": "Định dạng: SP26, SU26, FA25 hoặc WI26",
    },
    "semester_name": {
        "label": "Tên học kỳ",
        "placeholder": "VD: Spring 2026",
        "inputType": "text",
    },
    "room_name": {
        "label": "Tên phòng",
        "placeholder": "VD: A101 hoặc LAB01",
        "inputType": "text",
        "formatHint": "Định dạng phòng, ví dụ: A101, B204, LAB01",
    },
    "date": {
        "label": "Ngày",
        "placeholder": "VD: 2026-03-17 hoặc hôm nay",
        "inputType": "text",
        "formatHint": "Định dạng: YYYY-MM-DD hoặc từ khóa TODAY, TOMORROW, THIS_WEEK, NEXT_WEEK",
    },
    "start_date": {
        "label": "Ngày bắt đầu",
        "placeholder": "YYYY-MM-DD",
        "inputType": "date",
        "formatHint": "Định dạng: YYYY-MM-DD",
    },
    "original_date": {
        "label": "Ngày gốc",
        "placeholder": "YYYY-MM-DD",
        "inputType": "date",
        "formatHint": "Định dạng: YYYY-MM-DD",
    },
    "requested_date": {
        "label": "Ngày muốn đổi",
        "placeholder": "YYYY-MM-DD",
        "inputType": "date",
        "formatHint": "Định dạng: YYYY-MM-DD",
    },
    "end_date": {
        "label": "Ngày kết thúc",
        "placeholder": "YYYY-MM-DD",
        "inputType": "date",
        "formatHint": "Định dạng: YYYY-MM-DD",
    },
    "slot_number": {
        "label": "Slot",
        "placeholder": "VD: 1 hoặc ALL",
        "inputType": "number",
        "formatHint": "Số nguyên dương hoặc ALL nếu muốn xem tất cả slot",
    },
    "original_slot_number": {
        "label": "Slot gốc",
        "placeholder": "VD: 1",
        "inputType": "number",
        "formatHint": "Số nguyên dương, ví dụ: 1, 2, 3",
    },
    "requested_slot_number": {
        "label": "Slot muốn đổi",
        "placeholder": "VD: 2",
        "inputType": "number",
        "formatHint": "Số nguyên dương, ví dụ: 1, 2, 3",
    },
    "session_id": {
        "label": "Mã phiên điểm danh",
        "placeholder": "VD: 123",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "original_slot_id": {
        "label": "Slot gốc",
        "placeholder": "VD: 101",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "requested_slot_id": {
        "label": "Slot muốn đổi",
        "placeholder": "VD: 202",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "slot_id": {
        "label": "Mã slot",
        "placeholder": "VD: 456",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "request_id": {
        "label": "Mã yêu cầu",
        "placeholder": "VD: 15",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "status": {
        "label": "Trạng thái",
        "placeholder": "PRESENT / ABSENT / EXCUSED",
        "inputType": "text",
        "formatHint": "Giá trị hợp lệ: PRESENT, ABSENT, EXCUSED, LATE, PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE",
    },
    "reason": {
        "label": "Lý do",
        "placeholder": "Nhập lý do",
        "inputType": "textarea",
    },
    "content": {
        "label": "Nội dung",
        "placeholder": "Nhập nội dung cần gửi",
        "inputType": "textarea",
    },
    "title": {
        "label": "Tiêu đề thông báo",
        "placeholder": "VD: Thông báo nghỉ học ngày mai",
        "inputType": "text",
    },
    "subject": {
        "label": "Tiêu đề email",
        "placeholder": "VD: Thông báo nghỉ học ngày mai",
        "inputType": "text",
    },
    "recipient_code": {
        "label": "Mã người nhận",
        "placeholder": "VD: SE170001 hoặc GV001",
        "inputType": "text",
        "formatHint": "Mã người nhận trong hệ thống, ví dụ: SE170001 hoặc GV001",
    },
    "target_type": {
        "label": "Nhóm người nhận",
        "placeholder": "CLASS / ROLE / ALL / USER",
        "inputType": "text",
        "formatHint": "Giá trị hợp lệ: CLASS, ROLE, ALL, USER",
    },
    "request_type": {
        "label": "Loại đơn",
        "placeholder": "PAUSE_SEMESTER / RETAKE_COURSE / CHANGE_CLASS ...",
        "inputType": "text",
        "formatHint": "Giá trị hợp lệ: PAUSE_SEMESTER, RETAKE_COURSE, CHANGE_CLASS, OVERLOAD_STUDY, ABSENT_REQUEST, GRADE_APPEAL, CHANGE_MAJOR, CHANGE_SPECIALIZATION, OTHERS",
    },
    "request_title": {
        "label": "Tiêu đề đơn",
        "placeholder": "VD: Đơn đề nghị hỗ trợ học vụ",
        "inputType": "text",
    },
    "to_class_name": {
        "label": "Lớp muốn chuyển đến",
        "placeholder": "VD: SE18B06-PRF192",
        "inputType": "text",
        "formatHint": "Định dạng mã lớp, ví dụ: PRF192_SE1 hoặc SE18B01-PRF192",
    },
    "to_major": {
        "label": "Ngành muốn chuyển",
        "placeholder": "VD: Công nghệ thông tin",
        "inputType": "text",
    },
    "to_specialization": {
        "label": "Chuyên ngành muốn chuyển",
        "placeholder": "VD: Kỹ thuật phần mềm",
        "inputType": "text",
    },
    "to_sub_specialization": {
        "label": "Chuyên ngành hẹp muốn chuyển",
        "placeholder": "VD: Trí tuệ nhân tạo",
        "inputType": "text",
    },
    "code": {
        "label": "Mã",
        "placeholder": "Nhập mã",
        "inputType": "text",
        "formatHint": "Mã định danh của đối tượng, ví dụ: GV001, SE170001, PRF192, SP26",
    },
    "name": {
        "label": "Tên",
        "placeholder": "Nhập tên",
        "inputType": "text",
    },
    "credits": {
        "label": "Số tín chỉ",
        "placeholder": "VD: 3",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "capacity": {
        "label": "Sức chứa",
        "placeholder": "VD: 30",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "expertise": {
        "label": "Chuyên môn",
        "placeholder": "VD: Java, AI, Database",
        "inputType": "text",
    },
    "department": {
        "label": "Bộ môn",
        "placeholder": "VD: CNTT",
        "inputType": "text",
    },
    "full_name": {
        "label": "Họ và tên",
        "placeholder": "VD: Nguyễn Văn A",
        "inputType": "text",
    },
    "threshold_absences": {
        "label": "Ngưỡng số buổi vắng",
        "placeholder": "VD: 3",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "credit_threshold": {
        "label": "Ngưỡng tín chỉ",
        "placeholder": "VD: 120",
        "inputType": "number",
        "formatHint": "Số nguyên dương",
    },
    "time_start": {
        "label": "Giờ bắt đầu",
        "placeholder": "VD: 07:00",
        "inputType": "text",
        "formatHint": "Định dạng giờ: HH:MM",
    },
    "time_end": {
        "label": "Giờ kết thúc",
        "placeholder": "VD: 09:00",
        "inputType": "text",
        "formatHint": "Định dạng giờ: HH:MM",
    },
    "start_time": {
        "label": "Giờ bắt đầu",
        "placeholder": "VD: 07:00",
        "inputType": "text",
        "formatHint": "Định dạng giờ: HH:MM",
    },
    "end_time": {
        "label": "Giờ kết thúc",
        "placeholder": "VD: 09:00",
        "inputType": "text",
        "formatHint": "Định dạng giờ: HH:MM",
    },
    "semester": {
        "label": "Học kỳ",
        "placeholder": "VD: Spring 2026 hoặc SP26",
        "inputType": "text",
    },
    "role": {
        "label": "Vai trò",
        "placeholder": "ADMIN / ACADEMIC_STAFF / LECTURER / STUDENT",
        "inputType": "text",
        "formatHint": "Giá trị hợp lệ: ADMIN, ACADEMIC_STAFF, LECTURER, STUDENT",
    },
    "user_code": {
        "label": "Mã người dùng",
        "placeholder": "VD: SE170001 hoặc GV001",
        "inputType": "text",
        "formatHint": "Mã định danh người dùng, ví dụ: SE170001 hoặc GV001",
    },
    "gpa_threshold": {
        "label": "Ngưỡng GPA",
        "placeholder": "VD: 2.0",
        "inputType": "number",
        "formatHint": "Số thực không âm, ví dụ: 2.0 hoặc 2.5",
    },
    "keyword": {
        "label": "Từ khóa",
        "placeholder": "VD: Java, CNTT, Nguyễn Văn A",
        "inputType": "text",
    },
}

_FIELD_PATTERNS: Dict[str, str] = {
    "student_code": r"^(SE|HE|IA)\d{5,6}$",
    "lecturer_code": r"^GV\d{2,6}$",
    "course_code": r"^[A-Z]{2,6}\d{2,4}$",
    "major_code": r"^[A-Z0-9]{2,10}$",
    "specialization_code": r"^[A-Z0-9]{2,10}$",
    "sub_specialization_code": r"^[A-Z0-9]{2,10}$",
    "semester_code": r"^(SP|SU|FA|WI)\d{2}$",
    "room_name": r"^[A-Z0-9][A-Z0-9_-]{1,19}$",
    "class_name": r"^[A-Z0-9][A-Z0-9_-]{2,39}$",
    "date": r"^(\d{4}-\d{2}-\d{2}|TODAY|TOMORROW|THIS_WEEK|NEXT_WEEK)$",
    "start_date": r"^\d{4}-\d{2}-\d{2}$",
    "original_date": r"^\d{4}-\d{2}-\d{2}$",
    "requested_date": r"^\d{4}-\d{2}-\d{2}$",
    "end_date": r"^\d{4}-\d{2}-\d{2}$",
    "slot_number": r"^(\d+|ALL)$",
    "original_slot_number": r"^\d+$",
    "requested_slot_number": r"^\d+$",
    "session_id": r"^\d+$",
    "original_slot_id": r"^\d+$",
    "requested_slot_id": r"^\d+$",
    "slot_id": r"^\d+$",
    "request_id": r"^\d+$",
    "credits": r"^\d+$",
    "capacity": r"^\d+$",
    "threshold_absences": r"^\d+$",
    "credit_threshold": r"^\d+$",
    "gpa_threshold": r"^\d+(\.\d+)?$",
    "time_start": r"^\d{2}:\d{2}$",
    "time_end": r"^\d{2}:\d{2}$",
    "start_time": r"^\d{2}:\d{2}$",
    "end_time": r"^\d{2}:\d{2}$",
}

_UPPERCASE_FIELDS = {
    "student_code",
    "lecturer_code",
    "course_code",
    "major_code",
    "specialization_code",
    "spec_code",
    "sub_specialization_code",
    "sub_code",
    "semester_code",
    "room_name",
    "class_name",
    "status",
    "role",
    "code",
}

_ALLOWED_ENUMS: Dict[str, Set[str]] = {
    "status": {"PRESENT", "ABSENT", "EXCUSED", "LATE", "PENDING", "APPROVED", "REJECTED", "ACTIVE", "INACTIVE"},
    "role": {"ADMIN", "ACADEMIC_STAFF", "LECTURER", "STUDENT"},
    "target_type": {"CLASS", "ROLE", "ALL", "USER"},
    "request_type": {
        "PAUSE_SEMESTER",
        "RETAKE_COURSE",
        "CHANGE_CLASS",
        "OVERLOAD_STUDY",
        "ABSENT_REQUEST",
        "GRADE_APPEAL",
        "CHANGE_MAJOR",
        "CHANGE_SPECIALIZATION",
        "OTHERS",
    },
}

_STRICT_REQUIRED_PREFIXES = (
    "create_",
    "update_",
    "approve_",
    "reject_",
    "add_",
    "remove_",
    "assign_",
    "activate_",
    "import_",
    "export_",
    "send_",
)

_STRICT_REQUIRED_TOOLS = set()


EXPLICIT_REQUIRED_FIELDS: Dict[str, List[str]] = {
    "activate_user": ["code"],
    "add_student_to_class": ["class_name", "student_code"],
    "approve_schedule_request": ["request_id"],
    "assign_course_to_specialization": ["specialization_code", "specialization_name", "course_code", "course_name"],
    "assign_course_to_sub_specialization": ["sub_specialization_code", "sub_specialization_name", "course_code", "course_name"],
    "count_rooms_by_status": ["status"],
    "count_students_by_major": ["major_name", "major_code"],
    "count_users_by_role": ["role"],
    "create_notification": ["title", "content"],
    "create_class": ["class_name", "course_code", "lecturer_code", "semester_code"],
    "create_academic_request": ["request_type", "reason"],
    "create_course": ["code", "name", "credits"],
    "create_group_chat": ["class_name"],
    "create_major": ["code", "name"],
    "create_user": ["code", "full_name", "email", "role"],
    "create_room": ["name", "capacity"],
    "create_schedule_request": ["class_name", "original_date", "original_slot_number", "original_slot_id", "requested_date", "requested_slot_number", "requested_slot_id", "reason"],
    "create_semester": ["code", "name", "start_date", "end_date"],
    "create_specialization": ["major_code", "major_name", "spec_code", "spec_name"],
    "create_sub_specialization": ["sub_code", "sub_name", "spec_code", "specialization_code", "specialization_name"],
    "get_abnormal_attendance": [],
    "get_active_semester": [],
    "get_attendance_by_session_id": ["session_id"],
    "get_attendance_report_by_student": [],
    "get_my_attendance_overview": [],
    "get_my_absence_history": [],
    "get_my_attendance_risk_courses": [],
    "get_attendance_by_slot": ["class_name", "date"],
    "get_absence_rate_by_class": ["class_name"],
    "get_attendance_by_slot_number": ["slot_number", "date"],
    "get_attendance_heatmap": ["class_name"],
    "get_attendance_rate_by_course": ["course_name", "course_code"],
    "get_attendance_stats_by_class": ["class_name"],
    "get_attendance_trends": ["class_name"],
    "get_available_classes_for_student": ["semester_code", "semester_name", "student_code"],
    "get_available_slots_for_room": ["room_name", "date"],
    "get_best_performing_classes": ["semester_code", "semester_name"],
    "get_class_health_check": ["class_name"],
    "get_class_info": ["class_name"],
    "get_class_leaderboard": ["semester_code", "semester_name"],
    "get_class_next_session": ["class_name"],
    "get_class_schedule": ["class_name", "date"],
    "get_classes_by_semester": ["semester_code", "semester_name", "semester"],
    "get_classmates": ["student_code"],
    "get_consecutive_absences": ["class_name"],
    "get_courses_by_name": ["course_name", "course_code"],
    "get_courses_by_semester": ["semester_code", "semester_name", "semester"],
    "get_courses_by_spec": ["specialization_name", "specialization_code", "major_name"],
    "get_courses_by_sub_spec": ["sub_specialization_name", "sub_specialization_code", "specialization_name"],
    "get_detail_course_grade": ["course_name", "course_code"],
    "get_empty_rooms": ["date"],
    "get_enrollments_by_class": ["class_name"],
    "get_full_grade_sheet": ["class_name"],
    "get_gpa_stats_by_major": ["major_name", "major_code"],
    "get_grade_components_by_course": ["course_name", "course_code"],
    "get_grade_distribution": ["class_name"],
    "get_grade_histogram": ["class_name"],
    "get_grade_improvement_on_retake": ["course_code", "course_name"],
    "get_grade_report_by_class": ["class_name"],
    "get_grade_report_by_course": ["course_name", "course_code"],
    "get_grade_trend_by_student": [],
    "get_high_risk_classes": ["semester_code", "semester_name"],
    "get_idle_lecturers": ["semester_code", "semester_name"],
    "get_lecturer_by_code": ["lecturer_code", "full_name"],
    "get_lecturer_schedule_by_search": ["lecturer_code", "full_name", "date"],
    "get_lecturer_workload": ["lecturer_code", "full_name"],
    "get_lecturer_workload_comparison": ["semester_code", "semester_name"],
    "get_lecturers_by_expertise": ["expertise", "department", "course_name"],
    "get_lecturers_by_major": ["major_name", "major_code", "department", "course_name"],
    "get_major_id_by_name": ["major_name", "major_code"],
    "get_major_curriculum_tree": ["major_code", "major_name"],
    "get_my_attendance_status": [],
    "get_my_courses": [],
    "get_my_grades": [],
    "get_my_notifications": [],
    "get_my_schedule": [],
    "get_my_schedule_requests": [],
    "get_my_schedule_targeted": [],
    "get_most_absent_students": ["class_name"],
    "get_notification_history_for_user": ["user_code"],
    "get_other_lecturer_schedule": ["lecturer_code", "full_name", "date"],
    "get_other_student_schedule": ["student_code", "full_name", "date"],
    "get_schedule_request_list": ["status"],
    "get_room_fill_rate_by_weekday": ["room_name"],
    "get_room_info": ["room_name"],
    "get_room_usage_weekly": ["room_name", "date"],
    "get_schedule_request_detail": ["request_id"],
    "get_semester_overview": ["semester_code", "semester_name"],
    "get_sessions_by_class": ["class_name"],
    "get_shared_courses_across_specs": ["course_code", "course_name"],
    "get_slot_detail_by_id": ["slot_id"],
    "get_slots_by_date": ["date"],
    "get_slots_by_slot_number": ["slot_number", "date"],
    "get_slots_by_time_range": ["date", "time_start", "time_end"],
    "get_suitable_rooms_for_class": ["class_name"],
    "get_specialization_id_by_name": ["specialization_name", "specialization_code"],
    "get_specializations_by_major": ["major_name", "major_code"],
    "get_student_academic_standing": ["student_code"],
    "get_student_academic_timeline": [],
    "get_student_attendance_by_class": ["student_code", "class_name"],
    "get_student_by_code": ["student_code", "full_name"],
    "get_student_gpa_comparison": ["student_code", "full_name"],
    "get_student_ranking_in_class": ["class_name"],
    "get_student_schedule_by_search": ["student_code", "full_name", "date"],
    "get_student_vs_class_grade": ["class_name", "student_code"],
    "get_students_at_risk": ["gpa_threshold", "major_name", "major_code"],
    "get_students_by_class": ["class_name", "course_code", "course_name"],
    "get_students_by_major": ["major_name", "major_code"],
    "get_students_without_class": [],
    "get_sub_specializations": ["specialization_name", "specialization_code", "major_name"],
    "get_teaching_effectiveness": ["semester_code", "semester_name"],
    "get_timetable_conflicts": ["lecturer_code", "date"],
    "get_top_students": [],
    "get_top_lecturers_by_pass_rate": ["semester_code", "semester_name"],
    "get_user_by_code": ["code"],
    "get_weekly_timetable_grid": ["date", "start_date", "end_date"],
    "get_makeup_slot_candidates": ["class_name", "start_time", "end_time"],
    "list_courses": [],
    "list_majors": [],
    "list_notifications": [],
    "list_semesters": [],
    "reject_schedule_request": ["request_id"],
    "remove_student_from_class": ["class_name", "student_code"],
    "search_user_by_name": ["full_name"],
    "send_email": ["content"],
    "update_attendance_manually": ["status", "student_code", "session_id"],
    "update_class": ["class_name", "lecturer_code", "semester_code"],
    "update_course": ["course_code", "name", "credits", "status"],
    "update_lecturer_info": ["lecturer_code", "expertise", "department"],
    "update_major": ["code", "name", "status"],
    "update_room": ["room_name", "capacity", "status"],
    "update_semester": ["semester_code", "name", "start_date", "end_date", "status"],
    "update_specialization": ["code", "name", "status"],
    "update_student_info": ["student_code", "major_code", "major_name"],
    "update_sub_specialization": ["code", "name"],
    "update_user": ["code"],
    "view_inactive_users": [],
}

REQUIRED_FIELD_GROUPS: Dict[str, List[List[str]]] = {
    "assign_course_to_specialization": [
        ["specialization_code", "specialization_name"],
        ["course_code", "course_name"],
    ],
    "assign_course_to_sub_specialization": [
        ["sub_specialization_code", "sub_specialization_name"],
        ["course_code", "course_name"],
    ],
    "create_specialization": [
        ["major_code", "major_name"],
        ["spec_code"],
        ["spec_name"],
    ],
    "create_schedule_request": [
        ["class_name", "original_slot_id"],
        ["original_date", "original_slot_id"],
        ["original_slot_number", "original_slot_id"],
        ["requested_date", "requested_slot_id"],
        ["requested_slot_number", "requested_slot_id"],
        ["reason"],
    ],
    "create_sub_specialization": [
        ["spec_code", "specialization_code", "specialization_name"],
        ["sub_code"],
        ["sub_name"],
    ],
    "update_student_info": [
        ["student_code"],
        ["major_code", "major_name"],
    ],
}


SELF_SERVICE_TOOLS: Set[str] = {
    "count_unread_notifications",
    "get_abnormal_attendance",
    "get_active_semester",
    "get_all_rooms_today",
    "get_attendance_report_by_student",
    "get_gpa_stats_by_major",
    "get_grade_trend_by_student",
    "get_my_absence_history",
    "get_my_attendance_overview",
    "get_my_attendance_risk_courses",
    "get_my_attendance_status",
    "get_my_courses",
    "get_my_grades",
    "get_my_notifications",
    "get_my_schedule",
    "get_my_schedule_requests",
    "get_my_schedule_targeted",
    "get_open_sessions_now",
    "get_own_grades",
    "get_own_schedule",
    "get_rooms_busy_now",
    "get_semester_countdown",
    "get_student_academic_timeline",
    "get_slot_time_info",
    "list_courses",
    "list_lecturers",
    "list_majors",
    "list_notifications",
    "list_semesters",
}


AGENT_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "general": {
        "label": "General AI Agent",
        "guidance": (
            "Tập trung vào các câu hỏi ngoài lề hệ thống FAMS như kiến thức phổ thông, toán đơn giản, "
            "đời sống, lời khuyên nhẹ nhàng, giao tiếp thường ngày. Không giả vờ đây là dữ liệu từ hệ thống FAMS."
        ),
        "keywords": [],
    },
    "people": {
        "label": "People Agent",
        "guidance": "Tập trung vào người dùng, sinh viên, giảng viên, hồ sơ, vai trò, danh sách cá nhân và quan hệ lớp-người.",
        "keywords": ["sinh viên", "student", "giảng viên", "lecturer", "người dùng", "user", "hồ sơ", "profile", "gpa", "xếp hạng"],
    },
    "courses": {
        "label": "Courses Agent",
        "guidance": "Tập trung vào môn học, ngành, chuyên ngành, chuyên ngành hẹp, khung chương trình, tín chỉ, cấu trúc điểm.",
        "keywords": ["môn", "course", "ngành", "major", "chuyên ngành", "specialization", "curriculum", "tín chỉ"],
    },
    "schedule": {
        "label": "Schedule Agent",
        "guidance": "Tập trung vào lịch học, lịch dạy, học kỳ, lớp, slot, đổi lịch, thời khóa biểu, yêu cầu lịch.",
        "keywords": ["lịch", "schedule", "slot", "học kỳ", "semester", "thời khóa biểu", "đổi lịch", "class", "lớp"],
    },
    "attendance": {
        "label": "Attendance Agent",
        "guidance": "Tập trung vào điểm danh, buổi học, tỷ lệ chuyên cần, vắng mặt, bất thường điểm danh.",
        "keywords": ["điểm danh", "attendance", "vắng", "chuyên cần", "session"],
    },
    "grades": {
        "label": "Grades Agent",
        "guidance": "Tập trung vào điểm số, thành phần điểm, phổ điểm, GPA, bảng điểm, học lực.",
        "keywords": ["điểm", "grade", "gpa", "score", "bảng điểm", "phổ điểm"],
    },
    "facilities": {
        "label": "Facilities Agent",
        "guidance": "Tập trung vào phòng học, sức chứa, phòng trống, sử dụng phòng, cơ sở vật chất hỗ trợ học tập.",
        "keywords": ["phòng", "room", "lab", "sức chứa", "cơ sở vật chất"],
    },
    "notifications": {
        "label": "Notifications Agent",
        "guidance": "Tập trung vào thông báo, email, gửi tin, lịch sử gửi, trạng thái đọc.",
        "keywords": ["thông báo", "notification", "email", "tin nhắn", "message"],
    },
    "admin": {
        "label": "Admin Agent",
        "guidance": "Tập trung vào màn hình quản trị, thống kê hệ thống, logs, alerts, dashboard, thao tác quản lý dữ liệu nền.",
        "keywords": ["admin", "quản trị", "dashboard", "log", "alert", "cảnh báo", "hệ thống"],
    },
}


TOOL_AGENT_OVERRIDES: Dict[str, str] = {
    "general_offtopic_chat": "general",
    "fpt_tool": "general",
    "fptu_knowledge_lookup": "general",
    "view_users": "admin",
    "view_logs": "admin",
    "view_alerts": "admin",
    "view_dashboard": "admin",
    "count_users_by_role": "admin",
    "create_user": "admin",
    "update_user": "admin",
    "activate_user": "admin",
    "create_notification": "notifications",
    "create_academic_request": "notifications",
    "create_group_chat": "notifications",
    "send_email": "notifications",
    "list_notifications": "notifications",
    "get_my_notifications": "notifications",
    "count_unread_notifications": "notifications",
    "get_notification_history_for_user": "notifications",
    "get_system_broadcast_stats": "notifications",
    "get_class_schedule": "schedule",
    "get_own_schedule": "schedule",
    "get_other_lecturer_schedule": "schedule",
    "get_other_student_schedule": "schedule",
    "get_schedule_request_list": "schedule",
    "get_schedule_request_detail": "schedule",
    "get_my_schedule_requests": "schedule",
    "create_schedule_request": "schedule",
    "approve_schedule_request": "schedule",
    "reject_schedule_request": "schedule",
    "get_attendance_by_slot": "attendance",
    "get_absence_rate_by_class": "attendance",
    "get_attendance_by_session_id": "attendance",
    "get_attendance_by_slot_number": "attendance",
    "get_attendance_stats_by_class": "attendance",
    "get_attendance_report_by_student": "attendance",
    "get_my_attendance_overview": "attendance",
    "get_my_absence_history": "attendance",
    "get_my_attendance_risk_courses": "attendance",
    "get_attendance_rate_by_course": "attendance",
    "get_attendance_heatmap": "attendance",
    "get_consecutive_absences": "attendance",
    "update_attendance_manually": "attendance",
    "export_attendance_stats": "attendance",
    "get_grade_report_by_class": "grades",
    "get_grade_report_by_course": "grades",
    "get_detail_course_grade": "grades",
    "get_own_grades": "grades",
    "get_grade_distribution": "grades",
    "get_grade_components_by_course": "grades",
    "import_component_grades": "grades",
    "view_messages": "notifications",
    "view_assignments": "courses",
    "view_exam_grades": "grades",
    "view_resit_grades": "grades",
    "view_wifi_aps": "admin",
}

_FALLBACK_NAV_TOOLS: Set[str] = {
    "view_profile",
    "view_users",
    "view_inactive_users",
    "view_notifications",
    "view_dashboard",
    "view_logs",
    "view_alerts",
    "view_students",
    "view_lecturers",
    "view_majors",
    "view_courses",
    "view_rooms",
    "view_semesters",
    "view_classes",
    "view_schedule",
    "view_results",
    "view_specializations",
    "view_sub_specializations",
    "view_teaching_classes",
    "view_grades",
    "view_messages",
    "view_assignments",
    "view_exam_grades",
    "view_resit_grades",
    "view_wifi_aps",
    "view_attendance_config",
    "view_schedule_requests",
}


def unique(seq: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for item in seq:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def get_tool_agent(tool_name: str) -> str:
    if tool_name in TOOL_AGENT_OVERRIDES:
        return TOOL_AGENT_OVERRIDES[tool_name]
    if tool_name.startswith(("get_attendance", "update_attendance")) or "attendance" in tool_name:
        return "attendance"
    if "grade" in tool_name or "gpa" in tool_name:
        return "grades"
    if any(token in tool_name for token in ("schedule", "semester", "slot", "class", "timetable")):
        return "schedule"
    if any(token in tool_name for token in ("room", "wifi")):
        return "facilities"
    if any(token in tool_name for token in ("notification", "email", "message")):
        return "notifications"
    if any(token in tool_name for token in ("course", "major", "specialization", "curriculum")):
        return "courses"
    if any(token in tool_name for token in ("student", "lecturer", "user", "profile")):
        return "people"
    return "admin"


def detect_agent(message: str, tool_name: str = "") -> str:
    if tool_name:
        return get_tool_agent(tool_name)

    msg = message.lower()
    best_agent = "schedule"
    best_score = -1
    for agent, config in AGENT_DEFINITIONS.items():
        score = sum(1 for kw in config["keywords"] if kw in msg)
        if score > best_score:
            best_agent = agent
            best_score = score
    return best_agent


def get_agent_guidance(agent_id: str) -> str:
    return str(AGENT_DEFINITIONS.get(agent_id, {}).get("guidance", "Ưu tiên chọn tool phù hợp nhất với ý định của người dùng."))


def get_role_guidance(role: str) -> str:
    return ROLE_GUIDANCE.get(role, ROLE_GUIDANCE["STUDENT"])


def infer_required_fields(tool_name: str) -> List[str]:
    if tool_name.startswith("view_") or tool_name in SELF_SERVICE_TOOLS:
        return []
    return EXPLICIT_REQUIRED_FIELDS.get(tool_name, [])


def infer_required_field_groups(tool_name: str) -> List[List[str]]:
    groups = REQUIRED_FIELD_GROUPS.get(tool_name)
    if groups:
        return groups
    return [[field] for field in infer_required_fields(tool_name)]


def require_all_required_fields(tool_name: str) -> bool:
    return tool_name.startswith(_STRICT_REQUIRED_PREFIXES) or tool_name in _STRICT_REQUIRED_TOOLS


def _normalize_field_value(field: str, value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip()
        if field in _UPPERCASE_FIELDS:
            value = value.upper()
    return value


def _is_valid_field_value(field: str, value: Any) -> bool:
    if value in (None, "", []):
        return False

    normalized = _normalize_field_value(field, value)
    normalized_text = str(normalized).strip()
    if not normalized_text:
        return False

    allowed_values = _ALLOWED_ENUMS.get(field)
    if allowed_values is not None:
        return normalized_text.upper() in allowed_values

    pattern = _FIELD_PATTERNS.get(field)
    if pattern:
        return bool(re.fullmatch(pattern, normalized_text, re.IGNORECASE))

    return True


def validate_required_entities(tool_name: str, entities: Dict[str, Any]) -> Dict[str, Any]:
    required_fields = infer_required_fields(tool_name)
    cleaned = dict(entities or {})
    invalid_fields: List[str] = []

    for field in required_fields:
        raw_value = cleaned.get(field)
        normalized = _normalize_field_value(field, raw_value)
        if normalized not in (None, "", []):
            cleaned[field] = normalized
        if raw_value in (None, "", []):
            continue
        if not _is_valid_field_value(field, normalized):
            cleaned.pop(field, None)
            invalid_fields.append(field)

    cleaned["__invalid_required_fields__"] = invalid_fields
    return cleaned


def has_enough_required_entities(tool_name: str, entities: Dict[str, Any]) -> bool:
    required_fields = infer_required_fields(tool_name)
    if not required_fields:
        return True

    valid_fields = [
        field for field in required_fields
        if entities.get(field) not in (None, "", []) and field not in set(entities.get("__invalid_required_fields__", []) or [])
    ]
    if require_all_required_fields(tool_name):
        valid_set = set(valid_fields)
        groups = infer_required_field_groups(tool_name)
        return all(any(field in valid_set for field in group) for group in groups)
    return len(valid_fields) >= 1


def get_agent_label(agent_id: str) -> str:
    return str(AGENT_DEFINITIONS.get(agent_id, {}).get("label", "General Agent"))


def get_tool_inventory(formatted_tools: Dict[str, str]) -> Dict[str, List[str]]:
    inventory: Dict[str, List[str]] = {agent_id: [] for agent_id in AGENT_DEFINITIONS}
    for tool_name in formatted_tools:
        inventory.setdefault(get_tool_agent(tool_name), []).append(tool_name)
    for tools in inventory.values():
        tools.sort()
    return inventory


def build_agent_tool_list(
    *,
    role: str,
    agent_id: str,
    formatted_tools: Dict[str, str],
    role_tools: Dict[str, Set[str]],
) -> str:
    local_formatted = dict(formatted_tools or {})
    local_role_tools = {k: set(v) for k, v in (role_tools or {}).items()}

    if not local_formatted:
        local_formatted = _build_fallback_formatted_tools()

    allowed = local_role_tools.get(role, set())
    if not allowed:
        local_role_tools = _build_fallback_role_tools(local_formatted)
        allowed = local_role_tools.get(role, set())

    lines = [
        f"  • {name}: {desc}"
        for name, desc in local_formatted.items()
        if name in allowed and get_tool_agent(name) == agent_id
    ]
    virtual_tools = {
        "general_offtopic_chat": (
            "Trả lời bằng trí tuệ AI cho các câu hỏi ngoài lề hệ thống như toán đơn giản, "
            "kiến thức phổ thông, đời sống, giao tiếp thường ngày."
        ),
    }
    if role in {"STUDENT", "LECTURER"}:
        virtual_tools["fpt_tool"] = (
            "Tra cứu tri thức FPTU từ file nội bộ: EOS/SEB, OJT, Global Program, học phí chung, "
            "campus, career, guideline và các quy định học tập."
        )
    for name, desc in virtual_tools.items():
        if get_tool_agent(name) == agent_id:
            lines.append(f"  • {name}: {desc}")
    if not lines:
        lines = [f"  • {name}: {desc}" for name, desc in local_formatted.items() if name in allowed]
        for name, desc in virtual_tools.items():
            lines.append(f"  • {name}: {desc}")
    return "\n".join(lines)


def _build_fallback_formatted_tools() -> Dict[str, str]:
    from app.services.chat.db.queries import TEMPLATES

    fallback: Dict[str, str] = {}
    surfaced = set(TEMPLATES.keys()) | set(EXPLICIT_REQUIRED_FIELDS.keys()) | set(_FALLBACK_NAV_TOOLS)
    for name in surfaced:
        if name.startswith("delete_") or not is_kept_tool(name):
            continue
        prefix = "[NAV] " if name.startswith("view_") else ("[ACTION] " if require_all_required_fields(name) else "[DATA] ")
        req_fields = infer_required_fields(name)
        entities_str = f" entities:{{{','.join(req_fields)}}}" if req_fields else ""
        fallback[name] = f"{prefix}{name.replace('_', ' ')}{entities_str}"
    return fallback


def _build_fallback_role_tools(formatted_tools: Dict[str, str]) -> Dict[str, Set[str]]:
    from app.services.chat.router.permissions import POLICIES, Role

    available = set(formatted_tools.keys())
    fallback: Dict[str, Set[str]] = {role.value: set() for role in Role}
    for role in Role:
        policy = POLICIES[role]
        if policy.allow_all:
            fallback[role.value] = available - set(policy.deny)
        else:
            fallback[role.value] = set(policy.allow) & available
    return fallback


def build_missing_fields(tool_name: str, entities: Dict[str, Any]) -> List[Dict[str, str]]:
    fields = infer_required_fields(tool_name)
    invalid_fields = set(entities.get("__invalid_required_fields__", []) or [])
    strict_required = require_all_required_fields(tool_name)
    if not strict_required and has_enough_required_entities(tool_name, entities):
        return []
    missing: List[Dict[str, str]] = []
    unsatisfied_group_fields: Set[str] = set()
    if strict_required:
        for group in infer_required_field_groups(tool_name):
            if any(entities.get(field) not in (None, "", []) and field not in invalid_fields for field in group):
                continue
            unsatisfied_group_fields.update(group)
    for field in fields:
        if strict_required and field not in unsatisfied_group_fields and field not in invalid_fields:
            continue
        if strict_required and entities.get(field) not in (None, "", []) and field not in invalid_fields:
            continue
        if not strict_required and entities.get(field) not in (None, "", []) and field not in invalid_fields:
            continue
        meta = FIELD_META.get(field, {})
        format_hint = meta.get("formatHint", "")
        group = next((g for g in infer_required_field_groups(tool_name) if field in g), [field])
        grouped_hint = ""
        if strict_required and len(group) > 1:
            labels = [FIELD_META.get(item, {}).get("label", item.replace("_", " ")) for item in group]
            grouped_hint = f" Bạn có thể nhập một trong các trường sau: {', '.join(labels)}."
        if field in invalid_fields:
            question = f"{meta.get('label', field.replace('_', ' '))} chưa đúng định dạng. {format_hint}".strip()
        else:
            if strict_required:
                question = f"Vui lòng cung cấp {meta.get('label', field.replace('_', ' '))}."
            else:
                question = f"Bạn có thể nhập {meta.get('label', field.replace('_', ' '))}. Chỉ cần một thông tin đúng là đủ."
            if grouped_hint:
                question = f"{question}{grouped_hint}"
            if format_hint:
                question = f"{question} {format_hint}"
        missing.append({
            "id": field,
            "name": field,
            "label": meta.get("label", field.replace("_", " ").title()),
            "placeholder": meta.get("placeholder", f"Nhập {field}"),
            "inputType": meta.get("inputType", "text"),
            "question": question,
            "required": strict_required and len(group) == 1,
        })
    return missing


def build_action_review_fields(tool_name: str, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
    fields = infer_required_fields(tool_name)
    invalid_fields = set(entities.get("__invalid_required_fields__", []) or [])
    review_fields: List[Dict[str, Any]] = []
    groups = infer_required_field_groups(tool_name)
    for field in fields:
        meta = FIELD_META.get(field, {})
        format_hint = meta.get("formatHint", "")
        current_value = entities.get(field)
        group = next((g for g in groups if field in g), [field])
        grouped_hint = ""
        if len(group) > 1:
            labels = [FIELD_META.get(item, {}).get("label", item.replace("_", " ")) for item in group]
            grouped_hint = f" Bạn có thể dùng một trong các trường: {', '.join(labels)}."
        if field in invalid_fields:
            question = f"{meta.get('label', field.replace('_', ' '))} chưa đúng định dạng."
            if format_hint:
                question = f"{question} {format_hint}"
        elif current_value not in (None, "", []):
            question = f"Kiểm tra lại {meta.get('label', field.replace('_', ' '))} trước khi thực hiện thao tác."
            if format_hint:
                question = f"{question} {format_hint}"
        else:
            question = f"Vui lòng cung cấp {meta.get('label', field.replace('_', ' '))}."
            if format_hint:
                question = f"{question} {format_hint}"
        if grouped_hint:
            question = f"{question}{grouped_hint}"
        review_fields.append({
            "id": field,
            "name": field,
            "label": meta.get("label", field.replace("_", " ").title()),
            "placeholder": meta.get("placeholder", f"Nhập {field}"),
            "inputType": meta.get("inputType", "text"),
            "question": question,
            "required": len(group) == 1,
            "value": "" if current_value in (None, [], {}) else str(current_value),
        })
    return review_fields
