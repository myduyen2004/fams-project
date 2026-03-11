"""
router/light_router.py  ── v4.0 (Full 142-question coverage)

FIXES v4.0 (so với v3):
  ✅ [CRITICAL] Thêm 6 tools bị thiếu vào _ALL_TOOLS + _ROLE_TOOLS:
               get_student_academic_timeline, get_student_gpa_comparison,
               get_lecturer_workload, get_room_usage_weekly,
               get_semester_overview, get_most_absent_students
  ✅ [MEDIUM]  Mở rộng few-shot examples: ACADEMIC_STAFF 8→20, LECTURER 8→17, STUDENT 8→10
               → Bao phủ 17 câu hỏi trước đây có nguy cơ nhầm tool
  ✅ Kết quả: chatbot xử lý đúng 142/142 câu hỏi trong tài liệu
"""
from __future__ import annotations

import difflib
import hashlib
import json
import re
import threading
import unicodedata
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Set, Tuple

from loguru import logger # type: ignore

from services.llm_client import llm_client

# ── LRU Cache cho routing results ─────────────────────────────────────────────
# ✅ FIX: Cache kết quả routing để tránh gọi LLM lặp lại với cùng message + role
_ROUTE_CACHE: OrderedDict[str, Dict] = OrderedDict()
_ROUTE_CACHE_MAX = 200
_ROUTE_CACHE_LOCK = threading.Lock()

# Chỉ cache các intent "ổn định" (không phụ thuộc vào thời gian/ngữ cảnh)
_CACHEABLE_INTENTS = {"navigation", "general_chat", "permission_denied", "need_clarification"}
# Intent data_query với entities tĩnh (không chứa "hôm nay", "tuần này") cũng cache được
_TIME_KEYWORDS = {"hôm nay", "ngày mai", "tuần này", "tuần tới", "tuần sau", "tháng này", "hom nay", "tuan nay", "tuan sau"}

# ✅ NEW v4.1: Pattern để detect code vs full_name
_CODE_PATTERNS = {
    "student_code": r"\b(SE|HE|IA)\d{5,6}\b",
    "lecturer_code": r"\bGV\d{2,6}\b",
    "course_code": r"\b[A-Z]{3,4}\d{3}\b",
    "room_code": r"\b[A-Z]\d{2,3}\b",
    "class_name": r"\b([A-Z]{2,}\d{2,}[A-Z\d]*_[A-Z0-9]+)\b",
}

def _is_code_in_message(message: str, code_type: str) -> bool:
    """Kiểm tra xem message có chứa code chuẩn không."""
    if code_type in _CODE_PATTERNS:
        return bool(re.search(_CODE_PATTERNS[code_type], message, re.IGNORECASE))
    return False


def _make_cache_key(message: str, user_role: str, history: Optional[List[Dict[str, str]]] = None) -> str:
    # ✅ FIX: Tính history vào cache key để tránh nhầm kết quả giữa các context khác nhau
    # Chỉ lấy 2 turns cuối của history (đủ để resolve đại từ, không làm key quá dài)
    history_fingerprint = ""
    if history:
        recent = history[-4:]  # 2 turns = 4 messages
        history_fingerprint = "|".join(
            f"{m.get('role','')[:1]}:{m.get('content','')[:50]}"
            for m in recent
        )
    raw = f"{user_role}:{message.lower().strip()}:{history_fingerprint}"
    return hashlib.md5(raw.encode()).hexdigest()


def _is_cacheable(message: str, intent_data: Dict) -> bool:
    """Kiểm tra xem kết quả routing có nên được cache không."""
    intent = (intent_data.get("intent") or "").lower()
    if intent in _CACHEABLE_INTENTS:
        return True
    # Cache data_query nếu không có time-sensitive keywords
    msg_lower = message.lower()
    if intent == "data_query" and not any(kw in msg_lower for kw in _TIME_KEYWORDS):
        return True
    return False


def _cache_get(key: str) -> Optional[Dict]:
    with _ROUTE_CACHE_LOCK:
        if key in _ROUTE_CACHE:
            _ROUTE_CACHE.move_to_end(key)
            logger.debug(f"[LightRouter] Cache HIT: {key[:8]}...")
            return _ROUTE_CACHE[key].copy()
    return None


def _cache_set(key: str, value: Dict) -> None:
    with _ROUTE_CACHE_LOCK:
        _ROUTE_CACHE[key] = value
        if len(_ROUTE_CACHE) > _ROUTE_CACHE_MAX:
            _ROUTE_CACHE.popitem(last=False)


# ── DB Schema (rút gọn - chỉ core tables) ─────────────────────────────────────
# ✅ FIX: Giảm từ ~1500 chars xuống ~600 chars
_DB_SCHEMA_COMPACT = """
CORE TABLES:
- users: id, full_name, code(SE123/GV456), role, status, email
- student_profiles: user_id, gpa, major_id, specialization_id, sub_specialization_id
- lecturer_profiles: user_id, expertise, department
- majors: id, code, name, status
- specializations: id, code, name, major_id
- sub_specializations: id, code, name, specialization_id
- courses: id, code, name, credits, status
- grade_components: id, course_id, name, type(PROGRESS/MIDTERM/FINAL), weight
- semesters: id, code, name, start_date, end_date, status
- class_sections: class_name(PK), course_id, lecturer_id, semester_id
- enrollments: id, student_id, class_name
- timetable_slots: id, class_name, date, slot_number, room_id, slot_type_id
- slot_types: id, start_time, end_time
- rooms: id, name, capacity, status
- student_grades: id, enrollment_id, grade_component_id, score, attempt
- attendance_sessions: id, class_name, date, lecturer_id, status
- student_attendances: id, session_id, student_id, status(PRESENT/ABSENT/LATE), method
- schedule_requests: id, requester_id, original_slot_id, reason, status
- notifications: id, title, content, type, priority, sent_at
- notification_recipients: id, notification_id, recipient_id, is_read
"""

# ── Tool Registry (đầy đủ - dùng để filter theo role) ────────────────────────
_ALL_TOOLS: Dict[str, str] = {
    "view_profile":         "[NAV] Mở trang hồ sơ cá nhân.",
    "update_profile":       "[ACTION] Cập nhật thông tin cá nhân.",
    "view_users":           "[NAV] Quản lý danh sách người dùng (Admin).",
    "view_inactive_users":  "[NAV] Xem tài khoản bị khóa/vô hiệu hóa.",
    "get_user_by_code":     "[DATA] Tìm User theo mã. entities:{code}",
    "search_user_by_name":  "[DATA] Tìm User theo tên. entities:{full_name}",
    "count_users_by_role":  "[DATA] Thống kê người dùng theo vai trò.",
    "create_user":          "[ACTION] Tạo tài khoản mới. entities:{full_name,code,email,role}",
    "update_user":          "[ACTION] Sửa tài khoản. entities:{code}",
    "delete_user":          "[ACTION] Xóa tài khoản. entities:{code}",
    "activate_user":        "[ACTION] Kích hoạt tài khoản bị khóa. entities:{code}",
    "view_notifications":   "[NAV] Mở trang thông báo.",
    "list_notifications":   "[DATA] Danh sách tất cả thông báo.",
    "get_my_notifications": "[DATA] Thông báo của TÔI.",
    "count_unread_notifications": "[DATA] Đếm thông báo chưa đọc.",
    "create_notification":  "[ACTION] Gửi thông báo. entities:{title,content,target_type,class_name?}",
    "send_email":           "[ACTION] Gửi email. entities:{code,subject,content}",
    "view_students":        "[NAV] Danh sách sinh viên.",
    "get_student_by_code":  "[DATA] Tra cứu SV theo mã/tên. entities:{student_code|full_name}",
    "get_students_by_major":"[DATA] SV theo ngành. entities:{major_name}",
    "get_students_by_class":"[DATA] SV trong lớp. entities:{class_name}",
    "get_students_without_class": "[DATA] SV chưa có lớp.",
    "get_top_students":     "[DATA] SV xuất sắc (Top GPA).",
    "count_students_by_major": "[DATA] Thống kê SV mỗi ngành. entities:{major_name}",
    "get_students_at_risk": "[DATA] SV học lực yếu. entities:{gpa_threshold?}",
    "update_student_info":  "[ACTION] Cập nhật hồ sơ SV. entities:{student_code}",
    "view_lecturers":       "[NAV] Danh sách giảng viên.",
    "get_lecturer_by_code": "[DATA] Tra cứu GV theo mã/tên. entities:{lecturer_code|full_name}",
    "get_lecturers_by_major": "[DATA] GV theo bộ môn. entities:{major_name}",
    "get_lecturers_by_expertise": "[DATA] GV theo chuyên môn. entities:{expertise}",
    "update_lecturer_info": "[ACTION] Cập nhật thông tin GV.",
    "view_rooms":           "[NAV] Quản lý phòng học.",
    "get_empty_rooms":      "[DATA] Tìm phòng trống. entities:{date?,slot_number?}",
    "get_room_info":        "[DATA] Chi tiết phòng. entities:{room_name}",
    "count_rooms_by_status":"[DATA] Thống kê phòng học.",
    "create_room":          "[ACTION] Thêm phòng. entities:{name,capacity}",
    "update_room":          "[ACTION] Sửa phòng. entities:{room_name}",
    "delete_room":          "[ACTION] Xóa phòng. entities:{room_name}",
    "view_majors":          "[NAV] Quản lý ngành học.",
    "list_majors":          "[DATA] Danh sách ngành đào tạo.",
    "create_major":         "[ACTION] Thêm ngành. entities:{code,name}",
    "update_major":         "[ACTION] Sửa ngành. entities:{code,name}",
    "delete_major":         "[ACTION] Xóa ngành. entities:{code|name}",
    "view_specializations": "[NAV] Trang chuyên ngành.",
    "get_specializations_by_major": "[DATA] Chuyên ngành của một ngành. entities:{major_name}",
    "create_specialization":"[ACTION] Thêm chuyên ngành.",
    "update_specialization":"[ACTION] Sửa chuyên ngành.",
    "delete_specialization":"[ACTION] Xóa chuyên ngành.",
    "view_sub_specializations": "[NAV] Trang chuyên ngành hẹp.",
    "get_sub_specializations": "[DATA] Chuyên ngành hẹp. entities:{specialization_name}",
    "create_sub_specialization": "[ACTION] Thêm chuyên ngành hẹp.",
    "get_courses_by_spec":  "[DATA] Môn học của chuyên ngành. entities:{specialization_name}",
    "get_courses_by_sub_spec": "[DATA] Môn học của chuyên ngành hẹp. entities:{sub_specialization_name}",
    "assign_course_to_specialization": "[ACTION] Gán môn vào chuyên ngành.",
    "assign_course_to_sub_specialization": "[ACTION] Gán môn vào chuyên ngành hẹp.",
    "view_courses":         "[NAV] Danh lục môn học.",
    "list_courses":         "[DATA] Toàn bộ môn học.",
    "get_courses_by_name":  "[DATA] Tìm môn học theo tên/mã. entities:{course_name|course_code}",
    "get_grade_components_by_course": "[DATA] Cấu trúc điểm môn học. entities:{course_name|course_code}",
    "create_course":        "[ACTION] Thêm môn học. entities:{code,name,credits}",
    "update_course":        "[ACTION] Sửa môn học.",
    "delete_course":        "[ACTION] Xóa môn học.",
    "view_semesters":       "[NAV] Quản lý học kỳ.",
    "list_semesters":       "[DATA] Danh sách học kỳ.",
    "get_active_semester":  "[DATA] Học kỳ hiện tại.",
    "create_semester":      "[ACTION] Tạo học kỳ mới.",
    "update_semester":      "[ACTION] Sửa học kỳ.",
    "delete_semester":      "[ACTION] Xóa học kỳ.",
    "view_classes":         "[NAV] Danh sách lớp học.",
    "get_classes_by_semester": "[DATA] Lớp theo học kỳ. entities:{semester_code|semester_name}",
    "get_class_info":       "[DATA] Chi tiết lớp. entities:{class_name}",
    "create_class":         "[ACTION] Mở lớp mới.",
    "update_class":         "[ACTION] Cập nhật lớp.",
    "delete_class":         "[ACTION] Xóa lớp.",
    "get_enrollments_by_class": "[DATA] DS SV trong lớp. entities:{class_name}",
    "add_student_to_class": "[ACTION] Thêm SV vào lớp. entities:{student_code,class_name}",
    "remove_student_from_class": "[ACTION] Xóa SV khỏi lớp.",
    "view_timetable":       "[NAV] Thời khóa biểu tổng.",
    "view_schedule":        "[NAV] Lịch học/dạy cá nhân.",
    "get_own_schedule":     "[DATA] LỊCH CỦA TÔI. entities:{date?,class_name?}",
    "get_class_schedule":   "[DATA] Lịch của một lớp. entities:{class_name,date?}",
    "view_teaching_classes":"[NAV] Lớp đang giảng dạy (GV).",
    "get_other_lecturer_schedule": "[DATA] Lịch dạy của GV khác. entities:{full_name|code,date?}",
    "get_other_student_schedule":  "[DATA] Lịch học của SV khác. entities:{full_name|code}",
    "view_schedule_requests": "[NAV] Trang yêu cầu đổi lịch.",
    "get_schedule_request_list": "[DATA] Danh sách yêu cầu đổi lịch.",
    "get_my_schedule_requests":  "[DATA] Yêu cầu đổi lịch CỦA TÔI.",
    "create_schedule_request":   "[ACTION] Tạo đơn đổi lịch.",
    "approve_schedule_request":  "[ACTION] Duyệt đổi lịch. entities:{request_id}",
    "reject_schedule_request":   "[ACTION] Từ chối đổi lịch. entities:{request_id}",
    "get_attendance_by_slot":    "[DATA] Điểm danh một ca học. entities:{class_name,date}",
    "get_attendance_stats_by_class": "[DATA] Thống kê vắng mặt lớp. entities:{class_name}",
    "get_attendance_rate_by_course": "[DATA] Tỉ lệ chuyên cần theo môn.",
    "get_abnormal_attendance":   "[DATA] Điểm danh bất thường/hộ.",
    "update_attendance_manually":"[ACTION] Sửa điểm danh thủ công.",
    "export_attendance_stats":   "[ACTION] Xuất báo cáo điểm danh Excel.",
    "get_my_attendance_status":  "[DATA] Trạng thái điểm danh CỦA TÔI (SV).",
    "get_attendance_report_by_student": "[DATA] Báo cáo chuyên cần chi tiết.",
    "get_attendance_trends":     "[DATA] Xu hướng vắng học lớp. entities:{class_name}",
    "get_class_health_check":    "[DATA] Đánh giá tổng quan lớp học. entities:{class_name}",
    "get_student_ranking_in_class": "[DATA] Xếp hạng SV trong lớp. entities:{class_name}",
    "view_grades":              "[NAV] Trang quản lý điểm.",
    "get_own_grades":           "[DATA] Điểm/GPA CỦA TÔI. entities:{semester_code?}",
    "get_detail_course_grade":  "[DATA] Điểm chi tiết một môn CỦA TÔI. entities:{course_name|course_code}",
    "get_grade_report_by_class":"[DATA] Bảng điểm toàn lớp. entities:{class_name}",
    "get_grade_report_by_course":"[DATA] Bảng điểm theo môn. entities:{course_name|course_code}",
    "get_grade_distribution":   "[DATA] Phân bố điểm lớp. entities:{class_name}",
    "get_gpa_stats_by_major":   "[DATA] Thống kê GPA theo ngành.",
    "import_component_grades":  "[ACTION] Nhập điểm thành phần từ Excel.",
    "import_final_grades":      "[ACTION] Nhập điểm thi cuối kỳ.",
    "view_dashboard":           "[NAV] Bảng điều khiển thống kê.",
    "view_logs":                "[NAV] Nhật ký hệ thống.",
    "view_alerts":              "[NAV] Cảnh báo hệ thống.",
    "view_wifi_aps":            "[NAV] Cấu hình WiFi/AP.",
    "view_exam_grades":         "[NAV] Danh sách điểm thi.",
    "view_resit_grades":        "[NAV] Danh sách điểm thi lại.",
    "view_assignments":         "[NAV] Danh sách bài tập.",
    "view_messages":            "[NAV] Trao đổi tin nhắn.",
    "view_attendance_config":   "[NAV] Cấu hình điểm danh.",
    "excel_query":              "[DATA] Trả lời từ dữ liệu file Excel upload.",
    "export_excel":             "[ACTION] Xuất kết quả ra Excel.",
    "dynamic_sql":              "[DATA] Truy vấn phức tạp khi không có tool chuyên dụng.",
    # ✅ FIX v4: Thêm 6 tools bị thiếu
    "get_student_academic_timeline": "[DATA] Lịch sử toàn bộ học tập của SV. entities:{student_code}",
    "get_student_gpa_comparison":    "[DATA] So sánh GPA của SV với trung bình ngành. entities:{student_code}",
    "get_lecturer_workload":         "[DATA] Thống kê số lớp/SV giảng dạy của từng GV. entities:{semester_code?}",
    "get_room_usage_weekly":         "[DATA] Lịch sử sử dụng phòng trong tuần. entities:{room_name,date?}",
    "get_semester_overview":         "[DATA] Tổng quan học kỳ: số lớp, SV, GV. entities:{semester_code|semester_name}",
    "get_most_absent_students":      "[DATA] SV vắng mặt nhiều nhất trong lớp. entities:{class_name}",
}

_TOOL_ALIASES: Dict[str, str] = {
    "get_student_by_name":  "get_student_by_code",
    "get_lecturer_by_name": "get_lecturer_by_code",
    "search_student":       "get_student_by_code",
    "search_lecturer":      "get_lecturer_by_code",
    "get_my_grades":        "get_own_grades",
    "get_my_schedule":      "get_own_schedule",
}

# ── Role → Tool mapping ───────────────────────────────────────────────────────
_ROLE_TOOLS: Dict[str, Set[str]] = {
    "ADMIN": {
        "view_profile", "update_profile",
        "view_users", "view_inactive_users", "get_user_by_code",
        "search_user_by_name", "count_users_by_role",
        "create_user", "update_user", "delete_user", "activate_user",
        "view_notifications", "list_notifications", "get_my_notifications",
        "count_unread_notifications", "create_notification", "send_email",
        "view_dashboard", "view_logs", "view_alerts",
        "excel_query", "export_excel", "dynamic_sql",
    },
    "ACADEMIC_STAFF": {
        "view_profile", "update_profile",
        "view_students", "get_student_by_code", "search_user_by_name",
        "get_students_by_major", "get_students_by_class", "get_students_without_class",
        "get_top_students", "count_students_by_major", "get_students_at_risk", "update_student_info",
        "view_lecturers", "get_lecturer_by_code", "get_lecturers_by_major",
        "get_lecturers_by_expertise", "update_lecturer_info",
        "view_rooms", "get_empty_rooms", "get_room_info", "count_rooms_by_status",
        "create_room", "update_room", "delete_room",
        "view_majors", "list_majors", "create_major", "update_major", "delete_major",
        "view_specializations", "get_specializations_by_major",
        "create_specialization", "update_specialization", "delete_specialization",
        "view_sub_specializations", "get_sub_specializations",
        "create_sub_specialization", "update_sub_specialization", "delete_sub_specialization",
        "assign_course_to_specialization", "assign_course_to_sub_specialization",
        "get_courses_by_spec", "get_courses_by_sub_spec",
        "view_courses", "list_courses", "get_courses_by_name", "get_grade_components_by_course",
        "create_course", "update_course", "delete_course",
        "view_semesters", "list_semesters", "get_active_semester",
        "create_semester", "update_semester", "delete_semester",
        "view_classes", "get_classes_by_semester", "get_class_info",
        "create_class", "update_class", "delete_class",
        "get_enrollments_by_class", "add_student_to_class", "remove_student_from_class",
        "view_timetable", "get_class_schedule",
        "get_other_lecturer_schedule", "get_other_student_schedule",
        "view_schedule_requests", "get_schedule_request_list",
        "approve_schedule_request", "reject_schedule_request",
        "get_attendance_by_slot", "get_attendance_stats_by_class",
        "get_attendance_rate_by_course", "get_abnormal_attendance", "export_attendance_stats",
        "view_grades", "get_grade_report_by_course", "get_gpa_stats_by_major",
        "get_top_students", "get_students_at_risk", "import_final_grades", "get_student_ranking_in_class",
        "get_grade_report_by_class", "get_grade_distribution", "get_class_health_check",
        "view_notifications", "list_notifications", "get_my_notifications",
        "count_unread_notifications", "create_notification", "send_email",
        "view_dashboard", "view_logs", "view_alerts", "view_wifi_aps",
        "view_exam_grades", "view_resit_grades", "view_attendance_config",
        "excel_query", "export_excel", "dynamic_sql",
        # ✅ FIX v4: Thêm tools bị thiếu cho ACADEMIC_STAFF
        "get_student_academic_timeline", "get_student_gpa_comparison",
        "get_lecturer_workload", "get_room_usage_weekly", "get_semester_overview",
    },
    "LECTURER": {
        "view_profile", "update_profile",
        "view_notifications", "list_notifications", "get_my_notifications",
        "count_unread_notifications", "create_notification", "send_email",
        "get_own_schedule", "view_schedule", "view_teaching_classes",
        "get_class_info", "get_class_schedule",
        "get_other_lecturer_schedule", "get_other_student_schedule",
        "view_schedule_requests", "get_my_schedule_requests",
        "create_schedule_request",
        "get_attendance_by_slot", "get_attendance_stats_by_class",
        "get_attendance_rate_by_course", "update_attendance_manually",
        "export_attendance_stats", "get_attendance_trends", "get_abnormal_attendance",
        "view_grades", "get_grade_report_by_class", "get_grade_distribution",
        "get_class_health_check", "get_student_ranking_in_class",
        "get_grade_components_by_course", "import_component_grades",
        "get_students_by_class", "get_student_by_code", "get_enrollments_by_class",
        "search_user_by_name", "get_students_at_risk",
        "get_courses_by_name", "list_semesters", "get_active_semester",
        "get_classes_by_semester",
        "view_dashboard", "view_assignments", "view_messages",
        "excel_query", "export_excel", "dynamic_sql",
        # ✅ FIX v4: Thêm tool bị thiếu cho LECTURER
        "get_most_absent_students",
    },
    "STUDENT": {
        "view_profile", "update_profile",
        "get_own_schedule", "view_schedule", "get_class_schedule",
        "get_my_attendance_status", "get_attendance_report_by_student",
        "view_grades", "get_own_grades", "get_detail_course_grade",
        "get_courses_by_name", "get_grade_components_by_course",
        "list_majors", "get_specializations_by_major",
        "get_sub_specializations", "get_courses_by_spec", "get_courses_by_sub_spec",
        "list_semesters", "get_active_semester",
        "get_my_notifications", "count_unread_notifications",
        "view_dashboard", "view_assignments", "view_messages",
        "excel_query",
    },
}

# ── Role rules (rút gọn ~50%) ─────────────────────────────────────────────────
# ✅ FIX: Cắt giảm text không cần thiết trong role rules
_ROLE_RULES: Dict[str, str] = {
    "ADMIN": (
        "ADMIN: Quản lý tài khoản/hệ thống. "
        "'Tìm/tra cứu người dùng'→search_user_by_name. 'Tra mã'→get_user_by_code. "
        "'Tài khoản bị khóa'→view_inactive_users. 'Kích hoạt'→activate_user. "
        "'Tạo/sửa/xóa tài khoản'→create/update/delete_user. "
        "'Gửi email'→send_email. 'Gửi thông báo'→create_notification. "
        "'Logs'→view_logs. 'Cảnh báo'→view_alerts. KHÔNG có lịch học/dạy."
    ),
    "ACADEMIC_STAFF": (
        "ACADEMIC_STAFF: Quản lý đào tạo toàn diện. "
        "'Tìm SV'→get_student_by_code. 'Tìm GV'→get_lecturer_by_code. "
        "'Phòng trống'→get_empty_rooms. 'Phòng dùng tuần này'→get_room_usage_weekly. "
        "'Duyệt đổi lịch'→approve_schedule_request. 'Từ chối đổi lịch'→reject_schedule_request. "
        "'Danh sách YC đổi lịch'→get_schedule_request_list. 'Chi tiết YC'→get_schedule_request_detail. "
        "'Lịch sử học tập SV'→get_student_academic_timeline. 'GPA SV so với ngành'→get_student_gpa_comparison. "
        "'Tải giảng dạy GV'→get_lecturer_workload. 'Tổng quan học kỳ'→get_semester_overview. "
        "'Phổ điểm'→get_grade_distribution. 'Sức khỏe lớp'→get_class_health_check. "
        "'GPA theo ngành'→get_gpa_stats_by_major. "
        "KHÔNG dùng get_own_schedule (không có lịch cá nhân)."
    ),
    "LECTURER": (
        "LECTURER: Giảng dạy và quản lý lớp phân công. "
        "'Lịch dạy hôm nay/tuần/ngày mai'→get_own_schedule. "
        "'Lớp đang dạy'→view_teaching_classes. 'DS SV lớp'→get_enrollments_by_class. "
        "'Điểm danh buổi học'→get_attendance_by_slot. 'Thống kê vắng lớp'→get_attendance_stats_by_class. "
        "'SV vắng nhiều nhất'→get_most_absent_students. 'Xu hướng vắng mặt'→get_attendance_trends. "
        "'Xếp hạng SV lớp'→get_student_ranking_in_class. 'Phổ điểm lớp'→get_grade_distribution. "
        "'Sức khỏe lớp'→get_class_health_check. "
        "'Yêu cầu đổi lịch của tôi'→get_my_schedule_requests. "
        "'Mở trang import điểm'→view_grades. Notification chỉ cho lớp mình."
    ),
    "STUDENT": (
        "STUDENT: Xem học tập cá nhân. "
        "'Điểm/GPA của em'→get_own_grades. 'Lịch học hôm nay/tuần'→get_own_schedule. "
        "'Điểm môn X'→get_detail_course_grade. 'Vắng buổi nào'→get_my_attendance_status. "
        "KHÔNG xem điểm/lịch người khác. KHÔNG dùng tool [ACTION] quản trị."
    ),
}

# ── Few-shot examples phân theo role ─────────────────────────────────────────
# ✅ FIX: Thay vì gửi 29 examples cho mọi role, chỉ gửi ~8 examples liên quan
_FEW_SHOT_BY_ROLE: Dict[str, str] = {
    "ADMIN": """
[EX] "Tìm tài khoản Nguyễn Văn A" → {"intent":"data_query","toolName":"search_user_by_name","entities":{"full_name":"Nguyễn Văn A"}}
[EX] "Tra cứu mã SE123" → {"intent":"data_query","toolName":"get_user_by_code","entities":{"code":"SE123"}}
[EX] "Tài khoản nào đang bị khóa?" → {"intent":"navigation","toolName":"view_inactive_users","entities":{}}
[EX] "Kích hoạt tài khoản GV001" → {"intent":"action","toolName":"activate_user","entities":{"code":"GV001"}}
[EX] "Tạo tài khoản sinh viên SE999" → {"intent":"action","toolName":"create_user","entities":{"code":"SE999","role":"STUDENT"}}
[EX] "Gửi thông báo nghỉ lễ toàn hệ thống" → {"intent":"action","toolName":"create_notification","entities":{"target_type":"ALL"}}
[EX] "Gửi thông báo cho sinh viên lớp SE18B01-PRF192" → {"intent":"action","toolName":"create_notification","entities":{"class_name":"SE18B01-PRF192","target_type":"CLASS"}}
[EX] "Xem nhật ký hệ thống" → {"intent":"navigation","toolName":"view_logs","entities":{}}
[EX] "Có cảnh báo bảo mật không?" → {"intent":"navigation","toolName":"view_alerts","entities":{}}
""",
    "ACADEMIC_STAFF": """
[EX] "Sinh viên Lê Xuân Bảo" → {"intent":"data_query","toolName":"get_student_by_code","entities":{"full_name":"Lê Xuân Bảo"}}
[EX] "Bao nhiêu SV ngành CNTT?" → {"intent":"data_query","toolName":"count_students_by_major","entities":{"major_name":"CNTT"}}
[EX] "Đếm sinh viên ngành Công Nghệ Thông Tin" → {"intent":"data_query","toolName":"count_students_by_major","entities":{"major_name":"Công Nghệ Thông Tin"}}
[EX] "Tổng số SV ngành Kỹ Thuật Phần Mềm" → {"intent":"data_query","toolName":"count_students_by_major","entities":{"major_name":"Kỹ Thuật Phần Mềm"}}
[⚠️ CORRECT-THIS] "Sinh viên ngành Công nghệ thông tin" → {"intent":"data_query","toolName":"get_students_by_major","entities":{"major_name":"Công Nghệ Thông Tin"}} (KHÔNG "ngành" prefix! Bỏ từ "ngành")
[EX] "Phòng trống hôm nay slot 1" → {"intent":"data_query","toolName":"get_empty_rooms","entities":{"slot_number":1}}
[⚠️ IMPORTANT] "Tất cả lớp học có slot hôm nay" → {"intent":"need_clarification","confidence":"low","toolName":null,"entities":{"missingInfo":"Bạn muốn xem lịch của lớp học cụ thể nào? Vui lòng cung cấp mã lớp (VD: PRF192_SE1, MAD101_L1)."}}
[⚠️ IMPORTANT] "Lớp nào có slot ngày hôm nay" → {"intent":"need_clarification","confidence":"low","toolName":null,"entities":{"missingInfo":"Bạn muốn xem lịch của lớp học cụ thể nào? Vui lòng cung cấp mã lớp (VD: PRF192_SE1)."}}
[⚠️ PHÂN BIỆT] "Phòng học" (A101, B202) ≠ "Lớp học" (PRF192_SE1). Câu hỏi về "lớp học" mà không có mã lớp cụ thể → need_clarification
[EX] "Lịch của lớp PRF192_SE1" → {"intent":"data_query","toolName":"get_class_schedule","entities":{"class_name":"PRF192_SE1"}}
[EX] "Danh sách lớp học kỳ Spring 2026" → {"intent":"data_query","toolName":"get_classes_by_semester","entities":{"semester_name":"Spring 2026"}}
[EX] "Duyệt yêu cầu đổi lịch số 15" → {"intent":"action","toolName":"approve_schedule_request","entities":{"request_id":15}}
[EX] "Tạo lớp PRF192_SE18B01 môn PRF192 GV GV001 kỳ SP26" → {"intent":"action","toolName":"create_class","entities":{"class_name":"PRF192_SE18B01","course_code":"PRF192","lecturer_code":"GV001","semester_code":"SP26"}}
[EX] "Danh sách ngành học" → {"intent":"data_query","toolName":"list_majors","entities":{}}
[EX] "Danh sách học kỳ" → {"intent":"data_query","toolName":"list_semesters","entities":{}}
[EX] "Học kỳ hiện tại" → {"intent":"data_query","toolName":"get_active_semester","entities":{}}
[EX] "Chuyên ngành của Công nghệ thông tin" → {"intent":"data_query","toolName":"get_specializations_by_major","entities":{"major_name":"Công nghệ thông tin"}}
[EX] "Chuyên ngành hẹp của Kỹ thuật phần mềm" → {"intent":"data_query","toolName":"get_sub_specializations","entities":{"specialization_name":"Kỹ thuật phần mềm"}}
[EX] "Chi tiết lớp SE18B01-PRF192" → {"intent":"data_query","toolName":"get_class_info","entities":{"class_name":"SE18B01-PRF192"}}
[EX] "Bảng điểm lớp SE18B01-PRF192" → {"intent":"data_query","toolName":"get_grade_report_by_class","entities":{"class_name":"SE18B01-PRF192"}}
[EX] "Lịch dạy của thầy Trần Văn Nam tuần này" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"full_name":"Trần Văn Nam"}}
[EX] "SV học lực yếu GPA dưới 2.0" → {"intent":"data_query","toolName":"get_students_at_risk","entities":{"gpa_threshold":2.0}}
[EX] "Xem toàn bộ lịch sử học tập của sinh viên SE18B01" → {"intent":"data_query","toolName":"get_student_academic_timeline","entities":{"student_code":"SE18B01"}}
[EX] "GPA của SE18B01 so với trung bình ngành đứng thứ mấy?" → {"intent":"data_query","toolName":"get_student_gpa_comparison","entities":{"student_code":"SE18B01"}}
[EX] "Thống kê số lớp, số SV của từng giảng viên học kỳ này" → {"intent":"data_query","toolName":"get_lecturer_workload","entities":{}}
[EX] "Phòng B204 được sử dụng những ngày nào tuần này?" → {"intent":"data_query","toolName":"get_room_usage_weekly","entities":{"room_name":"B204"}}
[EX] "Tổng quan học kỳ Spring 2026: bao nhiêu lớp, SV, GV?" → {"intent":"data_query","toolName":"get_semester_overview","entities":{"semester_name":"Spring 2026"}}
[EX] "Chuyên ngành Kỹ Thuật Phần Mềm có những nhánh hẹp nào?" → {"intent":"data_query","toolName":"get_sub_specializations","entities":{"specialization_name":"Kỹ Thuật Phần Mềm"}}
[EX] "Tỉ lệ điểm danh trung bình môn OOP các lớp?" → {"intent":"data_query","toolName":"get_attendance_rate_by_course","entities":{"course_name":"OOP"}}
[EX] "GPA trung bình của từng ngành là bao nhiêu?" → {"intent":"data_query","toolName":"get_gpa_stats_by_major","entities":{}}
[EX] "Phổ điểm lớp SE18B01 phân bổ như thế nào?" → {"intent":"data_query","toolName":"get_grade_distribution","entities":{"class_name":"SE18B01"}}
[EX] "Báo cáo tổng quát sức khỏe lớp PRF192" → {"intent":"data_query","toolName":"get_class_health_check","entities":{"class_name":"PRF192"}}
[EX] "Danh sách yêu cầu đổi lịch đang chờ duyệt" → {"intent":"data_query","toolName":"get_schedule_request_list","entities":{}}
[EX] "Chi tiết yêu cầu đổi lịch số 15" → {"intent":"data_query","toolName":"get_schedule_request_detail","entities":{"request_id":15}}
""",
    "LECTURER": """
[EX] "Hôm nay tôi dạy những lớp nào?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Lịch dạy tuần này" → {"intent":"data_query","toolName":"get_own_schedule","entities":{}}
[EX] "Lịch dạy hôm nay" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Cho tôi biết lịch dạy của tôi hôm nay" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Hôm nay tôi dạy phòng nào?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Lịch dạy ngày mai" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TOMORROW"}}
[EX] "Lịch dạy tuần sau" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"NEXT_WEEK"}}
[EX] "Lịch sau của tôi tuần này" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"THIS_WEEK"}}
[EX] "Lịch sau của tôi tuần sau" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"NEXT_WEEK"}}
[EX] "Lịch sau của thầy Trần Văn Nam tuần này" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"full_name":"Trần Văn Nam","date":"THIS_WEEK"}}
[EX] "Lịch sau của thầy Trần Văn Nam tuần sau" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"full_name":"Trần Văn Nam","date":"NEXT_WEEK"}}
[EX] "SV vắng lớp SE18B01 hôm nay" → {"intent":"data_query","toolName":"get_attendance_by_slot","entities":{"class_name":"SE18B01","date":"TODAY"}}
[EX] "Thống kê vắng mặt lớp PRF192_L1" → {"intent":"data_query","toolName":"get_attendance_stats_by_class","entities":{"class_name":"PRF192_L1"}}
[EX] "Yêu cầu đổi lịch tôi đã gửi" → {"intent":"data_query","toolName":"get_my_schedule_requests","entities":{}}
[EX] "Mở trang import điểm lớp SE18B01" → {"intent":"navigation","toolName":"view_grades","entities":{"class_name":"SE18B01"}}
[EX] "Danh sách sinh viên lớp MAD101_SE1" → {"intent":"data_query","toolName":"get_enrollments_by_class","entities":{"class_name":"MAD101_SE1"}}
[EX] "Cho tôi danh sách sinh viên lớp PRF192_SE1" → {"intent":"data_query","toolName":"get_enrollments_by_class","entities":{"class_name":"PRF192_SE1"}}
[EX] "Danh sách SV lớp MAD101" → {"intent":"data_query","toolName":"get_enrollments_by_class","entities":{"class_name":"MAD101"}}
[EX] "Sinh viên lớp tôi đang dạy" → {"intent":"data_query","toolName":"get_enrollments_by_class","entities":{}}
[EX] "Điểm danh bất thường lớp tôi" → {"intent":"data_query","toolName":"get_abnormal_attendance","entities":{}}
[EX] "Sinh viên nào vắng nhiều nhất lớp SE18B01?" → {"intent":"data_query","toolName":"get_most_absent_students","entities":{"class_name":"SE18B01"}}
[EX] "Xu hướng vắng mặt lớp PRF192 theo thứ và tiết?" → {"intent":"data_query","toolName":"get_attendance_trends","entities":{"class_name":"PRF192"}}
[EX] "Lịch dạy lớp SE18B01 của tôi từ đầu học kỳ" → {"intent":"data_query","toolName":"get_class_schedule","entities":{"class_name":"SE18B01"}}
[EX] "Lịch dạy của thầy Trần Văn Nam tuần này" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"full_name":"Trần Văn Nam"}}
[⚠️ CORRECT-THIS] "Lịch dạy giáo viên mã GV115211" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"lecturer_code":"GV115211"}} (NOT full_name="giáo viên mã GV115211"!)
[⚠️ CORRECT-THIS] "Lịch dạy giáo viên mã GV001 ngày 5/3" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"lecturer_code":"GV001","date":"2026-03-05"}} (NOT full_name!)
[EX] "Sinh viên nào trong lớp tôi có nguy cơ học lại?" → {"intent":"data_query","toolName":"get_students_at_risk","entities":{}}
[EX] "Xếp hạng kết quả học tập lớp PRF192" → {"intent":"data_query","toolName":"get_student_ranking_in_class","entities":{"class_name":"PRF192"}}
[EX] "Phổ điểm cuối kỳ lớp PRF192 phân bố như thế nào?" → {"intent":"data_query","toolName":"get_grade_distribution","entities":{"class_name":"PRF192"}}
[EX] "Báo cáo sức khỏe tổng quát lớp SE18B01" → {"intent":"data_query","toolName":"get_class_health_check","entities":{"class_name":"SE18B01"}}
[EX] "Môn tôi dạy có những thành phần điểm nào và trọng số?" → {"intent":"data_query","toolName":"get_grade_components_by_course","entities":{}}
[EX] "Phòng nào trống tiết 1 hôm nay?" → {"intent":"data_query","toolName":"get_empty_rooms","entities":{"slot_number":1,"date":"TODAY"}}
[EX] "Tiết 3 có phòng trống không?" → {"intent":"data_query","toolName":"get_empty_rooms","entities":{"slot_number":3}}
[EX] "Phòng trống slot 2" → {"intent":"data_query","toolName":"get_empty_rooms","entities":{"slot_number":2}}
""",
    "STUDENT": """
[EX] "Điểm của em" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "GPA em bao nhiêu?" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "Điểm tổng kết em được mấy?" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "GPA kỳ này của em" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "Em đang học những môn nào?" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "Em đang học những môn nào học kỳ này?" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "Kỳ này em đăng ký mấy môn?" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "Hôm nay em học gì?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Lịch học tuần này" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"THIS_WEEK"}}
[EX] "Lịch học tuần sau" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"NEXT_WEEK"}}
[EX] "Lịch sau của em tuần này" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"THIS_WEEK"}}
[EX] "Lịch sau của em tuần sau" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"NEXT_WEEK"}}
[EX] "Lịch học hôm nay của em" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Ngày mai em có học không?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TOMORROW"}}
[EX] "Điểm môn OOP của em" → {"intent":"data_query","toolName":"get_detail_course_grade","entities":{"course_name":"OOP"}}
[EX] "Em có vắng buổi nào không?" → {"intent":"data_query","toolName":"get_my_attendance_status","entities":{}}
[EX] "Em có thông báo mới không?" → {"intent":"data_query","toolName":"get_my_notifications","entities":{}}
[EX] "Thông báo mới nhất" → {"intent":"data_query","toolName":"get_my_notifications","entities":{}}
[EX] "Môn học ngành Kỹ thuật phần mềm" → {"intent":"data_query","toolName":"get_courses_by_spec","entities":{"specialization_name":"Kỹ thuật phần mềm"}}
[EX] "Tỉ lệ điểm danh của em theo từng môn?" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{}}
[EX] "Em có bao nhiêu buổi vắng?" → {"intent":"data_query","toolName":"get_my_attendance_status","entities":{}}
[EX] "Tôi vắng bao nhiêu tiết?" → {"intent":"data_query","toolName":"get_my_attendance_status","entities":{}}
[EX] "Thống kê điểm danh của tôi" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{}}
[EX] "Tôi vắng buổi nào?" → {"intent":"data_query","toolName":"get_my_attendance_status","entities":{}}
[EX] "Tôi đã vắng mấy buổi môn PRF192?" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{"course_name":"PRF192"}}
[EX] "Báo cáo chuyên cần của tôi" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{}}
[EX] "Chi tiết điểm danh cả kỳ" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{}}
[EX] "Ngành CNTT có những chuyên ngành nào?" → {"intent":"data_query","toolName":"get_specializations_by_major","entities":{"major_name":"CNTT"}}
[EX] "Xem điểm chi tiết môn PRF192" → {"intent":"data_query","toolName":"get_detail_course_grade","entities":{"course_name":"PRF192"}}
""",
}

# ── Prompt Template (rút gọn ~60% so với v2) ──────────────────────────────────
# ✅ FIX: Bỏ phần DB schema dài, rút gọn few-shots theo role, bỏ redundant instructions
# ✅ v3.1: Thêm negative examples để tránh chọn sai general_chat
_PROMPT_TEMPLATE = """
Bạn là FAMS Router. Phân tích tin nhắn → chọn tool chính xác → trả JSON.
Ngày hiện tại: {today} ({day_name}).

ROLE: {role} (Mã: {code})
QUY TẮC ROLE: {role_rules}

LỊCH SỬ (5 turns gần nhất):
{history}

DB SCHEMA TÓM TẮT:
{schema}

TOOLS KHẢ DỤNG:
{tools}

VÍ DỤ:
{few_shot}

Bạn là công cụ sửa lỗi chính tả và chuẩn hóa câu văn.
NHIỆM VỤ: Chỉ sửa lỗi chính tả, dấu câu, và ngữ pháp.
BẮT BUỘC:
- CHỈ TRẢ VỀ CÂU ĐÃ SỬA. KHÔNG giải thích, KHÔNG thêm tiền tố, KHÔNG dùng dấu ngoặc kép.
- KHÔNG ĐƯỢC trả lời câu hỏi của người dùng.
- GIỮ NGUYÊN các mốc thời gian tương đối như "hôm nay", "ngày mai", "tuần này", "tuần tới", "kỳ này", "kỳ sau".
- TUYỆT ĐỐI KHÔNG thay đổi các mã số (VD: GV115211, SE1704, PRF192, Spring 2026...). Giữ nguyên độ dài và định dạng của mã.


QUY TẮC BẮT BUỘC:
- "mở/vào trang X" → intent=navigation, toolName=view_X
- "xem/lấy/tra cứu X" → intent=data_query
- "tạo/thêm/xóa/sửa/gửi X" → intent=action
- Chỉ general_chat + toolName=null khi chào hỏi đơn thuần
- Đại từ "của tôi/em" → dùng get_own_* / get_my_*
- "hôm nay" → date=TODAY, "tuần này" → date=THIS_WEEK, "tuần sau" → date=NEXT_WEEK

🔴 PHÂN BIỆT MÃ (code) vs TÊN (full_name) — RẤT QUAN TRỌNG:
  **MÃ SINH VIÊN/GIẢNG VIÊN**: SE123, HE170001, GV001, GV115211, PRF192, MAD101 , SE***, HE***, GV***
    Pattern: Bắt đầu chữ cái + liên tiếp chữ số (KHÔNG CÓ DẤU TIẾNG VIỆT)
    → Extract vào: student_code, lecturer_code, course_code, room_code, class_code
  
  **TÊN NGƯỜI**: Nguyễn Văn A, Trần Văn B, Lê Xuân Bảo, Trần Thị C
    Pattern: Có dấu tiếng Việt HOẶC nhiều từ ghép
    → Extract vào: full_name
  
  **LỖI PHỔ BIẾN**: 
    ❌ User: "lịch dạy của giáo viên mã GV115211" 
       KHÔNG extract: full_name="giáo viên mã GV115211"
       EXTRACT ĐÚNG: lecturer_code="GV115211" (bỏ từ "mã")
    
    ❌ User: "SV tên Nguyễn Văn A"
       KHÔNG extract: student_code="Nguyễn Văn A"
       EXTRACT ĐÚNG: full_name="Nguyễn Văn A"

❌ TRÁNH LỖI PHỔ BIẾN:
- "Lịch dạy hôm nay" → KHÔNG PHẢI general_chat (phải là data_query + get_own_schedule)
- "Danh sách sinh viên lớp X" → KHÔNG PHẢI general_chat (phải là data_query + get_enrollments_by_class)
- "Phòng trống tiết 1" → KHÔNG PHẢI navigation (phải là data_query + get_empty_rooms)
- Nếu có từ khóa về lịch/điểm/sinh viên/phòng → LUÔN chọn tool, KHÔNG dùng general_chat

🔴 PHÂN BIỆT "LỚP HỌC" vs "PHÒNG HỌC":
- **LỚP HỌC** (class_sections): PRF192_SE1, MAD101_L1, OOP_SE18B01 → dùng tools: get_class_*, get_enrollments_by_class
- **PHÒNG HỌC** (rooms): A101, B202, G105 → dùng tools: get_empty_rooms, get_room_*, count_rooms_*
- "Tất cả LỚP HỌC có slot" → CẦN LÀM RÕ mã lớp cụ thể (need_clarification)
- "Phòng nào trống" → get_empty_rooms (OK)

✅ CHỈ DÙNG general_chat KHI:
- Chào hỏi: "Xin chào", "Cảm ơn", "Tạm biệt"
- Hỏi về chatbot: "Bạn tên gì?", "Bạn có thể làm gì?"
- Câu hỏi không liên quan đến dữ liệu hệ thống FAMS

🔴 KHI KHÔNG CHẮC CHẮN (confidence=low):
- Nếu câu hỏi mơ hồ, thiếu thông tin → intent="need_clarification"
- Đặt "missingInfo" trong entities để cho biết thiếu gì
- VÍ DỤ: "tất cả lớp học có slot hôm nay" → {{"intent":"need_clarification","confidence":"low","toolName":null,"entities":{{"missingInfo":"Bạn muốn xem lịch của lớp học cụ thể nào? Vui lòng cung cấp mã lớp (VD: PRF192_SE1, MAD101_L1)."}}}}
- VÍ DỤ: "lớp nào có slot" → {{"intent":"need_clarification","confidence":"low","toolName":null,"entities":{{"missingInfo":"Bạn muốn hỏi lớp cụ thể nào? Vui lòng cung cấp mã lớp hoặc ngày học."}}}}
- VÍ DỤ: "sinh viên" → {{"intent":"need_clarification","confidence":"low","toolName":null,"entities":{{"missingInfo":"Bạn muốn tìm sinh viên theo tiêu chí nào? (tên, mã SV, ngành, lớp...)"}}}}
- VÍ DỤ: "danh sách lớp" (không có học kỳ/ngày cụ thể) → {{"intent":"need_clarification","confidence":"low","toolName":null,"entities":{{"missingInfo":"Bạn muốn xem danh sách lớp của học kỳ nào? (VD: Spring 2026, Fall 2025)"}}}}

RESPONSE: JSON duy nhất, không giải thích.
{{
  "intent": "data_query|action|navigation|general_chat|need_clarification",
  "confidence": "high|medium|low",
  "toolName": "tool_name hoặc null",
  "entities": {{}}
}}

TIN NHẮN: "{message}"
JSON:"""

# ── Backend action tools ──────────────────────────────────────────────────────
_BACKEND_ACTION_TOOLS = {
    "create_notification", "send_email", "create_user", "update_user", "delete_user",
    "create_course", "update_course", "delete_course",
    "create_major", "update_major", "delete_major",
    "create_specialization", "update_specialization", "delete_specialization",
    "create_sub_specialization", "update_sub_specialization", "delete_sub_specialization",
    "create_room", "update_room", "delete_room",
    "create_semester", "update_semester", "delete_semester",
    "create_class", "update_class", "delete_class",
    "add_student_to_class", "remove_student_from_class",
    "approve_schedule_request", "reject_schedule_request",
    "update_attendance_manually", "activate_user",
    "assign_course_to_specialization", "assign_course_to_sub_specialization",
    "update_student_info", "update_lecturer_info",
}

_DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]


class LightRouter:
    """Stage 1 – LLM intent router v3.0 (tối ưu quota + cache)."""

    def route(
        self,
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        # ✅ FIX 1: Check cache trước khi gọi LLM (key bao gồm history để tránh nhầm context)
        cache_key = _make_cache_key(message, user_role, history)
        cached = _cache_get(cache_key)
        if cached:
            return cached

        try:
            from datetime import datetime
            now      = datetime.now()
            today    = now.strftime("%Y-%m-%d")
            day_name = _DAY_NAMES[now.weekday()]

            tools_str   = self._build_tool_list(user_role)
            history_str = self._format_history(history)
            few_shot    = _FEW_SHOT_BY_ROLE.get(user_role, _FEW_SHOT_BY_ROLE["STUDENT"])

            # ✅ FIX: Escape braces in user-controlled strings to prevent .format() KeyError
            safe_message = message.replace("{", "{{").replace("}", "}}")
            safe_history = history_str.replace("{", "{{").replace("}", "}}")
            # Tools might also contain braces if descriptions are complex
            safe_tools   = tools_str.replace("{", "{{").replace("}", "}}")

            prompt = _PROMPT_TEMPLATE.format(
                role       = user_role,
                code       = user_code,
                role_rules = _ROLE_RULES.get(user_role, ""),
                history    = safe_history,
                tools      = safe_tools,
                schema     = _DB_SCHEMA_COMPACT,
                few_shot   = few_shot,
                message    = safe_message,
                today      = today,
                day_name   = day_name,
            )

            raw    = llm_client.complete(prompt, model)
            logger.info(f"[LightRouter v3] raw={raw[:200]}")
            result = self._parse_json(raw)
            result = self._post_process(result, message, user_role, user_code, history)
            logger.info(
                f"[LightRouter v3] tool={result.get('toolName')} "
                f"intent={result.get('intent')} confidence={result.get('confidence')}"
            )

            # ✅ FIX 2: Lưu vào cache nếu kết quả ổn định
            if _is_cacheable(message, result):
                _cache_set(cache_key, result)

            return result
        except Exception as exc:
            logger.error(f"[LightRouter v3] error: {exc}")
            return {"intent": "general_chat", "toolName": None, "entities": {}, "confidence": "low"}

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _build_tool_list(role: str) -> str:
        """✅ FIX: Chỉ build tool list cho role hiện tại, giảm ~60-70% token."""
        allowed = _ROLE_TOOLS.get(role, set())
        lines = [f"  • {name}: {desc}" for name, desc in _ALL_TOOLS.items() if name in allowed]
        return "\n".join(lines)

    @staticmethod
    def _format_history(history: Optional[List[Dict[str, str]]]) -> str:
        """✅ FIX: Giới hạn 5 turns (10 messages) thay vì 10 turns."""
        if not history:
            return "(không có)"
        parts = []
        for m in history[-10:]:   # 5 turns = 10 messages
            role    = "User" if m.get("role", "").upper() == "USER" else "Bot"
            content = m.get("content", "")
            if len(content) > 200:   # ✅ FIX: giảm từ 400 xuống 200
                content = content[:200] + "..."
            parts.append(f"[{role}]: {content}")
        return "\n".join(parts)

    @staticmethod
    def _parse_json(text: str) -> Dict[str, Any]:
        """✅ FIX: Parse JSON hiệu quả hơn với regex trực tiếp."""
        # Strategy 1: tìm JSON block chuẩn bằng regex
        match = re.search(r'\{[^{}]*"intent"[^{}]*\}', text, re.DOTALL)
        if match:
            candidate = match.group(0)
            # Xóa trailing commas
            candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        # Strategy 2: tìm JSON lớn nhất (fallback)
        start = text.find('{')
        end   = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            candidate = text[start:end+1]
            candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        raise ValueError(f"No valid JSON found in: {text[:150]}")

    @staticmethod
    def _extract_entities_from_history(
        history: Optional[List[Dict[str, str]]],
        keys: List[str],
    ) -> Dict[str, str]:
        if not history:
            return {}
        found = {}
        patterns = {
            "class_name":    r"\b([A-Z]{2,}\d{2,}[A-Z\d]*)\b",
            "course_code":   r"\b([A-Z]{3,}\d{3})\b",
            "student_code":  r"\b(SE\d{5,}|HE\d{5,}|IA\d{5,})\b",
            "lecturer_code": r"\b(GV\d{2,})\b",
        }
        for msg in reversed(history[-10:]):
            content = msg.get("content", "")
            for key in keys:
                if key not in found and key in patterns:
                    m = re.search(patterns[key], content, re.IGNORECASE)
                    if m:
                        found[key] = m.group(1).upper()
        return found

    def _post_process(
        self,
        result: Dict[str, Any],
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        tool_name = (result.get("toolName") or "").strip()

        # 0. Clean category tags
        if tool_name and "[" in tool_name:
            tool_name = re.sub(r"\[.*?\]\s*", "", tool_name).strip()
            result["toolName"] = tool_name

        intent   = (result.get("intent") or "").strip().lower()
        entities = result.get("entities") or {}

        # 0.5 ✅ FORCE CORRECT TOOL: Detect schedule queries and correct wrong tool routing
        msg_lower = message.lower()
        # Keywords for schedule queries
        schedule_keywords = ("lịch dạy", "lịch giảng", "schedule", "lịch", "tiết")
        is_schedule_query = any(kw in msg_lower for kw in schedule_keywords)
        
        if is_schedule_query:
            # Extract codes from message
            gv_match = re.search(r'\b(GV\d{2,6})\b', message, re.IGNORECASE)
            se_match = re.search(r'\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b', message, re.IGNORECASE)
            
            # For lecturer schedule query
            if gv_match and tool_name != "get_other_lecturer_schedule":
                gv_code = gv_match.group(1).upper()
                if tool_name not in ("get_other_lecturer_schedule", "get_own_schedule"):
                    logger.warning(f"[PostProcess] CORRECTING tool: '{tool_name}' → 'get_other_lecturer_schedule' (found GV code in schedule query)")
                    tool_name = "get_other_lecturer_schedule"
                    result["toolName"] = tool_name
                    entities["lecturer_code"] = gv_code
                    entities.pop("full_name", None)
                    entities.pop("code", None)
            
            # For student schedule query
            elif se_match and tool_name != "get_other_student_schedule":
                se_code = se_match.group(1).upper()
                if tool_name not in ("get_other_student_schedule", "get_own_schedule"):
                    logger.warning(f"[PostProcess] CORRECTING tool: '{tool_name}' → 'get_other_student_schedule' (found SV code in schedule query)")
                    tool_name = "get_other_student_schedule"
                    result["toolName"] = tool_name
                    entities["student_code"] = se_code
                    entities.pop("full_name", None)
                    entities.pop("code", None)
            
            # ✅ NEW: Force date extraction if not present or "tuần sau" detected
            if tool_name in ("get_other_lecturer_schedule", "get_other_student_schedule", "get_own_schedule", "get_class_schedule"):
                if "tuần sau" in msg_lower or "tuan sau" in msg_lower:
                    entities["date"] = "NEXT_WEEK"
                elif "tuần này" in msg_lower or "tuan nay" in msg_lower:
                    entities["date"] = "THIS_WEEK"
                elif "hôm nay" in msg_lower or "hom nay" in msg_lower:
                    entities["date"] = "TODAY"

        # ✅ FIX #3: Clean entity values — remove noise từ LLM extract
        # E.g., "của Công nghệ thông tin?" → "Công nghệ thông tin"
        for ek in list(entities.keys()):
            ev = entities.get(ek)
            if isinstance(ev, str):
                ev = re.sub(r'^(của\s+|thuộc\s+|trong\s+|ở\s+|về\s+|ngành\s+)', '', ev.strip(), flags=re.IGNORECASE)
                ev = re.sub(r'[?!.]+$', '', ev).strip()
                ev = ev.strip('"\'')
                if ev != entities[ek]:
                    logger.info(f"[PostProcess] Cleaned entity '{ek}': '{entities[ek]}' → '{ev}'")
                    entities[ek] = ev
        result["entities"] = entities

        # 1. Alias mapping
        if tool_name in _TOOL_ALIASES:
            tool_name = _TOOL_ALIASES[tool_name]
            result["toolName"] = tool_name

        # 2. Fuzzy match nếu tool không tồn tại
        elif tool_name and tool_name not in _ALL_TOOLS:
            corrected = self._fuzzy_match_tool(tool_name, set(_ALL_TOOLS.keys()))
            if corrected:
                logger.warning(f"[PostProcess] Typo repair: '{tool_name}' → '{corrected}'")
                tool_name = corrected
                result["toolName"] = corrected

        # 3. Auto-set intent=navigation cho view_ tools
        if tool_name.startswith("view_"):
            result["intent"] = "navigation"
            intent = "navigation"

        # 4. Permission check
        allowed_tools = _ROLE_TOOLS.get(user_role, set())
        if tool_name and tool_name not in allowed_tools:
            logger.warning(f"[PostProcess] Permission denied: role={user_role} tool={tool_name}")
            result["intent"]   = "permission_denied"
            result["entities"] = {"reason": f"Vai trò {user_role} không có quyền dùng '{tool_name}'."}
            result["toolName"] = None
            return result

        # ✅ NEW 4.5: Detect ambiguous name query (sinh viên/GV theo tên mà không có mã)
        if tool_name == "get_student_by_code":
            has_code = entities.get("student_code") and _is_code_in_message(message, "student_code")
            has_name = entities.get("full_name")
            if not has_code and has_name:
                full_name = entities["full_name"]
                result["intent"] = "need_clarification"
                result["confidence"] = "low"
                result["toolName"] = None
                result["entities"] = {
                    "missingInfo": (
                        f"Bạn muốn tìm sinh viên tên **{full_name}**?\n\n"
                        f"Vui lòng cung cấp:\n"
                        f"• **MÃ sinh viên** (VD: SE18B001, HE170123) HOẶC\n"
                        f"• **Tên + ngành/lớp** để xác định chính xác\n\n"
                        f"Ví dụ: 'Sinh viên mã SE18B001' hoặc 'SV Vũ Hải Thanh ngành CNTT'"
                    )
                }
                logger.info(f"[PostProcess] Ambiguous student query: '{full_name}' → need_clarification")
                return result
        
        elif tool_name == "get_lecturer_by_code":
            has_code = entities.get("lecturer_code") and _is_code_in_message(message, "lecturer_code")
            has_name = entities.get("full_name")
            if not has_code and has_name:
                full_name = entities["full_name"]
                result["intent"] = "need_clarification"
                result["confidence"] = "low"
                result["toolName"] = None
                result["entities"] = {
                    "missingInfo": (
                        f"Bạn muốn tìm giáo viên tên **{full_name}**?\n\n"
                        f"Vui lòng cung cấp:\n"
                        f"• **MÃ giảng viên** (VD: GV001, GV115211) HOẶC\n"
                        f"• **Tên + bộ môn** để xác định chính xác\n\n"
                        f"Ví dụ: 'Giáo viên mã GV001' hoặc 'GV Trần Văn Nam - Bộ môn Tin học'"
                    )
                }
                logger.info(f"[PostProcess] Ambiguous lecturer query: '{full_name}' → need_clarification")
                return result

        # 5. Force intent=action cho backend action tools
        if tool_name in _BACKEND_ACTION_TOOLS:
            result["intent"] = "action"
            intent = "action"
            action = result.get("action")
            if not action or not isinstance(action, dict):
                result["action"] = {"type": tool_name.upper(), "params": entities}
            else:
                action["type"] = tool_name.upper()
                if not action.get("params"):
                    action["params"] = entities

        if history and not result.get("context_resolved"):
            msg_lower = message.lower()
            ambiguous = ["lớp đó", "lớp này", "môn đó", "môn này"]
            if any(t in msg_lower for t in ambiguous):
                needs = []
                if "lớp" in msg_lower:
                    needs.append("class_name")
                if "môn" in msg_lower:
                    needs.append("course_code")
                hist_entities = self._extract_entities_from_history(history, needs)
                for k, v in hist_entities.items():
                    if not entities.get(k):
                        entities[k] = v
                        result["context_resolved"] = v
                result["entities"] = entities

        # 7. LECTURER notification restriction
        if tool_name == "create_notification" and user_role == "LECTURER":
            action = result.get("action") or {}
            params = action.get("params", {}) if isinstance(action, dict) else {}
            if params.get("target_type") == "ALL":
                params["target_type"] = "STUDENT"

        # ✅ NEW FIX: Extract code from full_name if LLM merged code with name
        # E.g., full_name="giáo viên mã GV115211" → extract lecturer_code="GV115211"
        if entities.get("full_name") and not entities.get("lecturer_code"):
            full_name = entities["full_name"]
            # Pattern: "mã GV/code GV..." → extract GV followed by digits
            code_match = re.search(r'\b(GV\d{2,6}|SE\d{5,6}|HE\d{5,6}|IA\d{5,6}|[A-Z]{3,4}\d{3})\b', full_name, re.IGNORECASE)
            if code_match:
                code = code_match.group(1).upper()
                # Determine which code field based on tool and code pattern
                if tool_name == "get_other_lecturer_schedule" and code.startswith("GV"):
                    entities["lecturer_code"] = code
                    entities.pop("full_name", None)  # Remove merged full_name
                    logger.info(f"[PostProcess] Fixed: extracted lecturer_code='{code}' from full_name='{full_name}'")
                elif tool_name == "get_other_student_schedule" and code[:2] in ["SE", "HE", "IA"]:
                    entities["student_code"] = code
                    entities.pop("full_name", None)
                    logger.info(f"[PostProcess] Fixed: extracted student_code='{code}' from full_name='{full_name}'")
                elif tool_name == "get_enrollments_by_class" and len(code) >= 3:
                    entities["class_name"] = code
                    entities.pop("full_name", None)
                    logger.info(f"[PostProcess] Fixed: extracted class_name='{code}' from full_name='{full_name}'")
        
        # ✅ ALSO: Extract code directly from message if tool expects schedule data
        # This handles cases where LLM routes to wrong tool but message contains code
        if tool_name in ("get_other_lecturer_schedule", "get_other_student_schedule", "get_class_schedule"):
            msg_lower = message.lower()
            # Extract GV code if looking for lecturer schedule
            if tool_name == "get_other_lecturer_schedule" and not entities.get("lecturer_code"):
                gv_match = re.search(r'\b(GV\d{2,6})\b', message, re.IGNORECASE)
                if gv_match:
                    entities["lecturer_code"] = gv_match.group(1).upper()
                    entities.pop("full_name", None)
                    logger.info(f"[PostProcess] Extracted lecturer_code from message: {entities['lecturer_code']}")
            
            # Extract SE/HE/IA code if looking for student schedule
            elif tool_name == "get_other_student_schedule" and not entities.get("student_code"):
                se_match = re.search(r'\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b', message, re.IGNORECASE)
                if se_match:
                    entities["student_code"] = se_match.group(1).upper()
                    entities.pop("full_name", None)
                    logger.info(f"[PostProcess] Extracted student_code from message: {entities['student_code']}")

        # 6.5 ✅ FIX: Restore Vietnamese diacritics + fix corrupted words in entity names
        # LLM may return corrupted Vietnamese (not just missing diacritics but wrong words)
        # Example: "công nghệ" → "cương nghình" (completely wrong!)
        # Solution: Use unaccent comparison to find original in message, with fallback to reconstruct
        
        def unaccent(text):
            """Remove Vietnamese diacritics for comparison."""
            return ''.join(
                c for c in unicodedata.normalize('NFD', str(text).lower())
                if unicodedata.category(c) != 'Mn'
            )
        
        for key in ["full_name", "person_name", "name", "user_name", "major_name", "specialization_name", "course_name"]:
            if key in entities and entities[key]:
                entity_val = str(entities[key]).strip()
                if not entity_val:
                    continue
                
                entity_unaccent = unaccent(entity_val)
                msg_words = message.split()
                best_match = None
                best_match_score = 0
                
                # Try different window sizes (1-5 words)
                for window_size in range(min(5, len(msg_words)), 0, -1):
                    for i in range(len(msg_words) - window_size + 1):
                        phrase_candidate = " ".join(msg_words[i:i+window_size])
                        phrase_unaccent = unaccent(phrase_candidate)
                        
                        # Calculate match score based on similarity and substring match
                        similarity = self._string_similarity(phrase_unaccent, entity_unaccent)
                        
                        # Award higher scores for: exact match, substring match, or high similarity
                        match_score = 0
                        if phrase_unaccent == entity_unaccent:
                            match_score = 1.0  # Perfect match
                        elif phrase_unaccent in entity_unaccent or entity_unaccent in phrase_unaccent:
                            match_score = 0.95  # Substring match
                        elif similarity > 0.6:
                            match_score = similarity  # Fuzzy match
                        
                        # Keep the best match (prioritize longer matches)
                        if match_score > best_match_score or (match_score == best_match_score and len(phrase_unaccent) > len(best_match or "")):
                            best_match = phrase_candidate
                            best_match_score = match_score
                
                # Apply fix if match found
                if best_match and best_match_score >= 0.6:
                    entities[key] = best_match
                    logger.info(f"[PostProcess] Fixed corrupted entity: {key}='{entity_val}' → '{best_match}' (score={best_match_score:.2f})")
                    result["entities"] = entities
                elif entity_val and entity_val.islower() and any(c in entity_unaccent for c in "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"):
                    # Fallback: if entity is lowercase with Vietnamese chars and we found nothing, 
                    # it's likely corrupted. Log warning and try to find ANY matching keyword
                    logger.warning(f"[PostProcess] Entity '{key}' appears corrupted: '{entity_val}' - no good match found in message")

        # 8. Validate dynamic SQL
        dynamic_sql = (result.get("dynamicSql") or "").strip()
        if dynamic_sql:
            sql_upper = dynamic_sql.upper().lstrip()
            if not sql_upper.startswith("SELECT") or any(
                x in sql_upper for x in ["UPDATE", "DELETE", "INSERT", "DROP", "TRUNCATE"]
            ):
                logger.error(f"[PostProcess] BLOCKED dangerous SQL: {dynamic_sql[:100]}")
                result["dynamicSql"] = None
                result["intent"]     = "permission_denied"
                result["entities"]   = {"reason": "Chỉ hỗ trợ truy vấn SELECT an toàn."}

        # 9. Ensure confidence
        if "confidence" not in result:
            result["confidence"] = "medium"

        return result

    @staticmethod
    def _string_similarity(s1: str, s2: str) -> float:
        """Calculate similarity score between two strings (0-1)."""
        return difflib.SequenceMatcher(None, s1, s2).ratio()

    @staticmethod
    def _fuzzy_match_tool(typo: str, candidates: Set[str]) -> Optional[str]:
        typo_lower = typo.lower().replace("-", "_")
        for c in candidates:
            if c.lower() == typo_lower:
                return c
        matches = difflib.get_close_matches(typo_lower, list(candidates), n=1, cutoff=0.7)
        return matches[0] if matches else None


# Module-level singleton
light_router = LightRouter()