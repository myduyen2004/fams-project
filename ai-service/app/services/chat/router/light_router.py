"""
router/light_router.py  ── v4.1 (Prompt v6 — lean 89% token reduction)

CHANGES v4.1:
  ✅ Replace _PROMPT_TEMPLATE với v6-lean (~340 tokens template thuần, giảm 89% vs v4)
  ✅ Remove lỗi spell-correction block bị nhúng nhầm vào prompt gốc
  ✅ Few-shots vẫn giữ nguyên (đây là backbone routing)
  ✅ Post-process pipeline giữ nguyên
"""
from __future__ import annotations

import difflib
import hashlib
import json
import re
import threading
import unicodedata
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Set, Tuple, cast

from loguru import logger
from app.services.chat.db.tools_loader import tools_loader # type: ignore
from app.services.chat.db.queries import normalize_entities
from app.services.chat.router.permissions import check_permission
from app.services.chat.router.tool_catalog import (
    build_agent_tool_list,
    detect_agent,
    get_agent_guidance,
    get_agent_label,
    get_role_guidance,
    get_tool_agent,
)
from app.services.chat.services.llm_client import llm_client

# ── LRU Cache ─────────────────────────────────────────────────────────────────
_ROUTE_CACHE: OrderedDict[str, Dict] = OrderedDict()
_ROUTE_CACHE_MAX = 200
_ROUTE_CACHE_LOCK = threading.Lock()

_CACHEABLE_INTENTS = {"navigation", "general_chat", "permission_denied", "need_clarification", "tool_locked"}
_TIME_KEYWORDS = {"hôm nay", "ngày mai", "tuần này", "tuần tới", "tuần sau", "tháng này", "hom nay", "tuan nay", "tuan sau"}
_AI_ONLY_TOOLS = {"general_offtopic_chat"}
_RUNTIME_EXTRA_TOOLS = {
    "general_offtopic_chat": "Trả lời câu hỏi ngoài lề bằng AI",
    "get_absence_rate_by_class": "Thống kê tỉ lệ vắng mặt tổng quan của một lớp",
    "get_my_attendance_overview": "Tổng quan điểm danh cá nhân của sinh viên",
    "get_my_absence_history": "Lịch sử vắng học gần đây của sinh viên",
    "get_my_attendance_risk_courses": "Môn học có nguy cơ rớt do vắng từ 3 buổi trở lên",
}

_TOOL_GROUP_PRIORITY = [
    "notifications",
    "requests",
    "admin",
    "rooms",
    "attendance",
    "grades",
    "schedule",
    "classes",
    "courses",
    "people",
]

_TOOL_GROUP_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "rooms": (
        "phòng", "room", "slot", "tiết", "ca", "lab", "a101", "b204",
    ),
    "schedule": (
        "lịch", "thời khóa biểu", "thoi khoa bieu", "schedule", "semester", "học kỳ", "hoc ky",
    ),
    "attendance": (
        "điểm danh", "diem danh", "vắng", "vang", "chuyên cần", "chuyen can", "attendance",
    ),
    "grades": (
        "điểm", "diem", "gpa", "bảng điểm", "bang diem", "phổ điểm", "pho diem", "grade",
    ),
    "notifications": (
        "thông báo", "thong bao", "notification", "email", "mail",
    ),
    "people": (
        "sinh viên", "sinh vien", "sv", "giảng viên", "giang vien", "gv", "người dùng", "nguoi dung", "user", "profile", "hồ sơ", "ho so",
    ),
    "courses": (
        "môn", "mon", "course", "ngành", "nganh", "major", "chuyên ngành", "chuyen nganh", "specialization", "curriculum",
    ),
    "classes": (
        "lớp", "lop", "class",
    ),
    "admin": (
        "tài khoản", "tai khoan", "kích hoạt", "kich hoat", "log", "nhật ký", "nhat ky", "cảnh báo", "canh bao", "quyền", "permission",
    ),
    "requests": (
        "yêu cầu", "yeu cau", "request", "đổi lịch", "doi lich", "đơn", "don",
    ),
}

_TOOL_GROUP_RULES: Dict[str, Dict[str, Tuple[str, ...]]] = {
    "rooms": {
        "starts_with": ("get_room", "view_room", "count_rooms", "create_room", "update_room"),
        "contains": ("empty_room", "rooms_busy", "all_rooms", "suitable_rooms", "room_fill_rate"),
        "exact": ("view_rooms",),
    },
    "schedule": {
        "starts_with": ("get_own_schedule", "get_my_schedule", "get_other_lecturer_schedule", "get_other_student_schedule",
                        "get_lecturer_schedule", "get_student_schedule", "get_weekly_timetable", "get_slots_", "get_timetable_", "view_schedule"),
        "contains": ("schedule", "semester", "slot_time", "slot_detail", "active_semester", "semester_overview", "semester_countdown"),
        "exact": ("list_semesters", "view_semesters", "get_active_semester"),
    },
    "attendance": {
        "starts_with": ("get_attendance", "update_attendance", "view_attendance"),
        "contains": ("absence", "attendance", "open_sessions", "consecutive_absences"),
        "exact": ("get_my_attendance_status", "get_my_attendance_overview", "get_my_absence_history", "get_my_attendance_risk_courses"),
    },
    "grades": {
        "starts_with": ("get_grade", "view_grade", "import_component_grades"),
        "contains": ("gpa", "grade", "grades", "ranking", "top_students", "detail_course_grade", "full_grade_sheet"),
        "exact": ("get_own_grades", "view_grades", "view_exam_grades", "view_resit_grades"),
    },
    "notifications": {
        "starts_with": ("create_notification", "view_notifications", "get_my_notifications", "count_unread_notifications"),
        "contains": ("notification", "notifications", "unread_notifications"),
        "exact": ("list_notifications", "get_notification_history_for_user", "send_email"),
    },
    "people": {
        "starts_with": ("get_student", "get_lecturer", "view_students", "view_lecturers", "update_student_info", "update_lecturer_info"),
        "contains": ("student", "lecturer", "user_by_code", "search_user", "classmates", "users_by_role", "inactive_users", "create_user", "update_user", "activate_user"),
        "exact": ("view_users", "get_user_by_code"),
    },
    "courses": {
        "starts_with": ("get_course", "view_courses", "create_course", "update_course", "create_major", "update_major",
                        "create_specialization", "update_specialization", "create_sub_specialization", "update_sub_specialization"),
        "contains": ("courses_", "major", "specialization", "sub_specialization", "curriculum"),
        "exact": ("list_courses", "list_majors", "view_majors", "view_specializations", "view_sub_specializations"),
    },
    "classes": {
        "starts_with": ("get_class", "view_classes", "create_class", "update_class"),
        "contains": ("by_class", "class_health_check", "enrollments_by_class", "students_by_class", "add_student_to_class", "remove_student_from_class"),
        "exact": ("view_teaching_classes",),
    },
    "admin": {
        "starts_with": ("view_logs", "view_alerts", "export_", "import_", "create_group_chat"),
        "contains": ("logs", "alerts", "users_by_role", "system", "wifi"),
        "exact": ("view_users", "view_inactive_users", "view_wifi_aps"),
    },
    "requests": {
        "starts_with": ("create_schedule_request", "approve_schedule_request", "reject_schedule_request", "create_academic_request"),
        "contains": ("schedule_request", "request_detail", "request_list"),
        "exact": ("get_my_schedule_requests", "get_schedule_request_list", "view_schedule_requests"),
    },
}

_CODE_PATTERNS = {
    "student_code": r"\b(SE|HE|IA)\d{5,6}\b",
    "lecturer_code": r"\bGV\d{2,6}\b",
    "course_code": r"\b[A-Z]{3,4}\d{3}\b",
    "room_code": r"\b[A-Z]\d{2,3}\b",
    "class_name": r"\b([A-Z]{2,}\d{2,}[A-Z\d]*_[A-Z0-9]+|[A-Z]{2,}\d{2,}[A-Z\d]*-[A-Z]{2,4}\d{3,4})\b",
}

_GENERAL_OFFTOPIC_PATTERNS = [
    re.compile(r"^\s*\d+\s*[\+\-\*x×/]\s*\d+\s*=?\s*$", re.I),
    re.compile(r"\b(thời tiết|weather|mưa không|nắng không|nóng không|lạnh không)\b", re.I),
    re.compile(r"\b(1\+1|toán|math|phép cộng|phép trừ|phép nhân|phép chia)\b", re.I),
    re.compile(r"\b(cuộc sống|đời sống|tình yêu|stress|buồn|chán|động lực|lời khuyên)\b", re.I),
]

_STUDENT_INFO_RE = re.compile(
    r"(?:\b(thông tin|hiển thị thông tin|xem thông tin|tra cứu|hồ sơ|profile)\b.*\b(sinh viên|học sinh|sv)\b|\b(sinh viên|học sinh|sv)\b.*\b(thông tin|hiển thị thông tin|xem thông tin|tra cứu|hồ sơ|profile)\b)",
    re.I | re.UNICODE,
)
_LECTURER_INFO_RE = re.compile(
    r"(?:\b(thông tin|hiển thị thông tin|xem thông tin|tra cứu|hồ sơ|profile)\b.*\b(giảng viên|giáo viên|gv|thầy|cô)\b|\b(giảng viên|giáo viên|gv|thầy|cô)\b.*\b(thông tin|hiển thị thông tin|xem thông tin|tra cứu|hồ sơ|profile)\b)",
    re.I | re.UNICODE,
)
_ONLY_CODE_RE = re.compile(r"^\s*(?:mã\s*)?([A-Z]{2}\d{3,})\s*$", re.I)
_AGGREGATE_QUERY_RE = re.compile(
    r"(danh sách|ds|liệt kê|bao nhiêu|đếm|tổng số|có mấy|thống kê|tỉ lệ|ty le|báo cáo|xu hướng|top)",
    re.I | re.UNICODE,
)
_MAJOR_SCOPE_RE = re.compile(r"(ngành|nghành|nganh|nhành|major)", re.I | re.UNICODE)
_MAJOR_COUNT_RE = re.compile(r"(bao nhiêu|đếm|tổng số|có mấy)", re.I | re.UNICODE)
_MAJOR_LIST_RE = re.compile(r"(danh sách|ds|liệt kê|cho xem|xem các|toàn bộ)", re.I | re.UNICODE)
_SPECIALIZATION_SCOPE_RE = re.compile(r"(chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh|specialization)", re.I | re.UNICODE)
_SUB_SPECIALIZATION_SCOPE_RE = re.compile(
    r"(chuyên ngành hẹp|chuyen nganh hep|chuyên nghành hẹp|chuyen nghanh hep|sub[\s_-]*specialization)",
    re.I | re.UNICODE,
)
_TAXONOMY_STOPWORDS = {
    "nào", "nao", "gì", "gi", "của", "cua", "thuộc", "thuoc", "đang", "dang", "là", "la",
}
_CLASS_ROSTER_RE = re.compile(r"(danh sách|ds|liệt kê|bao nhiêu|đếm|tổng số).*(sinh viên|học sinh|sv).*(lớp)", re.I | re.UNICODE)
_LECTURER_OWN_CLASSES_RE = re.compile(
    r"(danh sách|ds).*(lớp).*(tôi đang dạy|tôi dạy|tôi đang giảng dạy|đang giảng dạy|dạy của tôi|lớp dạy của tôi|lớp tôi đang dạy)",
    re.I | re.UNICODE,
)
_LECTURER_OWN_CLASSES_EXACT_RE = re.compile(
    r"\s*(các\s+)?lớp\s+(tôi đang dạy|tôi dạy|tôi đang giảng dạy|đang giảng dạy|dạy của tôi)\s*",
    re.I | re.UNICODE,
)
_CLASS_SCHEDULE_RE = re.compile(r"(thời khóa biểu|lịch).*(lớp)", re.I | re.UNICODE)
_OWN_SCHEDULE_RE = re.compile(r"(thời khóa biểu|lịch (dạy|học)).*(của tôi|của em|em|tôi)", re.I | re.UNICODE)
_OWN_GRADE_RE = re.compile(r"(bảng điểm|điểm số|kết quả học tập).*(của tôi|của em|em)", re.I | re.UNICODE)
_GRADE_COMPONENT_RE = re.compile(r"(cấu phần điểm|thành phần điểm)", re.I | re.UNICODE)
_COURSES_BY_SEMESTER_RE = re.compile(
    r"(danh sách|ds).*(môn học|môn).*(trong|theo).*(học kỳ|kỳ)|(môn học|môn).*(học kỳ|kỳ)\s*[a-z]{2}\d{2}",
    re.I | re.UNICODE,
)
_SEARCH_USER_BY_NAME_RE = re.compile(
    r"(?:tìm|tra cứu|tim|tra cuu).*(?:người dùng|tài khoản|user).*(?:theo tên|dùng tên|ten)\s+(.+)$",
    re.I | re.UNICODE,
)
_MAJOR_ID_QUERY_RE = re.compile(
    r"(?:tra cứu|tim|tìm|xem).*(?:mã|ma).*(?:ngành|nghành|nganh|nhành)(?:\s+học)?(?:\s+của)?\s+(.+)$",
    re.I | re.UNICODE,
)
_SPECIALIZATION_ID_QUERY_RE = re.compile(
    r"(?:tra cứu|tim|tìm|xem).*(?:mã|ma).*(?:chuyên ngành)(?:\s+của)?\s+(.+)$",
    re.I | re.UNICODE,
)
_NOTIFICATION_HISTORY_RE = re.compile(r"(lịch sử|lich su).*(thông báo|notification)", re.I | re.UNICODE)
_CLASSMATES_RE = re.compile(r"(học cùng lớp|hoc cung lop|cùng lớp với|cung lop voi)", re.I | re.UNICODE)
_SLOT_TIME_INFO_RE = re.compile(r"(khung giờ học|khung giờ|thông tin.*slot|thông tin.*khung giờ)", re.I | re.UNICODE)
_SLOTS_BY_DATE_RE = re.compile(r"(slot nào|khung giờ nào|có những slot nào|có những khung giờ nào)", re.I | re.UNICODE)
_SLOTS_BY_NUMBER_RE = re.compile(r"(?:slot|ca|tiết)\s*(?:số\s*)?\d+", re.I | re.UNICODE)
_SLOTS_BY_TIME_RANGE_RE = re.compile(r"\b(từ|from)\s*\d{1,2}:\d{2}.*\b(đến|den|to|tới)\b", re.I | re.UNICODE)
_OPEN_TEACHING_CLASSES_RE = re.compile(
    r"^(?:mở|mo|xem|vào|vao)\s+(?:danh sách\s+)?(?:các\s+)?lớp.*(tôi đang dạy|tôi dạy|tôi đang giảng dạy)",
    re.I | re.UNICODE,
)
_OPEN_ASSIGNMENTS_RE = re.compile(
    r"^(?:mở|mo|xem|vào|vao).*(?:trang|mục|danh sách)?\s*(?:bài tập|assignments)",
    re.I | re.UNICODE,
)
_CREATE_ROOM_RE = re.compile(r"(?:tạo|tao|thêm)\s+(?:phòng|phòng học)", re.I | re.UNICODE)
_CREATE_SPECIALIZATION_RE = re.compile(r"(?:tạo|tao|thêm)\s+chuyên\s+ngành(?!\s+hẹp)", re.I | re.UNICODE)
_ASSIGN_COURSE_TO_SPEC_RE = re.compile(r"(?:gán|gan|thêm)\s+(?:môn|môn học).*(?:vào|cho).*(?:chuyên ngành)", re.I | re.UNICODE)
_ATTENDANCE_BY_CLASS_DATE_RE = re.compile(r"(điểm danh).*(lớp).*(ngày|\d{4}-\d{2}-\d{2}|hôm nay|ngày mai)", re.I | re.UNICODE)
_GROUP_CHAT_RE = re.compile(r"(tạo|tao|mở|mo).*(nhóm chat|group chat)", re.I | re.UNICODE)
_EMAIL_RE = re.compile(r"(gửi|gui).*(email|mail)", re.I | re.UNICODE)
_ACADEMIC_REQUEST_RE = re.compile(
    r"(tạo|tao|gửi|gui|nộp|nop).*(đơn|yeu cau|yêu cầu).*(tạm nghỉ|bảo lưu|bao luu|học lại|hoc lai|đổi lớp|doi lop|chuyển lớp|chuyen lop|học vượt|hoc vuot|miễn điểm danh|mien diem danh|phúc khảo|phuc khao|chuyển ngành|chuyen nganh|đổi chuyên ngành|doi chuyen nganh)",
    re.I | re.UNICODE,
)
_SCHEDULE_REQUEST_RE = re.compile(
    r"(tạo\s+yêu\s+cầu\s+đổi\s+lịch|gửi\s+yêu\s+cầu\s+đổi\s+lịch|tạo\s+đổi\s+lịch|đổi\s+lịch\s+từ\s+slot|đổi\s+lịch\s+từ\s+ngày)",
    re.I | re.UNICODE,
)
_SCHEDULE_REQUEST_LIST_RE = re.compile(
    r"(danh sách|ds|hiển thị|liệt kê|xem).*(yêu cầu đổi lịch|yc đổi lịch|request đổi lịch|schedule request)|"
    r"(yêu cầu đổi lịch|yc đổi lịch|schedule request).*(trạng thái|status|đang|chờ duyệt|pending|approved|rejected|active)",
    re.I | re.UNICODE,
)
_ABSENCE_RATE_CLASS_RE = re.compile(r"(tỉ lệ|ty le).*(vắng|vang).*(lớp)|(?:lớp).*(tỉ lệ|ty le).*(vắng|vang)", re.I | re.UNICODE)
_ATTENDANCE_STATS_CLASS_RE = re.compile(
    r"((thống kê|thong ke|báo cáo|bao cao|tổng quan|tong quan).*(điểm danh|diem danh|chuyên cần|chuyen can).*(lớp)|"
    r"(điểm danh|diem danh|chuyên cần|chuyen can).*(thống kê|thong ke|báo cáo|bao cao|tổng quan|tong quan).*(lớp)|"
    r"(thống kê|thong ke|báo cáo|bao cao|tổng quan|tong quan).*(lớp).*(điểm danh|diem danh|chuyên cần|chuyen can))",
    re.I | re.UNICODE,
)
_ATTENDANCE_HISTORY_RE = re.compile(r"(vắng học|lịch sử vắng|vắng những buổi|đã vắng buổi nào|đã vắng những buổi nào)", re.I | re.UNICODE)
_ATTENDANCE_RISK_RE = re.compile(r"(nguy cơ.*điểm danh|nguy cơ.*vắng|rớt môn.*điểm danh|cấm thi.*điểm danh)", re.I | re.UNICODE)
_ATTENDANCE_OVERVIEW_RE = re.compile(r"(tổng quan điểm danh|tổng quan chuyên cần|chuyên cần của|điểm danh của)", re.I | re.UNICODE)
_PROFILE_COMPETING_SIGNAL_RE = re.compile(
    r"(vắng|điểm danh|chuyên cần|lịch|thời khóa biểu|điểm|gpa|lớp|môn|slot|ca|tiết|học kỳ|tuần|ngày mai|hôm nay)",
    re.I | re.UNICODE,
)
_GENERIC_SEMESTER_KNOWLEDGE_RE = re.compile(
    r"((một|1)\s*năm.*(bao nhiêu|mấy).*(học kỳ|hoc ky|kỳ|ky))|"
    r"((trường|truong|fptu|fpt university).*(bao nhiêu|mấy).*(học kỳ|hoc ky|kỳ|ky))|"
    r"((hệ đào tạo|he dao tao|chương trình|chuong trinh).*(bao nhiêu|mấy).*(học kỳ|hoc ky|kỳ|ky))",
    re.I | re.UNICODE,
)


def _has_strong_academic_signal(message: str) -> bool:
    if any(re.search(pattern, message, re.IGNORECASE) for pattern in _CODE_PATTERNS.values()):
        return True
    return bool(
        re.search(
            r"\b(sinh viên|giảng viên|thời khóa biểu|bảng điểm|điểm danh|học kỳ|môn|ngành|nghành|chuyên ngành|chuyên nghành)\b",
            message,
            re.IGNORECASE,
        )
    )


def _looks_like_general_offtopic(message: str) -> bool:
    msg_normalized = message.lower()
    school_knowledge_patterns = (
        "fptu", "fpt university", "trường đại học fpt", "truong dai hoc fpt",
        "học kỳ doanh nghiệp", "hoc ky doanh nghiep", "ojt", "schoolrank",
        "safe exam browser", "seb", "học phí", "hoc phi", "hiệu trưởng", "hieu truong",
        "chủ tịch", "chu tich", "sứ mệnh", "su menh", "tầm nhìn", "tam nhin",
        "triết lý", "triet ly", "vovinam", "coursera", "edx", "fap",
    )
    if any(pattern in msg_normalized for pattern in school_knowledge_patterns):
        return True
    if _GENERIC_SEMESTER_KNOWLEDGE_RE.search(message):
        return True
    if _has_strong_academic_signal(message):
        return False
    return any(pattern.search(message) for pattern in _GENERAL_OFFTOPIC_PATTERNS)

def _is_code_in_message(message: str, code_type: str) -> bool:
    if code_type in _CODE_PATTERNS:
        return bool(re.search(_CODE_PATTERNS[code_type], message, re.IGNORECASE))
    return False


def _set_tool(result: Dict[str, Any], tool_name: str, intent: Optional[str] = None) -> str:
    result["toolName"] = tool_name
    if intent is not None:
        result["intent"] = intent
    return tool_name


def _has_contextual_scope(entities: Dict[str, Any]) -> bool:
    return bool(
        entities.get("major_name")
        or entities.get("major_code")
        or entities.get("class_name")
        or entities.get("course_code")
        or entities.get("course_name")
        or entities.get("semester_code")
        or entities.get("semester_name")
        or entities.get("date")
        or entities.get("start_date")
        or entities.get("end_date")
    )


# ── Constants & Registries ────────────────────────────────────────────────────
_FALLBACK_BACKEND_ACTION_TOOLS = {
    "create_notification", "send_email",
    "create_user", "update_user",
    "create_class", "create_course", "create_major", "create_room",
    "create_semester", "create_specialization", "create_sub_specialization",
    "update_course", "update_major",
    "activate_user", "create_schedule_request",
    "update_attendance_manually", "update_class", "update_lecturer_info",
    "update_room", "update_semester", "update_specialization",
    "update_student_info", "update_sub_specialization",
    "add_student_to_class", "remove_student_from_class",
    "assign_course_to_specialization", "assign_course_to_sub_specialization",
    "approve_schedule_request", "reject_schedule_request",
    "import_component_grades", "export_attendance_stats", "export_excel",
    "create_group_chat",
    "create_academic_request",
}


def _all_tools() -> Dict[str, str]:
    return {**tools_loader.all_tools_formatted, **_RUNTIME_EXTRA_TOOLS}


def _normalize_group_text(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text.lower())
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", normalized)


def _clean_taxonomy_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip().strip(" .,:;?!")
    cleaned = re.sub(r"\b(đang|dang|hiện có|hien co|có|co|gồm|gom|là gì|la gi|là|la|nào|nao)$", "", cleaned, flags=re.IGNORECASE).strip()
    normalized = _normalize_group_text(cleaned)
    if not normalized or normalized in _TAXONOMY_STOPWORDS:
        return None
    return cleaned


def _tool_in_group(tool_name: str, group_name: str) -> bool:
    rules = _TOOL_GROUP_RULES.get(group_name)
    if not rules or not tool_name:
        return False
    if tool_name in rules.get("exact", ()):
        return True
    if any(tool_name.startswith(prefix) for prefix in rules.get("starts_with", ())):
        return True
    return any(fragment in tool_name for fragment in rules.get("contains", ()))


def _detect_tool_group(message: str) -> Tuple[Optional[str], int]:
    normalized = _normalize_group_text(message)
    scores: Dict[str, int] = {group: 0 for group in _TOOL_GROUP_KEYWORDS}

    for group_name, keywords in _TOOL_GROUP_KEYWORDS.items():
        for keyword in keywords:
            if keyword in normalized:
                scores[group_name] += 2 if " " in keyword else 1

    if re.search(_CODE_PATTERNS["room_code"], message, re.IGNORECASE):
        scores["rooms"] += 2
    if re.search(_CODE_PATTERNS["class_name"], message, re.IGNORECASE):
        scores["classes"] += 2
        scores["schedule"] += 1
    if re.search(_CODE_PATTERNS["student_code"], message, re.IGNORECASE) or re.search(_CODE_PATTERNS["lecturer_code"], message, re.IGNORECASE):
        scores["people"] += 2

    if "phong" in normalized and ("trong" in normalized or "room" in normalized):
        scores["rooms"] += 3
    if "lich" in normalized or "thoi khoa bieu" in normalized:
        scores["schedule"] += 3
    if "diem danh" in normalized or "vang" in normalized or "chuyen can" in normalized:
        scores["attendance"] += 3
    if "gpa" in normalized or "diem" in normalized:
        scores["grades"] += 3
    if "thong bao" in normalized or "email" in normalized:
        scores["notifications"] += 3
    if "yeu cau" in normalized or "request" in normalized:
        scores["requests"] += 3

    best_group = None
    best_score = 0
    for group_name in _TOOL_GROUP_PRIORITY:
        score = scores.get(group_name, 0)
        if score > best_score:
            best_group = group_name
            best_score = score
    return best_group, best_score


def _is_backend_action(tool_name: str) -> bool:
    return tool_name in tools_loader.backend_actions or tool_name in _FALLBACK_BACKEND_ACTION_TOOLS

def _make_cache_key(message: str, user_role: str, history: Optional[List[Dict[str, str]]]) -> str:
    history_fingerprint = ""
    if history:
        recent = history[-4:] if history else []
        history_fingerprint = "|".join(
            f"{m.get('role','')[:1]}:{m.get('content','')[:50]}"
            for m in recent
        )
    raw = f"{user_role}:{message.lower().strip()}:{history_fingerprint}"
    return hashlib.md5(raw.encode()).hexdigest()


def _is_cacheable(message: str, intent_data: Dict) -> bool:
    intent = (intent_data.get("intent") or "").lower()
    if intent in _CACHEABLE_INTENTS:
        return True
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


# ── DB Schema ──────────────────────────────────────────────────────────────────
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

# ── Tool Registry ──────────────────────────────────────────────────────────────

_TOOL_ALIASES: Dict[str, str] = {
    "get_student_by_name":  "get_student_by_code",
    "get_lecturer_by_name": "get_lecturer_by_code",
    "search_student":       "get_student_by_code",
    "search_lecturer":      "get_lecturer_by_code",
    "get_my_grades":        "get_own_grades",
    "get_my_schedule":      "get_own_schedule",
}

# ── Role → Tool mapping ────────────────────────────────────────────────────────

# ── Role rules ─────────────────────────────────────────────────────────────────
_ROLE_RULES: Dict[str, str] = {
    "ADMIN": (
        "ADMIN: Quản lý tài khoản/hệ thống. "
        "'Tìm/tra cứu người dùng'→search_user_by_name. 'Tra mã'→get_user_by_code. "
        "'Tài khoản bị khóa'→view_inactive_users. 'Kích hoạt'→activate_user. "
        "'Tạo/sửa tài khoản'→create/update_user. "
        "'Gửi email'→send_email. 'Gửi thông báo'→create_notification. "
        "'Logs'→view_logs. 'Cảnh báo'→view_alerts. KHÔNG có lịch học/dạy."
    ),
    "ACADEMIC_STAFF": (
        "ACADEMIC_STAFF: Quản lý đào tạo toàn diện. "
        "'Tìm SV'→get_student_by_code. 'Tìm GV'→get_lecturer_by_code. "
        "'Phòng trống'→get_empty_rooms. 'Phòng dùng tuần này'→get_room_usage_weekly. "
        "'Tỉ lệ vắng của lớp'→get_absence_rate_by_class. "
        "'Duyệt đổi lịch'→approve_schedule_request. 'Từ chối đổi lịch'→reject_schedule_request. "
        "'Danh sách YC đổi lịch'→get_schedule_request_list. "
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
        "'Tổng quan điểm danh của em'→get_my_attendance_overview. "
        "'Lịch sử vắng/trễ của em'→get_my_absence_history. "
        "'Môn nào có nguy cơ cấm thi do điểm danh'→get_my_attendance_risk_courses. "
        "'Gửi email cho giảng viên đang học'→send_email. "
        "'Tạo đơn học vụ'→create_academic_request. "
        "KHÔNG xem điểm/lịch người khác. KHÔNG dùng tool [ACTION] quản trị."
    ),
}

# ── Few-shot examples ─────────────────────────────────────────────────────────
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
[EX] "Sinh viên ngành Công nghệ thông tin" → {"intent":"data_query","toolName":"get_students_by_major","entities":{"major_name":"Công Nghệ Thông Tin"}}
[EX] "Phòng trống hôm nay slot 1" → {"intent":"data_query","toolName":"get_empty_rooms","entities":{"slot_number":1}}
[EX] "Tất cả lớp học có slot hôm nay" → {"intent":"need_clarification","confidence":"low","toolName":null,"entities":{"missingInfo":"Bạn muốn xem lịch của lớp học cụ thể nào? Vui lòng cung cấp mã lớp (VD: PRF192_SE1, MAD101_L1)."}}
[EX] "Lớp nào có slot ngày hôm nay" → {"intent":"need_clarification","confidence":"low","toolName":null,"entities":{"missingInfo":"Bạn muốn xem lịch của lớp học cụ thể nào? Vui lòng cung cấp mã lớp (VD: PRF192_SE1)."}}
[EX] "Lịch của lớp PRF192_SE1" → {"intent":"data_query","toolName":"get_class_schedule","entities":{"class_name":"PRF192_SE1"}}
[EX] "Danh sách lớp học kỳ Spring 2026" → {"intent":"data_query","toolName":"get_classes_by_semester","entities":{"semester_name":"Spring 2026"}}
[EX] "Duyệt yêu cầu đổi lịch số 15" → {"intent":"action","toolName":"approve_schedule_request","entities":{"request_id":15}}
[EX] "Tạo lớp PRF192_SE18B01 môn PRF192 GV GV001 kỳ SP26" → {"intent":"action","toolName":"create_class","entities":{"class_name":"PRF192_SE18B01","course_code":"PRF192","lecturer_code":"GV001","semester_code":"SP26"}}
[EX] "Danh sách ngành học" → {"intent":"data_query","toolName":"list_majors","entities":{}}
[EX] "Học kỳ hiện tại" → {"intent":"data_query","toolName":"get_active_semester","entities":{}}
[EX] "Chuyên ngành của Công nghệ thông tin" → {"intent":"data_query","toolName":"get_specializations_by_major","entities":{"major_name":"Công nghệ thông tin"}}
[EX] "Chi tiết lớp SE18B01-PRF192" → {"intent":"data_query","toolName":"get_class_info","entities":{"class_name":"SE18B01-PRF192"}}
[EX] "Bảng điểm lớp SE18B01-PRF192" → {"intent":"data_query","toolName":"get_grade_report_by_class","entities":{"class_name":"SE18B01-PRF192"}}
[EX] "Lịch dạy của thầy Trần Văn Nam tuần này" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"full_name":"Trần Văn Nam","date":"THIS_WEEK"}}
[EX] "SV học lực yếu GPA dưới 2.0" → {"intent":"data_query","toolName":"get_students_at_risk","entities":{"gpa_threshold":2.0}}
[EX] "Xem toàn bộ lịch sử học tập của sinh viên SE001011" → {"intent":"data_query","toolName":"get_student_academic_timeline","entities":{"student_code":"SE001011"}}
[EX] "GPA của SE001011 so với trung bình ngành?" → {"intent":"data_query","toolName":"get_student_gpa_comparison","entities":{"student_code":"SE001011"}}
[EX] "Thống kê số lớp, số SV của từng giảng viên học kỳ này" → {"intent":"data_query","toolName":"get_lecturer_workload","entities":{}}
[EX] "Phòng B204 được sử dụng những ngày nào tuần này?" → {"intent":"data_query","toolName":"get_room_usage_weekly","entities":{"room_name":"B204","date":"THIS_WEEK"}}
[EX] "Tổng quan học kỳ Spring 2026: bao nhiêu lớp, SV, GV?" → {"intent":"data_query","toolName":"get_semester_overview","entities":{"semester_name":"Spring 2026"}}
[EX] "Tỉ lệ điểm danh trung bình môn OOP?" → {"intent":"data_query","toolName":"get_attendance_rate_by_course","entities":{"course_name":"OOP"}}
[EX] "Tỉ lệ vắng của lớp SE18B01-PRF192" → {"intent":"data_query","toolName":"get_absence_rate_by_class","entities":{"class_name":"SE18B01-PRF192"}}
[EX] "GPA trung bình của từng ngành?" → {"intent":"data_query","toolName":"get_gpa_stats_by_major","entities":{}}
[EX] "Phổ điểm lớp SE18B01 phân bổ như thế nào?" → {"intent":"data_query","toolName":"get_grade_distribution","entities":{"class_name":"SE18B01"}}
[EX] "Báo cáo tổng quát sức khỏe lớp PRF192" → {"intent":"data_query","toolName":"get_class_health_check","entities":{"class_name":"PRF192"}}
[EX] "Danh sách yêu cầu đổi lịch đang chờ duyệt" → {"intent":"data_query","toolName":"get_schedule_request_list","entities":{}}
""",
    "LECTURER": """
[EX] "Hôm nay tôi dạy những lớp nào?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Lịch dạy tuần này" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"THIS_WEEK"}}
[EX] "Lịch dạy hôm nay" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Lịch dạy ngày mai" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TOMORROW"}}
[EX] "Lịch dạy tuần sau" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"NEXT_WEEK"}}
[EX] "Lịch dạy của thầy Trần Văn Nam tuần này" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"full_name":"Trần Văn Nam","date":"THIS_WEEK"}}
[EX] "Lịch dạy giáo viên mã GV115211" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"lecturer_code":"GV115211"}}
[EX] "Lịch dạy GV001 ngày 5/3" → {"intent":"data_query","toolName":"get_other_lecturer_schedule","entities":{"lecturer_code":"GV001","date":"2026-03-05"}}
[EX] "SV vắng lớp SE18B01 hôm nay" → {"intent":"data_query","toolName":"get_attendance_by_slot","entities":{"class_name":"SE18B01","date":"TODAY"}}
[EX] "Thống kê vắng mặt lớp PRF192_L1" → {"intent":"data_query","toolName":"get_attendance_stats_by_class","entities":{"class_name":"PRF192_L1"}}
[EX] "Sinh viên nào vắng nhiều nhất lớp SE18B01?" → {"intent":"data_query","toolName":"get_most_absent_students","entities":{"class_name":"SE18B01"}}
[EX] "Xu hướng vắng mặt lớp PRF192?" → {"intent":"data_query","toolName":"get_attendance_trends","entities":{"class_name":"PRF192"}}
[EX] "Xếp hạng kết quả học tập lớp PRF192" → {"intent":"data_query","toolName":"get_student_ranking_in_class","entities":{"class_name":"PRF192"}}
[EX] "Phổ điểm cuối kỳ lớp PRF192" → {"intent":"data_query","toolName":"get_grade_distribution","entities":{"class_name":"PRF192"}}
[EX] "Sức khỏe lớp SE18B01" → {"intent":"data_query","toolName":"get_class_health_check","entities":{"class_name":"SE18B01"}}
[EX] "Danh sách sinh viên lớp PRF192_SE1" → {"intent":"data_query","toolName":"get_enrollments_by_class","entities":{"class_name":"PRF192_SE1"}}
[EX] "Yêu cầu đổi lịch tôi đã gửi" → {"intent":"data_query","toolName":"get_my_schedule_requests","entities":{}}
[EX] "Mở trang import điểm lớp SE18B01" → {"intent":"navigation","toolName":"view_grades","entities":{"class_name":"SE18B01"}}
[EX] "Phòng nào trống tiết 1 hôm nay?" → {"intent":"data_query","toolName":"get_empty_rooms","entities":{"slot_number":1,"date":"TODAY"}}
""",
    "STUDENT": """
[EX] "Điểm của em" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "GPA em bao nhiêu?" → {"intent":"data_query","toolName":"get_own_grades","entities":{}}
[EX] "Hôm nay em học gì?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TODAY"}}
[EX] "Lịch học tuần này" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"THIS_WEEK"}}
[EX] "Lịch học tuần sau" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"NEXT_WEEK"}}
[EX] "Ngày mai em có học không?" → {"intent":"data_query","toolName":"get_own_schedule","entities":{"date":"TOMORROW"}}
[EX] "Điểm môn OOP của em" → {"intent":"data_query","toolName":"get_detail_course_grade","entities":{"course_name":"OOP"}}
[EX] "Em có vắng buổi nào không?" → {"intent":"data_query","toolName":"get_my_attendance_status","entities":{}}
[EX] "Em vắng bao nhiêu buổi môn PRF192?" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{"course_name":"PRF192"}}
[EX] "Báo cáo chuyên cần của tôi" → {"intent":"data_query","toolName":"get_attendance_report_by_student","entities":{}}
[EX] "Tổng quan điểm danh của em" → {"intent":"data_query","toolName":"get_my_attendance_overview","entities":{}}
[EX] "Em đã vắng những buổi nào gần đây?" → {"intent":"data_query","toolName":"get_my_absence_history","entities":{}}
[EX] "Môn nào của em có nguy cơ vì điểm danh?" → {"intent":"data_query","toolName":"get_my_attendance_risk_courses","entities":{}}
[EX] "Em có thông báo mới không?" → {"intent":"data_query","toolName":"get_my_notifications","entities":{}}
[EX] "Môn học ngành Kỹ thuật phần mềm" → {"intent":"data_query","toolName":"get_courses_by_spec","entities":{"specialization_name":"Kỹ thuật phần mềm"}}
[EX] "Ngành CNTT có những chuyên ngành nào?" → {"intent":"data_query","toolName":"get_specializations_by_major","entities":{"major_name":"CNTT"}}
""",
}

# ── Prompt Template v6 ─────────────────────────────────────────────────────────
# Strategy: few-shots teach 90% routing logic. Rules chỉ cover 5 edge cases còn lại.
# Token: ~340 tokens template thuần, giảm 89% vs v4 (~3100 tokens).
# Post-process handles: code/date/permission/alias/fuzzy/entity-clean/diacritics/context.
_PROMPT_TEMPLATE = """FAMS Router → chọn tool + trả JSON. Ngày: {today} ({day_name}).
ROLE: {role} | MÃ: {code}
ROLE_GUIDANCE: {role_guidance}
ROLE_RULES: {role_rules}
AGENT: {agent_label}
AGENT_GUIDANCE: {agent_guidance}
TOOL_GROUP: {tool_group}

HISTORY: {history}
SCHEMA: {schema}
TOOLS: {tools}
EXAMPLES: {few_shot}

═══ ROUTING RULES ═══

[Các cụm từ chuyên ngành viết tắt]
CNTT → Công nghệ thông tin
KTPM → Kỹ thuật phần mềm
ATTT → An toàn thông tin

[Các cụm từ viết tắt tên môn học]
PRF192 → Programming Fundamentals


[INTENT]
navigation   = "mở/vào trang X" hoặc tool bắt đầu view_
action       = tạo/xóa/sửa/gửi/duyệt/từ chối/kích hoạt/nhập/import/gán/xuất/export
data_query   = xem/tìm/tra/danh sách/bao nhiêu/thống kê/báo cáo/lịch/điểm/lịch sử
general_chat = chào hỏi, hỏi về bot, hoặc câu hỏi ngoài lề FAMS như toán đơn giản, kiến thức phổ thông, đời sống, thời tiết. Dùng tool general_offtopic_chat cho nhóm này. TUYỆT ĐỐI KHÔNG dùng khi có từ: lịch/điểm/SV/GV/lớp/phòng/ngành/môn/điểm danh/thông báo
need_clarification = thiếu thông tin bắt buộc (xem [CLARIFY])

[CODE vs NAME]
MÃ (CHỮ+SỐ, không dấu) → đúng field:  SE******→student_code | GV******→lecturer_code | PRF192→course_code | SE18B01-PRF192/PRF192_SE1→class_name | A101/LAB01→room_name | SP26/FA25→semester_code
TÊN (có dấu tiếng Việt) → full_name: "Nguyễn Văn A", "Bùi Đức Trung", "Lê Xuân Bảo"
❌ KHÔNG: "mã GV115211"→full_name="giáo viên mã GV115211" | ✅ ĐÚNG: →lecturer_code="GV115211"

[OWN-TOOLS] Khi "của tôi/em/mình" hoặc không chỉ định ai:
lịch học/dạy→get_own_schedule | điểm/GPA→get_own_grades | điểm môn X→get_detail_course_grade(course_name=X)
vắng buổi nào/số buổi vắng→get_my_attendance_status | báo cáo chuyên cần/chi tiết điểm danh→get_attendance_report_by_student
tổng quan điểm danh/chuyên cần của tôi→get_my_attendance_overview | lịch sử vắng/trễ của tôi→get_my_absence_history | môn có nguy cơ vì điểm danh→get_my_attendance_risk_courses
thông báo→get_my_notifications | yêu cầu đổi lịch→get_my_schedule_requests | hồ sơ→view_profile(navigation)

[TIME] hôm nay→TODAY | ngày mai→TOMORROW | hôm qua→YESTERDAY | tuần này→THIS_WEEK | tuần sau/tới→NEXT_WEEK | tuần trước→LAST_WEEK | tháng này→THIS_MONTH | "5/3"/"05/03/2026"→"2026-03-05"

[SCHEDULE] Ưu tiên theo thứ tự:
1. Có mã GV / "thầy/cô [tên]" → get_other_lecturer_schedule + lecturer_code/full_name
2. Có mã SV(SE/HE/IA) / "học sinh [tên]" → get_other_student_schedule + student_code/full_name
3. Có mã lớp (PRF192_SE1...) → get_class_schedule + class_name
4. Không ai cụ thể + LECTURER/STUDENT → get_own_schedule
5. ACADEMIC_STAFF không có ai cụ thể → need_clarification (ACADEMIC_STAFF không có lịch cá nhân)

[CLASS vs ROOM]
Lớp học (PRF192_SE1, SE18B01-PRF192, MAD101_L1) → get_class_*, get_enrollments_by_class, get_grade_report_by_class
Phòng học (A101, B102, LAB01) → get_empty_rooms, get_room_info, get_room_usage_weekly
"Phòng nào trống?" thiếu slot_number → hỏi lại, KHÔNG tự bịa slot_number. Nếu có "tất cả slot/mọi slot/cả ngày" → slot_number=ALL | "Lớp nào có slot?" không có mã → need_clarification

[COUNT vs LIST vs DETAIL]
"bao nhiêu/đếm/tổng số SV ngành X"→count_students_by_major | "danh sách/SV ngành X"→get_students_by_major | "thông tin/tra cứu SV [X]"→get_student_by_code
"bao nhiêu phòng/thống kê phòng"→count_rooms_by_status | "danh sách phòng/mở trang phòng"→view_rooms(nav)
"bao nhiêu user theo role"→count_users_by_role | "danh sách người dùng"→view_users(nav)
"danh sách môn học trong/theo học kỳ X"→get_courses_by_semester

[SEMESTER] SP26=Spring 2026=kỳ xuân 26 | FA25=Fall 2025=kỳ thu 25 | SU25=Summer 2025
"kỳ này/kỳ hiện tại" → get_active_semester (không cần code)

[CLARIFY] Hỏi lại khi:
"danh sách lớp" không có học kỳ → missingInfo:"Học kỳ nào? (VD: Spring 2026, Fall 2025)"
"lớp nào có slot/tất cả lớp" không có mã lớp → missingInfo:"Lớp cụ thể nào? (VD: PRF192_SE1)"
"bảng điểm/bảng điểm lớp" không có mã lớp → missingInfo:"Lớp nào? (VD: SE18B01-PRF192)"
"sinh viên" đơn độc không có tên/mã/ngành → missingInfo:"Tìm theo tiêu chí gì? (tên, mã SV, ngành, lớp)"
KHÔNG hỏi khi: đã có tên/mã đủ | lịch cá nhân LECTURER/STUDENT | "học kỳ hiện tại?" | list không cần param

[SPECIAL MAPPINGS]
tài khoản bị khóa/không hoạt động→view_inactive_users(nav) | kích hoạt/mở khóa tài khoản→activate_user
top SV/SV giỏi nhất→get_top_students | SV yếu/nguy cơ học lại→get_students_at_risk | SV chưa có lớp→get_students_without_class
lịch sử học tập SV→get_student_academic_timeline | GPA SV so với ngành→get_student_gpa_comparison
tải giảng dạy/workload GV→get_lecturer_workload | tổng quan/overview học kỳ→get_semester_overview
SV vắng nhiều nhất lớp→get_most_absent_students | lịch phòng/phòng X dùng thế nào→get_room_usage_weekly
sức khỏe lớp/health check→get_class_health_check | xu hướng vắng mặt→get_attendance_trends
điểm danh bất thường/hộ điểm danh→get_abnormal_attendance | phổ điểm/phân bố điểm→get_grade_distribution
xếp hạng SV lớp→get_student_ranking_in_class | GPA trung bình theo ngành→get_gpa_stats_by_major
mở trang import điểm→view_grades(navigation!) | import/nhập điểm thành phần→import_component_grades(action)
tỉ lệ điểm danh theo môn→get_attendance_rate_by_course | gán môn vào chuyên ngành→assign_course_to_specialization
tỉ lệ vắng của lớp→get_absence_rate_by_class

[CONTEXT] Đại từ mơ hồ → tra history: "lớp đó/này"→class_name trước | "môn đó/này"→course_name trước | "còn tuần sau?"→giữ tool, đổi date=NEXT_WEEK

OUTPUT: JSON duy nhất, không giải thích.
{{"intent":"data_query|action|navigation|general_chat|need_clarification","confidence":"high|medium|low","toolName":"tool hoặc null","entities":{{}}}}
need_clarification: {{"intent":"need_clarification","confidence":"low","toolName":null,"entities":{{"missingInfo":"câu hỏi làm rõ"}}}}

MESSAGE: "{message}"
JSON:"""



# ── Backend action tools ───────────────────────────────────────────────────────

_DAY_NAMES = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"]
_DAY_OF_WEEK_PATTERNS = [
    (r"\b(thứ\s*2|thu\s*2|t2|monday|mon)\b", "MONDAY"),
    (r"\b(thứ\s*3|thu\s*3|t3|tuesday|tue)\b", "TUESDAY"),
    (r"\b(thứ\s*4|thu\s*4|t4|wednesday|wed)\b", "WEDNESDAY"),
    (r"\b(thứ\s*5|thu\s*5|t5|thursday|thu)\b", "THURSDAY"),
    (r"\b(thứ\s*6|thu\s*6|t6|friday|fri)\b", "FRIDAY"),
    (r"\b(thứ\s*7|thu\s*7|t7|saturday|sat)\b", "SATURDAY"),
    (r"\b(chủ\s*nhật|chu\s*nhat|cn|sunday|sun)\b", "SUNDAY"),
]


class LightRouter:
    """Stage 1 – LLM intent router v4.1 (Prompt v6 lean)."""

    def route(
        self,
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        cache_key = _make_cache_key(message, user_role, history)
        cached = _cache_get(cache_key)
        if cached:
            return cached

        try:
            from datetime import datetime
            now      = datetime.now()
            today    = now.strftime("%Y-%m-%d")
            day_name = _DAY_NAMES[now.weekday()]
            agent_id = detect_agent(message)
            tool_group, group_score = _detect_tool_group(message)

            tools_str   = self._build_tool_list(user_role, agent_id, tool_group)
            history_str = self._format_history(history)
            few_shot    = _FEW_SHOT_BY_ROLE.get(user_role, _FEW_SHOT_BY_ROLE["STUDENT"])

            safe_message = message.replace("{", "{{").replace("}", "}}")
            safe_history = history_str.replace("{", "{{").replace("}", "}}")
            safe_tools   = tools_str.replace("{", "{{").replace("}", "}}")

            prompt = _PROMPT_TEMPLATE.format(
                role       = user_role,
                code       = user_code,
                role_guidance = get_role_guidance(user_role),
                role_rules = _ROLE_RULES.get(user_role, ""),
                agent_label = get_agent_label(agent_id),
                agent_guidance = get_agent_guidance(agent_id),
                tool_group = f"{tool_group or 'auto'} (score={group_score})",
                history    = safe_history,
                tools      = safe_tools,
                schema     = _DB_SCHEMA_COMPACT,
                few_shot   = few_shot,
                message    = safe_message,
                today      = today,
                day_name   = day_name,
            )

            raw    = llm_client.complete(prompt, model)
            logger.info(f"[LightRouter v4.1] raw={raw[:200]}")
            result = self._parse_json(raw)
            result = self._post_process(result, message, user_role, user_code, history)
            logger.info(
                f"[LightRouter v4.1] tool={result.get('toolName')} "
                f"intent={result.get('intent')} confidence={result.get('confidence')} agent={result.get('agent')}"
            )

            if _is_cacheable(message, result):
                _cache_set(cache_key, result)

            return result
        except Exception as exc:
            logger.error(f"[LightRouter v4.1] error: {exc}")
            return {"intent": "general_chat", "toolName": None, "entities": {}, "confidence": "low"}

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _build_tool_list(role: str, agent_id: str, tool_group: Optional[str] = None) -> str:
        if not tool_group:
            return build_agent_tool_list(
                role=role,
                agent_id=agent_id,
                formatted_tools=tools_loader.all_tools_formatted,
                role_tools=tools_loader.role_tools,
            )

        allowed = set(tools_loader.role_tools.get(role, set()))
        if not allowed:
            return build_agent_tool_list(
                role=role,
                agent_id=agent_id,
                formatted_tools=tools_loader.all_tools_formatted,
                role_tools=tools_loader.role_tools,
            )

        filtered_tools = {
            name: desc
            for name, desc in tools_loader.all_tools_formatted.items()
            if name in allowed and get_tool_agent(name) == agent_id and _tool_in_group(name, tool_group)
        }
        if not filtered_tools:
            return build_agent_tool_list(
                role=role,
                agent_id=agent_id,
                formatted_tools=tools_loader.all_tools_formatted,
                role_tools=tools_loader.role_tools,
            )

        scoped_role_tools = {role_key: set(tool_set) for role_key, tool_set in tools_loader.role_tools.items()}
        scoped_role_tools[role] = set(filtered_tools.keys())
        return build_agent_tool_list(
            role=role,
            agent_id=agent_id,
            formatted_tools=filtered_tools,
            role_tools=scoped_role_tools,
        )

    @staticmethod
    def _format_history(history: Optional[List[Dict[str, str]]]) -> str:
        if not history:
            return "(không có)"
        parts = []
        for m in history[-10:]:
            role    = "User" if m.get("role", "").upper() == "USER" else "Bot"
            content = m.get("content", "")
            if len(content) > 200:
                content = content[:200] + "..."
            parts.append(f"[{role}]: {content}")
        return "\n".join(parts)

    @staticmethod
    def _parse_json(text: str) -> Dict[str, Any]:
        match = re.search(r'\{[^{}]*"intent"[^{}]*\}', text, re.DOTALL)
        if match:
            candidate = re.sub(r",\s*([}\]])", r"\1", match.group(0))
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        start = text.find('{')
        end   = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            candidate = re.sub(r",\s*([}\]])", r"\1", text[start:end+1])
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
            "class_name":    r"\b([A-Z]{2,}\d{2,}[A-Z\d]*_[A-Z0-9]+|[A-Z]{2,}\d{2,}[A-Z\d]*-[A-Z]{2,4}\d{3,4})\b",
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

    def _prepare_routing_context(
        self,
        message: str,
        msg_lower: str,
        tool_name: str,
        entities: Dict[str, Any],
    ) -> Dict[str, Any]:
        class_match = re.search(_CODE_PATTERNS["class_name"], message, re.IGNORECASE)
        course_match = re.search(_CODE_PATTERNS["course_code"], message, re.IGNORECASE)
        lecturer_match = re.search(_CODE_PATTERNS["lecturer_code"], message, re.IGNORECASE)
        major_match = re.search(
            r"(?<!chuyên\s)(?<!chuyen\s)(?:ngành|nghành|nganh|nhành|major)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?:$|[,.!?]|\s+(?:tuần|ngày|lớp|slot|tiết|ca|vì|do|có|co|gồm|gom|là|la|nào|nao)\b)",
            message,
            re.IGNORECASE,
        )
        sub_specialization_match = re.search(
            r"(?:chuyên ngành hẹp|chuyen nganh hep|chuyên nghành hẹp|chuyen nghanh hep|sub[\s_-]*specialization)\s+(?!của\b|cua\b|thuộc\b|thuoc\b)([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?:$|[,.!?]|\s+(?:thuộc|của|trong|ngành|chuyên ngành|chuyen nganh|có|co|gồm|gom|là|la|nào|nao|đang|dang)\b)",
            message,
            re.IGNORECASE,
        )
        specialization_match = re.search(
            r"(?:chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh|specialization)\s+(?!hẹp\b|hep\b)(?!của\b|cua\b|thuộc\b|thuoc\b)([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?:$|[,.!?]|\s+(?:thuộc|của|trong|ngành|chuyên ngành hẹp|chuyen nganh hep|có|co|gồm|gom|là|la|nào|nao|đang|dang)\b)",
            message,
            re.IGNORECASE,
        )
        day_of_week = None
        for pattern, normalized_day in _DAY_OF_WEEK_PATTERNS:
            if re.search(pattern, msg_lower, re.IGNORECASE):
                day_of_week = normalized_day
                break

        count_major_phrase = bool(
            _MAJOR_COUNT_RE.search(msg_lower)
            and re.search(r"(sinh viên|học sinh|sv)", msg_lower)
            and _MAJOR_SCOPE_RE.search(msg_lower)
        )
        list_major_phrase = bool(
            (
                _MAJOR_LIST_RE.search(msg_lower)
                or re.search(r"\b(sinh viên|học sinh|sv)\b.*\b(ngành|nghành|nganh|nhành|major)\b", msg_lower)
            )
            and re.search(r"(sinh viên|học sinh|sv)", msg_lower)
            and _MAJOR_SCOPE_RE.search(msg_lower)
        )

        return {
            "class_match": class_match,
            "course_match": course_match,
            "lecturer_match": lecturer_match,
            "major_match": _clean_taxonomy_value(major_match.group(1)) if major_match else None,
            "specialization_match": _clean_taxonomy_value(specialization_match.group(1)) if specialization_match else None,
            "sub_specialization_match": _clean_taxonomy_value(sub_specialization_match.group(1)) if sub_specialization_match else None,
            "day_of_week": day_of_week,
            "count_major_phrase": count_major_phrase,
            "list_major_phrase": list_major_phrase,
            "aggregate_query_signal": bool(_AGGREGATE_QUERY_RE.search(msg_lower)),
            "contextual_scope_signal": _has_contextual_scope(entities),
            "class_collection_phrase": bool(_CLASS_ROSTER_RE.search(msg_lower)),
        }

    def _apply_entity_hints(
        self,
        tool_name: str,
        message: str,
        msg_lower: str,
        entities: Dict[str, Any],
        ctx: Dict[str, Any],
    ) -> None:
        class_match = ctx["class_match"]
        course_match = ctx["course_match"]
        lecturer_match = ctx["lecturer_match"]
        major_match = ctx["major_match"]
        specialization_match = ctx["specialization_match"]
        sub_specialization_match = ctx["sub_specialization_match"]
        day_of_week = ctx["day_of_week"]

        if class_match and ("lớp" in msg_lower or tool_name in {
            "get_students_by_class", "get_enrollments_by_class", "get_class_schedule",
            "get_class_info", "get_grade_report_by_class", "get_attendance_by_slot",
            "get_attendance_stats_by_class", "create_schedule_request"
        }):
            entities["class_name"] = class_match.group(1).upper()

        if course_match and ("môn" in msg_lower or "course" in msg_lower):
            entities.setdefault("course_code", course_match.group(0).upper())

        if lecturer_match:
            entities.setdefault("lecturer_code", lecturer_match.group(0).upper())

        if day_of_week and (
            "lịch" in msg_lower
            or "thời khóa biểu" in msg_lower
            or tool_name in {
                "get_own_schedule",
                "get_my_schedule",
                "get_other_lecturer_schedule",
                "get_lecturer_schedule_by_search",
                "get_other_student_schedule",
                "get_student_schedule_by_search",
                "get_class_schedule",
            }
        ):
            entities["day_of_week"] = day_of_week

        if major_match and tool_name in {
            "count_students_by_major",
            "get_students_by_major",
            "get_students_at_risk",
            "get_gpa_stats_by_major",
            "get_specializations_by_major",
        }:
            entities.setdefault("major_name", major_match)

        if specialization_match and tool_name in {
            "get_specialization_id_by_name",
            "get_sub_specializations",
            "get_courses_by_spec",
        }:
            entities.setdefault("specialization_name", specialization_match)

        if sub_specialization_match and tool_name in {
            "get_courses_by_sub_spec",
        }:
            entities.setdefault("sub_specialization_name", sub_specialization_match)

        if entities.get("class_name") and not entities.get("course_code"):
            trailing_course = re.search(r"-([A-Z]{2,4}\d{3,4})$", str(entities["class_name"]).upper())
            if trailing_course:
                entities["course_code"] = trailing_course.group(1)

    def _apply_major_and_collection_rules(
        self,
        result: Dict[str, Any],
        entities: Dict[str, Any],
        tool_name: str,
        message: str,
        msg_lower: str,
        ctx: Dict[str, Any],
    ) -> str:
        count_major_phrase = ctx["count_major_phrase"]
        list_major_phrase = ctx["list_major_phrase"]
        class_collection_phrase = ctx["class_collection_phrase"]
        specialization_match = ctx["specialization_match"]
        sub_specialization_match = ctx["sub_specialization_match"]

        if count_major_phrase and entities.get("major_name"):
            tool_name = _set_tool(result, "count_students_by_major")
        elif list_major_phrase and entities.get("major_name"):
            tool_name = _set_tool(result, "get_students_by_major")

        if ctx["major_match"] and _SPECIALIZATION_SCOPE_RE.search(message) and not _SUB_SPECIALIZATION_SCOPE_RE.search(message):
            entities.setdefault("major_name", ctx["major_match"])
            tool_name = _set_tool(result, "get_specializations_by_major")

        if specialization_match:
            entities.setdefault("specialization_name", specialization_match)
            if _SUB_SPECIALIZATION_SCOPE_RE.search(message):
                entities.pop("specialization_name", None)
            elif re.search(r"(môn|mon|course)", msg_lower, re.IGNORECASE):
                tool_name = _set_tool(result, "get_courses_by_spec")
            elif _SPECIALIZATION_SCOPE_RE.search(message):
                tool_name = _set_tool(result, "get_sub_specializations")

        if sub_specialization_match:
            entities["sub_specialization_name"] = sub_specialization_match
            if re.search(r"(môn|mon|course)", msg_lower, re.IGNORECASE):
                tool_name = _set_tool(result, "get_courses_by_sub_spec")

        if tool_name == "get_student_by_code" and entities.get("major_name"):
            if count_major_phrase:
                tool_name = _set_tool(result, "count_students_by_major")
                entities.pop("student_code", None)
                entities.pop("code", None)
                entities.pop("full_name", None)
            elif list_major_phrase:
                tool_name = _set_tool(result, "get_students_by_major")
                entities.pop("student_code", None)
                entities.pop("code", None)
                entities.pop("full_name", None)

        if tool_name == "get_student_by_code" and entities.get("class_name") and class_collection_phrase:
            tool_name = _set_tool(result, "get_enrollments_by_class")
            entities.pop("student_code", None)
            entities.pop("code", None)
            entities.pop("full_name", None)

        return tool_name

    def _apply_explicit_query_rules(
        self,
        result: Dict[str, Any],
        entities: Dict[str, Any],
        message: str,
        msg_lower: str,
        user_role: str,
        user_code: str,
        tool_name: str,
    ) -> str:
        student_code_match = re.search(r"\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b", message, re.IGNORECASE)
        user_code_match = re.search(r"\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6}|GV\d{2,6}|AD\d{2,6}|AS\d{2,6})\b", message, re.IGNORECASE)
        date_match = re.search(r"\b\d{4}-\d{2}-\d{2}\b", message)
        slot_match = re.search(r"\b(?:slot|ca|tiết)\s*(?:số\s*)?(\d+)\b", message, re.IGNORECASE)
        course_match = re.search(r"\b([A-Z]{3,4}\d{3})\b", message, re.IGNORECASE)
        spec_name_match = re.search(r"(?:chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?:$|[,.!?])", message, re.IGNORECASE)
        major_code_match = re.search(r"\b([A-Z]{2,10})\b", message)
        room_match = re.search(r"\b([A-Z]\d{2,3}|LAB\d{2})\b", message, re.IGNORECASE)
        capacity_match = re.search(r"(?:sức chứa|suc chua|chứa)\s*(\d+)", message, re.IGNORECASE)

        if _GENERIC_SEMESTER_KNOWLEDGE_RE.search(message) and not (
            entities.get("semester_code")
            or entities.get("semester_name")
            or re.search(r"\b(kỳ này|ky nay|học kỳ này|hoc ky nay|học kỳ hiện tại|hoc ky hien tai)\b", msg_lower)
        ):
            result["intent"] = "general_chat"
            entities.clear()
            return "general_offtopic_chat"

        if _OPEN_TEACHING_CLASSES_RE.search(msg_lower):
            result["intent"] = "navigation"
            return _set_tool(result, "view_teaching_classes", "navigation")

        if _OPEN_ASSIGNMENTS_RE.search(msg_lower):
            result["intent"] = "navigation"
            return _set_tool(result, "view_assignments", "navigation")

        search_user_match = _SEARCH_USER_BY_NAME_RE.search(message)
        if search_user_match:
            entities["full_name"] = search_user_match.group(1).strip()
            return _set_tool(result, "search_user_by_name")

        specialization_id_match = _SPECIALIZATION_ID_QUERY_RE.search(message)
        if specialization_id_match:
            cleaned_spec = _clean_taxonomy_value(specialization_id_match.group(1))
            if cleaned_spec:
                entities["specialization_name"] = cleaned_spec
                entities.pop("major_name", None)
                return _set_tool(result, "get_specialization_id_by_name")

        major_id_match = _MAJOR_ID_QUERY_RE.search(message)
        if major_id_match:
            cleaned_major = _clean_taxonomy_value(major_id_match.group(1))
            if cleaned_major:
                entities["major_name"] = cleaned_major
                entities.pop("major_code", None)
                return _set_tool(result, "get_major_id_by_name")

        major_to_spec_match = re.search(
            r"(?:ngành|nghành|nganh|nhành|major)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)\s+(?:có|co|gồm|gom).*(?:chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh)",
            message,
            re.IGNORECASE,
        )
        if major_to_spec_match:
            cleaned_major = _clean_taxonomy_value(major_to_spec_match.group(1))
            if cleaned_major:
                entities["major_name"] = cleaned_major
                return _set_tool(result, "get_specializations_by_major")

        sub_spec_courses_match = re.search(
            r"(?:(?:môn|mon|course).*(?:chuyên ngành hẹp|chuyen nganh hep|chuyên nghành hẹp|chuyen nghanh hep)|(?:chuyên ngành hẹp|chuyen nganh hep|chuyên nghành hẹp|chuyen nghanh hep).*(?:môn|mon|course))\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+)",
            message,
            re.IGNORECASE,
        )
        if sub_spec_courses_match:
            cleaned_sub_spec = _clean_taxonomy_value(sub_spec_courses_match.group(1))
            if cleaned_sub_spec:
                entities["sub_specialization_name"] = cleaned_sub_spec
                return _set_tool(result, "get_courses_by_sub_spec")

        spec_courses_match = re.search(
            r"(?:(?:môn|mon|course).*(?:chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh)|(?:chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh).*(?:môn|mon|course))\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+)",
            message,
            re.IGNORECASE,
        )
        if spec_courses_match and not _SUB_SPECIALIZATION_SCOPE_RE.search(message):
            cleaned_spec = _clean_taxonomy_value(spec_courses_match.group(1))
            if cleaned_spec:
                entities["specialization_name"] = cleaned_spec
                return _set_tool(result, "get_courses_by_spec")

        sub_spec_list_match = re.search(
            r"(?:chuyên ngành hẹp|chuyen nganh hep|chuyên nghành hẹp|chuyen nghanh hep).*(?:của|thuộc|trong)\s+(?:chuyên ngành|chuyen nganh|chuyên nghành|chuyen nghanh)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+)",
            message,
            re.IGNORECASE,
        )
        if sub_spec_list_match:
            cleaned_spec = _clean_taxonomy_value(sub_spec_list_match.group(1))
            if cleaned_spec:
                entities["specialization_name"] = cleaned_spec
                return _set_tool(result, "get_sub_specializations")

        if _NOTIFICATION_HISTORY_RE.search(msg_lower) and user_code_match:
            entities["user_code"] = user_code_match.group(1).upper()
            return _set_tool(result, "get_notification_history_for_user")

        if _SCHEDULE_REQUEST_LIST_RE.search(msg_lower):
            status_map = {
                "pending": "PENDING",
                "chờ duyệt": "PENDING",
                "cho duyet": "PENDING",
                "approved": "APPROVED",
                "đã duyệt": "APPROVED",
                "da duyet": "APPROVED",
                "rejected": "REJECTED",
                "từ chối": "REJECTED",
                "tu choi": "REJECTED",
                "active": "ACTIVE",
                "đang hoạt động": "ACTIVE",
                "dang hoat dong": "ACTIVE",
            }
            for phrase, normalized in status_map.items():
                if phrase in msg_lower:
                    entities["status"] = normalized
                    break
            return _set_tool(result, "get_schedule_request_list")

        if _CLASSMATES_RE.search(msg_lower) and student_code_match:
            entities["student_code"] = student_code_match.group(1).upper()
            return _set_tool(result, "get_classmates")

        if _SLOT_TIME_INFO_RE.search(msg_lower):
            entities.pop("class_name", None)
            return _set_tool(result, "get_slot_time_info")

        if re.search(r"(phòng|room).*(trống|còn trống)", msg_lower) and (
            slot_match or "tất cả slot" in msg_lower or "mọi slot" in msg_lower or "cả ngày" in msg_lower
        ):
            if slot_match:
                entities["slot_number"] = int(slot_match.group(1))
            if date_match:
                entities["date"] = date_match.group(0)
            return _set_tool(result, "get_empty_rooms")

        if _SLOTS_BY_TIME_RANGE_RE.search(msg_lower):
            start_time_match = re.search(r"(?:từ|from)\s*(\d{1,2}:\d{2})", message, re.IGNORECASE)
            end_time_match = re.search(r"(?:đến|den|to|tới)\s*(\d{1,2}:\d{2})", message, re.IGNORECASE)
            if start_time_match:
                entities["time_start"] = start_time_match.group(1)
            if end_time_match:
                entities["time_end"] = end_time_match.group(1)
            elif re.search(r"(hết buổi sáng|het buoi sang)", msg_lower):
                entities["time_end"] = "11:59"
            if date_match:
                entities["date"] = date_match.group(0)
            entities.pop("class_name", None)
            return _set_tool(result, "get_slots_by_time_range")

        if _SLOTS_BY_NUMBER_RE.search(msg_lower) and date_match and re.search(r"\bslot\b|\bca\b|\btiết\b", msg_lower):
            if slot_match:
                entities["slot_number"] = int(slot_match.group(1))
            entities["date"] = date_match.group(0)
            entities.pop("class_name", None)
            return _set_tool(result, "get_slots_by_slot_number")

        if _SLOTS_BY_DATE_RE.search(msg_lower) and (
            date_match or "hôm nay" in msg_lower or "ngày mai" in msg_lower or "hom nay" in msg_lower or "ngay mai" in msg_lower
        ):
            if date_match:
                entities["date"] = date_match.group(0)
            entities.pop("class_name", None)
            return _set_tool(result, "get_slots_by_date")

        if _ATTENDANCE_BY_CLASS_DATE_RE.search(msg_lower) and entities.get("class_name"):
            if date_match:
                entities["date"] = date_match.group(0)
            return _set_tool(result, "get_attendance_by_slot")

        if tool_name in {
            "get_major_id_by_name",
            "get_specialization_id_by_name",
            "get_specializations_by_major",
            "get_sub_specializations",
            "get_courses_by_spec",
            "get_courses_by_sub_spec",
        } and not re.search(r"^\s*(?:tạo|tao|thêm)\b", msg_lower):
            return tool_name

        if _CREATE_ROOM_RE.search(msg_lower):
            result["intent"] = "action"
            tool_name = _set_tool(result, "create_room", "action")
            if room_match:
                entities["name"] = room_match.group(1).upper()
            if capacity_match:
                entities["capacity"] = int(capacity_match.group(1))
            return tool_name

        if _CREATE_SPECIALIZATION_RE.search(msg_lower):
            result["intent"] = "action"
            tool_name = _set_tool(result, "create_specialization", "action")
            spec_code_match = re.search(r"(?:mã|ma)\s*([A-Z][A-Z0-9_]{1,20})", message, re.IGNORECASE)
            spec_name_match_2 = re.search(r"(?:tên|ten)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?:$|,|\.)", message, re.IGNORECASE)
            major_anchor = re.search(r"(?:thuộc ngành|ngành)\s+([A-Za-zÀ-ỹ0-9\s]+?)(?:$|,|\.)", message, re.IGNORECASE)
            if spec_code_match:
                entities["spec_code"] = spec_code_match.group(1).upper()
            if spec_name_match_2:
                entities["spec_name"] = spec_name_match_2.group(1).strip()
            if major_anchor:
                major_val = major_anchor.group(1).strip()
                if re.fullmatch(r"[A-Za-z]{2,10}", major_val):
                    entities["major_code"] = major_val.upper()
                else:
                    entities["major_name"] = major_val
            return tool_name

        if _ASSIGN_COURSE_TO_SPEC_RE.search(msg_lower):
            result["intent"] = "action"
            tool_name = _set_tool(result, "assign_course_to_specialization", "action")
            if course_match:
                entities["course_code"] = course_match.group(1).upper()
            if spec_name_match:
                entities["specialization_name"] = spec_name_match.group(1).strip()
            spec_code_match = re.search(r"(?:chuyên ngành|specialization)\s+(?:mã|ma)\s*([A-Z][A-Z0-9_]{1,20})", message, re.IGNORECASE)
            if spec_code_match:
                entities["specialization_code"] = spec_code_match.group(1).upper()
            elif entities.get("specialization_name"):
                entities.pop("specialization_code", None)
            if entities.get("course_code") and not re.search(r"(?:tên|ten)\s+", msg_lower):
                entities.pop("course_name", None)
            return tool_name

        if re.search(r"^\s*(?:hãy\s+)?(?:tạo|tao|thêm)\b.*\b(?:lớp)\b", msg_lower) and "nhóm chat" not in msg_lower:
            result["intent"] = "action"
            return _set_tool(result, "create_class", "action")

        if re.search(r"^\s*(?:hãy\s+)?(?:tạo|tao|thêm)\b.*\b(?:môn học|môn)\b", msg_lower) and "gán môn" not in msg_lower:
            result["intent"] = "action"
            return _set_tool(result, "create_course", "action")

        if re.search(r"^\s*(?:hãy\s+)?(?:tạo|tao|thêm)\b.*\b(?:ngành học|ngành)\b", msg_lower) and "chuyên ngành" not in msg_lower:
            result["intent"] = "action"
            return _set_tool(result, "create_major", "action")

        if re.search(r"^\s*(?:hãy\s+)?(?:tạo|tao|thêm)\b.*\b(?:học kỳ|semester)\b", msg_lower):
            result["intent"] = "action"
            return _set_tool(result, "create_semester", "action")

        return tool_name

    def _apply_action_and_domain_rules(
        self,
        result: Dict[str, Any],
        entities: Dict[str, Any],
        message: str,
        msg_lower: str,
        user_role: str,
        user_code: str,
        tool_name: str,
        intent: str,
    ) -> tuple[str, str, bool]:
        if re.search(r"(gửi|gởi|tao|tạo|đăng).*(thông báo)", msg_lower, re.IGNORECASE):
            tool_name = _set_tool(result, "create_notification")
            result["intent"] = "action"
            intent = "action"

            title_match = re.search(
                r"(?:tiêu đề|title)\s*[:：-]?\s*(.+?)(?=\s+(?:nội dung|rằng|rang)\b|$)",
                message,
                re.IGNORECASE,
            )
            if title_match:
                entities["title"] = title_match.group(1).strip().rstrip(".")

            content_match = re.search(
                r"(?:rằng|rang|với nội dung|nội dung là|nội dung|về việc)\s+(.+)$",
                message,
                re.IGNORECASE,
            )
            if content_match:
                entities["content"] = content_match.group(1).strip().rstrip(".")
            else:
                content_fallback = re.sub(
                    r"^\s*(gửi|gởi|tao|tạo|đăng)\s+thông báo\s*",
                    "",
                    message,
                    count=1,
                    flags=re.IGNORECASE,
                )
                content_fallback = re.sub(
                    r"^\s*(?:đến|cho)\s+",
                    "",
                    content_fallback,
                    count=1,
                    flags=re.IGNORECASE,
                )
                content_fallback = re.sub(
                    r"^\s*(?:toàn thể|toàn bộ)\s+(?:học sinh|sinh viên|giảng viên|nhân viên đào tạo)\s*",
                    "",
                    content_fallback,
                    count=1,
                    flags=re.IGNORECASE,
                )
                content_fallback = re.sub(
                    r"^\s*(?:toàn trường)\s*",
                    "",
                    content_fallback,
                    count=1,
                    flags=re.IGNORECASE,
                )
                if entities.get("class_name"):
                    content_fallback = re.sub(
                        rf"^\s*(?:lớp\s+)?{re.escape(str(entities['class_name']))}\s*",
                        "",
                        content_fallback,
                        count=1,
                        flags=re.IGNORECASE,
                    )
                content_fallback = content_fallback.strip(" .:-")
                if content_fallback:
                    entities.setdefault("content", content_fallback)

            if "toàn trường" in msg_lower:
                entities["target_type"] = "ALL"
            elif re.search(r"(toàn thể|toàn bộ).*(học sinh|sinh viên)|(?:học sinh|sinh viên).*(toàn thể|toàn bộ)", msg_lower):
                entities["target_type"] = "ROLE"
                entities["role"] = "STUDENT"
            elif re.search(r"(toàn thể|toàn bộ).*(giảng viên|giáo viên)|(?:giảng viên|giáo viên).*(toàn thể|toàn bộ)", msg_lower):
                entities["target_type"] = "ROLE"
                entities["role"] = "LECTURER"
            elif re.search(r"(toàn thể|toàn bộ).*(nhân viên đào tạo)|(?:nhân viên đào tạo).*(toàn thể|toàn bộ)", msg_lower):
                entities["target_type"] = "ROLE"
                entities["role"] = "ACADEMIC_STAFF"
            elif entities.get("class_name"):
                entities["target_type"] = "CLASS"

        if _GROUP_CHAT_RE.search(msg_lower):
            tool_name = _set_tool(result, "create_group_chat")
            result["intent"] = "action"
            intent = "action"

        if _EMAIL_RE.search(msg_lower):
            tool_name = _set_tool(result, "send_email")
            result["intent"] = "action"
            intent = "action"

            content_match = re.search(
                r"(?:rằng|rang|với nội dung|nội dung là|nội dung|về việc)\s+(.+)$",
                message,
                re.IGNORECASE,
            )
            if content_match:
                entities["content"] = content_match.group(1).strip().rstrip(".")

            if "toàn trường" in msg_lower:
                entities["target_type"] = "ALL"
            elif "toàn bộ giảng viên" in msg_lower or "tat ca giang vien" in msg_lower:
                entities["target_type"] = "ROLE"
                entities["role"] = "LECTURER"
            elif "toàn bộ sinh viên" in msg_lower or "tat ca sinh vien" in msg_lower:
                entities["target_type"] = "ROLE"
                entities["role"] = "STUDENT"
            elif entities.get("class_name"):
                entities["target_type"] = "CLASS"

        if _looks_like_general_offtopic(message):
            tool_name = "general_offtopic_chat"
            result["toolName"] = tool_name
            result["intent"] = "general_chat"
            intent = "general_chat"
            entities.clear()

        if user_role == "STUDENT" and _ACADEMIC_REQUEST_RE.search(msg_lower):
            tool_name = _set_tool(result, "create_academic_request")
            result["intent"] = "action"
            intent = "action"

            if "tạm nghỉ" in msg_lower or "bảo lưu" in msg_lower or "bao luu" in msg_lower:
                entities["request_type"] = "PAUSE_SEMESTER"
            elif "học lại" in msg_lower or "hoc lai" in msg_lower:
                entities["request_type"] = "RETAKE_COURSE"
            elif "đổi lớp" in msg_lower or "doi lop" in msg_lower or "chuyển lớp" in msg_lower or "chuyen lop" in msg_lower:
                entities["request_type"] = "CHANGE_CLASS"
            elif "học vượt" in msg_lower or "hoc vuot" in msg_lower:
                entities["request_type"] = "OVERLOAD_STUDY"
            elif "miễn điểm danh" in msg_lower or "mien diem danh" in msg_lower:
                entities["request_type"] = "ABSENT_REQUEST"
            elif "phúc khảo" in msg_lower or "phuc khao" in msg_lower:
                entities["request_type"] = "GRADE_APPEAL"
            elif "chuyển ngành" in msg_lower or "chuyen nganh" in msg_lower:
                entities["request_type"] = "CHANGE_MAJOR"
            elif "đổi chuyên ngành" in msg_lower or "doi chuyen nganh" in msg_lower:
                entities["request_type"] = "CHANGE_SPECIALIZATION"

            reason_match = re.search(r"(?:vì|do|lý do)\s+(.+)$", message, re.IGNORECASE)
            if reason_match:
                entities["reason"] = reason_match.group(1).strip().rstrip(".")

            class_names = re.findall(_CODE_PATTERNS["class_name"], message, re.IGNORECASE)
            if class_names:
                entities.setdefault("class_name", class_names[0].upper())
                if len(class_names) >= 2:
                    entities["to_class_name"] = class_names[1].upper()

        is_schedule_request_phrase = bool(_SCHEDULE_REQUEST_RE.search(msg_lower))
        if is_schedule_request_phrase:
            tool_name = _set_tool(result, "create_schedule_request")
            result["intent"] = "action"
            intent = "action"

        if intent != "action" and (
            re.search(r"(danh sách|ds).*(sinh viên|sv).*(lớp)", msg_lower)
            or re.search(r"(đăng ký).*(lớp)", msg_lower)
        ):
            if entities.get("class_name"):
                tool_name = _set_tool(result, "get_enrollments_by_class")

        if user_role == "LECTURER" and _LECTURER_OWN_CLASSES_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_classes_by_semester")
            entities.pop("class_name", None)
            entities.pop("course_code", None)
            entities.pop("course_name", None)
            entities["lecturer_code"] = user_code

        if user_role == "LECTURER" and _LECTURER_OWN_CLASSES_EXACT_RE.fullmatch(msg_lower):
            tool_name = _set_tool(result, "get_classes_by_semester")
            entities.pop("class_name", None)
            entities["lecturer_code"] = user_code

        if intent != "action" and entities.get("class_name") and _ABSENCE_RATE_CLASS_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_absence_rate_by_class")

        if not is_schedule_request_phrase and intent != "action" and _CLASS_SCHEDULE_RE.search(msg_lower) and entities.get("class_name"):
            tool_name = _set_tool(result, "get_class_schedule")

        if (
            user_role in ("LECTURER", "STUDENT")
            and not is_schedule_request_phrase
            and tool_name != "create_schedule_request"
            and _OWN_SCHEDULE_RE.search(msg_lower)
        ):
            tool_name = _set_tool(result, "get_own_schedule")

        if user_role == "STUDENT" and _OWN_GRADE_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_own_grades")

        if _GRADE_COMPONENT_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_grade_components_by_course")

        if _COURSES_BY_SEMESTER_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_courses_by_semester")

        return tool_name, intent, is_schedule_request_phrase

    def _apply_profile_lookup_rules(
        self,
        result: Dict[str, Any],
        entities: Dict[str, Any],
        message: str,
        msg_lower: str,
        tool_name: str,
        ctx: Dict[str, Any],
    ) -> str:
        student_code_match = re.search(r"\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b", message, re.IGNORECASE)
        lecturer_code_match = re.search(r"\b(GV\d{2,6})\b", message, re.IGNORECASE)
        only_code_match = _ONLY_CODE_RE.match(message)
        has_non_profile_signal = bool(_PROFILE_COMPETING_SIGNAL_RE.search(msg_lower))

        if _STUDENT_INFO_RE.search(msg_lower) and not has_non_profile_signal and not ctx["aggregate_query_signal"] and not ctx["contextual_scope_signal"]:
            tool_name = _set_tool(result, "get_student_by_code")
            if student_code_match:
                code = student_code_match.group(1).upper()
                entities["student_code"] = code
                entities["code"] = code

        if _LECTURER_INFO_RE.search(msg_lower) and not has_non_profile_signal and not ctx["aggregate_query_signal"] and not ctx["contextual_scope_signal"]:
            tool_name = _set_tool(result, "get_lecturer_by_code")
            if lecturer_code_match:
                code = lecturer_code_match.group(1).upper()
                entities["lecturer_code"] = code
                entities["code"] = code

        if only_code_match and not tool_name:
            code = only_code_match.group(1).upper()
            if code.startswith(("SE", "HE", "IA")):
                tool_name = _set_tool(result, "get_student_by_code")
                entities["student_code"] = code
                entities["code"] = code
            elif code.startswith("GV"):
                tool_name = _set_tool(result, "get_lecturer_by_code")
                entities["lecturer_code"] = code
                entities["code"] = code

        return tool_name

    def _apply_attendance_and_schedule_rules(
        self,
        result: Dict[str, Any],
        entities: Dict[str, Any],
        message: str,
        msg_lower: str,
        user_role: str,
        tool_name: str,
        is_schedule_request_phrase: bool,
    ) -> str:
        has_student_scope = bool(
            entities.get("student_code")
            or re.search(r'\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b', message, re.IGNORECASE)
            or re.search(r"\b(của tôi|cua toi|của em|cua em|em\b|tôi\b|toi\b)\b", msg_lower)
        )
        if has_student_scope and _ATTENDANCE_HISTORY_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_my_absence_history")
        elif has_student_scope and _ATTENDANCE_RISK_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_my_attendance_risk_courses")
        elif has_student_scope and _ATTENDANCE_OVERVIEW_RE.search(msg_lower):
            tool_name = _set_tool(result, "get_my_attendance_overview")

        schedule_keywords = ("thời khóa biểu", "lịch dạy", "lịch giảng", "schedule", "tiết")
        is_schedule_query = any(kw in msg_lower for kw in schedule_keywords) or bool(
            re.search(r"\blịch\b", msg_lower) and not re.search(r"\blịch sử\b|\blich su\b", msg_lower)
        )

        if is_schedule_query and not is_schedule_request_phrase and tool_name not in {
            "get_my_absence_history",
            "get_my_attendance_overview",
            "get_my_attendance_risk_courses",
        }:
            gv_match = re.search(r'\b(GV\d{2,6})\b', message, re.IGNORECASE)
            se_match = re.search(r'\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b', message, re.IGNORECASE)
            has_class_scope = bool(entities.get("class_name"))
            has_other_person_scope = bool(
                gv_match
                or se_match
                or entities.get("lecturer_code")
                or entities.get("student_code")
            )
            own_schedule_phrase = bool(
                re.search(r"(thời khóa biểu|lịch dạy|lịch học)", msg_lower)
                or (
                    user_role == "LECTURER"
                    and re.search(r"\blịch\b", msg_lower)
                    and not re.search(r"\blớp\b", msg_lower)
                )
                or (
                    user_role == "STUDENT"
                    and re.search(r"\blịch\b", msg_lower)
                    and not re.search(r"\blớp\b", msg_lower)
                )
            )

            if (
                user_role in ("LECTURER", "STUDENT")
                and tool_name != "create_schedule_request"
                and own_schedule_phrase
                and not has_class_scope
                and not has_other_person_scope
            ):
                tool_name = _set_tool(result, "get_own_schedule")
                entities.pop("full_name", None)
                entities.pop("code", None)

            if gv_match and tool_name != "get_other_lecturer_schedule":
                gv_code = gv_match.group(1).upper()
                if tool_name not in ("get_other_lecturer_schedule", "get_own_schedule"):
                    tool_name = _set_tool(result, "get_other_lecturer_schedule")
                    entities["lecturer_code"] = gv_code
                    entities.pop("full_name", None)
                    entities.pop("code", None)
            elif se_match and tool_name != "get_other_student_schedule":
                se_code = se_match.group(1).upper()
                if tool_name not in ("get_other_student_schedule", "get_own_schedule"):
                    tool_name = _set_tool(result, "get_other_student_schedule")
                    entities["student_code"] = se_code
                    entities.pop("full_name", None)
                    entities.pop("code", None)

            if tool_name in ("get_other_lecturer_schedule", "get_other_student_schedule", "get_own_schedule", "get_class_schedule"):
                if "tuần sau" in msg_lower or "tuan sau" in msg_lower:
                    entities["date"] = "NEXT_WEEK"
                elif "tuần này" in msg_lower or "tuan nay" in msg_lower:
                    entities["date"] = "THIS_WEEK"
                elif "hôm nay" in msg_lower or "hom nay" in msg_lower:
                    entities["date"] = "TODAY"
                elif "ngày mai" in msg_lower or "ngay mai" in msg_lower or "tomorrow" in msg_lower:
                    entities["date"] = "TOMORROW"

        return tool_name

    def _normalize_create_schedule_request_entities(
        self,
        entities: Dict[str, Any],
        message: str,
        msg_lower: str,
    ) -> None:
        original_slot_id_raw = str(entities.get("original_slot_id") or "").strip()
        requested_slot_id_raw = str(entities.get("requested_slot_id") or "").strip()
        if original_slot_id_raw and not original_slot_id_raw.isdigit():
            entities.pop("original_slot_id", None)
        if requested_slot_id_raw and not requested_slot_id_raw.isdigit():
            entities.pop("requested_slot_id", None)

        reason_match = re.search(r"(?:vì|do|lý do)\s+(.+)$", message, re.IGNORECASE)
        if reason_match:
            entities["reason"] = reason_match.group(1).strip().rstrip(".")

        direct_slot_match = re.search(
            r"từ\s+slot\s*(\d{3,})\s+(?:sang|qua|đổi sang)\s+(?:slot\s*)?(\d{3,})",
            msg_lower,
            re.IGNORECASE,
        )
        if direct_slot_match:
            entities["original_slot_id"] = direct_slot_match.group(1)
            entities["requested_slot_id"] = direct_slot_match.group(2)
            return

        from_date_slot = re.search(
            r"từ\s+(?:slot|ca|tiết)\s*(\d+)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})",
            message,
            re.IGNORECASE,
        )
        if from_date_slot:
            entities["original_slot_number"] = from_date_slot.group(1)
            entities["original_date"] = from_date_slot.group(2)
        else:
            from_slot_after_date = re.search(
                r"từ\s+(?:ngày\s*)?(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s*(?:slot|ca|tiết)\s*(\d+)",
                message,
                re.IGNORECASE,
            )
            if from_slot_after_date:
                entities["original_date"] = from_slot_after_date.group(1)
                entities["original_slot_number"] = from_slot_after_date.group(2)

        target_date_slot = re.search(
            r"sang.*?(?:ngày\s*)?(\d{1,2}[-/]\d{1,2}[-/]\d{4}).*?(?:slot|ca|tiết)\s*(\d+)",
            message,
            re.IGNORECASE,
        )
        if target_date_slot:
            entities["requested_date"] = target_date_slot.group(1)
            entities["requested_slot_number"] = target_date_slot.group(2)
        else:
            target_slot_date = re.search(
                r"sang\s+(?:slot|ca|tiết)\s*(\d+)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})",
                message,
                re.IGNORECASE,
            )
            if target_slot_date:
                entities["requested_slot_number"] = target_slot_date.group(1)
                entities["requested_date"] = target_slot_date.group(2)

    def _post_process(
        self,
        result: Dict[str, Any],
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        result = cast(Dict[str, Any], result)
        tool_name = (result.get("toolName") or "").strip()

        # 0. Clean category tags
        if tool_name and "[" in tool_name:
            tool_name = re.sub(r"\[.*?\]\s*", "", tool_name).strip()
            result["toolName"] = tool_name

        intent   = (result.get("intent") or "").strip().lower()
        entities = cast(Dict[str, Any], result.get("entities") or {})
        msg_lower = message.lower()
        ctx = self._prepare_routing_context(message, msg_lower, tool_name, entities)
        self._apply_entity_hints(tool_name, message, msg_lower, entities, ctx)
        tool_name = self._apply_major_and_collection_rules(result, entities, tool_name, message, msg_lower, ctx)
        tool_name, intent, is_schedule_request_phrase = self._apply_action_and_domain_rules(
            result,
            entities,
            message,
            msg_lower,
            user_role,
            user_code,
            tool_name,
            intent,
        )
        tool_name = self._apply_profile_lookup_rules(
            result,
            entities,
            message,
            msg_lower,
            tool_name,
            ctx,
        )
        tool_name = self._apply_explicit_query_rules(
            result,
            entities,
            message,
            msg_lower,
            user_role,
            user_code,
            tool_name,
        )

        if tool_name == "create_schedule_request":
            self._normalize_create_schedule_request_entities(entities, message, msg_lower)

        if tool_name in {"get_grade_components_by_course", "get_detail_course_grade", "get_courses_by_name", "get_attendance_rate_by_course"}:
            entities.pop("class_name", None)

        if tool_name in {"get_class_schedule", "get_enrollments_by_class", "get_students_by_class", "get_grade_report_by_class", "get_attendance_by_slot", "get_attendance_stats_by_class", "get_class_info"}:
            entities.pop("course_name", None)
            if "lớp" in msg_lower and entities.get("class_name"):
                result["entities"] = entities

        tool_name = self._apply_attendance_and_schedule_rules(
            result,
            entities,
            message,
            msg_lower,
            user_role,
            tool_name,
            is_schedule_request_phrase,
        )

        # 1. Clean entity values
        for ek in list(entities.keys()):
            ev = entities.get(ek)
            if isinstance(ev, str):
                ev = re.sub(r'^(theo\s+tên\s+|dùng\s+tên\s+|tên\s+)', '', ev.strip(), flags=re.IGNORECASE)
                ev = re.sub(r'^(mã\s+\S+\s+thuộc\s+ngành\s+)', '', ev.strip(), flags=re.IGNORECASE)
                ev = re.sub(r'^(của\s+|thuộc\s+|trong\s+|ở\s+|về\s+|ngành\s+|chuyên\s+ngành\s+)', '', ev.strip(), flags=re.IGNORECASE)
                ev = re.sub(r'[?!.]+$', '', ev).strip().strip('"\'')
                if ev != entities[ek]:
                    entities[ek] = ev
        result["entities"] = entities

        # 2. Alias mapping
        if tool_name in _TOOL_ALIASES:
            tool_name = _TOOL_ALIASES[tool_name]
            result["toolName"] = tool_name

        # 3. Fuzzy match nếu tool không tồn tại
        elif tool_name and tool_name not in _all_tools():
            corrected = self._fuzzy_match_tool(tool_name, set(_all_tools().keys()))
            if corrected:
                logger.warning(f"[PostProcess] Typo repair: '{tool_name}' → '{corrected}'")
                tool_name = corrected
                result["toolName"] = corrected

        inferred_group, inferred_group_score = _detect_tool_group(message)
        if (
            tool_name
            and inferred_group
            and inferred_group_score >= 3
            and tool_name not in _AI_ONLY_TOOLS
            and not _tool_in_group(tool_name, inferred_group)
        ):
            allowed_group_tools = {
                name
                for name in tools_loader.role_tools.get(user_role, set())
                if get_tool_agent(name) == detect_agent(message) and _tool_in_group(name, inferred_group)
            }
            corrected = self._fuzzy_match_tool(tool_name, allowed_group_tools)
            if corrected:
                logger.warning(
                    f"[PostProcess] Group correction: '{tool_name}' → '{corrected}' (group={inferred_group})"
                )
                tool_name = corrected
                result["toolName"] = corrected

        if result.get("intent") == "general_chat" and not result.get("toolName"):
            result["toolName"] = "general_offtopic_chat"
            tool_name = "general_offtopic_chat"
        elif tool_name == "general_offtopic_chat":
            result["intent"] = "general_chat"
            result["entities"] = {}

        # 4. Auto-set intent=navigation cho view_ tools
        if tool_name.startswith("view_"):
            result["intent"] = "navigation"
            intent = "navigation"

        # 4.5 Locked tool check
        if tool_name and tool_name in tools_loader.inactive_tools:
            logger.warning(f"[PostProcess] Tool locked: {tool_name}")
            result["intent"] = "tool_locked"
            result["entities"] = {"reason": f"Công cụ '{tool_name}' hiện đang bị khóa."}
            result["toolName"] = tool_name
            result["agent"] = get_tool_agent(tool_name)
            return result

        # 5. Permission check
        allowed, reason = (True, "") if tool_name in _AI_ONLY_TOOLS else (check_permission(user_role, tool_name) if tool_name else (True, ""))
        if tool_name and not allowed:
            logger.warning(f"[PostProcess] Permission denied: role={user_role} tool={tool_name}")
            result["intent"]   = "permission_denied"
            result["entities"] = {"reason": reason}
            result["toolName"] = None
            result["agent"] = detect_agent(message)
            return result

        # 6. Tool-specific cleanup
        if tool_name == "get_empty_rooms":
            if re.search(r"(tất cả slot|tat ca slot|mọi slot|moi slot|cả ngày|ca ngay|all slots?)", msg_lower):
                entities["slot_number"] = "ALL"
            explicit_slot = bool(
                re.search(r"\b(slot|tiết)\s*\d+\b", message, re.IGNORECASE)
                or re.search(r"\bca\s*\d+\b", message, re.IGNORECASE)
            )
            if not explicit_slot and str(entities.get("slot_number") or "").upper() != "ALL":
                entities.pop("slot_number", None)
                entities.pop("slot", None)

        # 7. Force intent=action cho backend action tools
        if tool_name and _is_backend_action(tool_name):
            result_cast = cast(Dict[str, Any], result)
            result_cast["intent"] = "action"
            action = result_cast.get("action")
            if not action or not isinstance(action, dict):
                result_cast["action"] = {"type": tool_name.upper(), "params": entities}
            else:
                action["type"] = tool_name.upper()
                if not action.get("params"):
                    action["params"] = entities

        result["agent"] = get_tool_agent(tool_name) if tool_name else detect_agent(message)
        result["toolGroup"] = inferred_group

        # 8. Context resolution
        if history and not result.get("context_resolved"):
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

        # 9. LECTURER notification restriction
        if tool_name == "create_notification" and user_role == "LECTURER":
            action = result.get("action") or {}
            params = action.get("params", {}) if isinstance(action, dict) else {}
            params = cast(Dict[str, Any], params)
            if params.get("target_type") == "ALL":
                params["target_type"] = "STUDENT"

        # 10. Extract code from merged full_name
        if entities.get("full_name") and not entities.get("lecturer_code"):
            full_name = entities["full_name"]
            code_match = re.search(r'\b(GV\d{2,6}|SE\d{5,6}|HE\d{5,6}|IA\d{5,6}|[A-Z]{3,4}\d{3})\b', full_name, re.IGNORECASE)
            if code_match:
                code = code_match.group(1).upper()
                if tool_name == "get_other_lecturer_schedule" and code.startswith("GV"):
                    entities["lecturer_code"] = code
                    entities.pop("full_name", None)
                elif tool_name == "get_other_student_schedule" and any(code.startswith(p) for p in ["SE", "HE", "IA"]):
                    entities["student_code"] = code
                    entities.pop("full_name", None)

        # 11. Extract code from message if tool expects it but entities missing
        if tool_name == "get_other_lecturer_schedule" and not entities.get("lecturer_code"):
            gv_match = re.search(r'\b(GV\d{2,6})\b', message, re.IGNORECASE)
            if gv_match:
                entities["lecturer_code"] = gv_match.group(1).upper()
                entities.pop("full_name", None)
        elif tool_name == "get_other_student_schedule" and not entities.get("student_code"):
            se_match = re.search(r'\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b', message, re.IGNORECASE)
            if se_match:
                entities["student_code"] = se_match.group(1).upper()
                entities.pop("full_name", None)

        # 12. Restore Vietnamese diacritics
        def _clean_phrase_for_display(text: str) -> str:
            cleaned = str(text or "").strip()
            cleaned = re.sub(r'^(theo\s+tên\s+|dùng\s+tên\s+|tên\s+)', '', cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r'^(mã\s+\S+\s+thuộc\s+ngành\s+)', '', cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r'^(của\s+|thuộc\s+|trong\s+|ở\s+|về\s+|ngành\s+|chuyên\s+ngành\s+)', '', cleaned, flags=re.IGNORECASE)
            return cleaned.strip(" .,:;!?\"'")

        def unaccent(text):
            return ''.join(c for c in unicodedata.normalize('NFD', str(text).lower()) if unicodedata.category(c) != 'Mn')

        for key in ["full_name", "person_name", "name", "user_name", "major_name", "specialization_name", "course_name"]:
            if key in entities and entities[key]:
                entity_val = _clean_phrase_for_display(str(entities[key]).strip())
                entity_unaccent = unaccent(entity_val)
                msg_words = message.split()
                best_match, best_score = None, 0
                for window_size in range(min(5, len(msg_words)), 0, -1):
                    for i in range(len(msg_words) - window_size + 1):
                        # Use explicit loop to avoid slice indexing issue in some type checkers
                        phrase_words = [msg_words[j] for j in range(i, i + window_size)]
                        phrase = _clean_phrase_for_display(" ".join(phrase_words))
                        if not phrase:
                            continue
                        phrase_unaccent = unaccent(phrase)
                        score = 0
                        if phrase_unaccent == entity_unaccent:
                            score = 1.0
                        elif phrase_unaccent in entity_unaccent or entity_unaccent in phrase_unaccent:
                            score = 0.95
                        else:
                            score = difflib.SequenceMatcher(None, phrase_unaccent, entity_unaccent).ratio()
                        if score > best_score or (score == best_score and len(phrase) > len(best_match or "")):
                            best_match, best_score = phrase, score
                if best_match and best_score >= 0.6:
                    entities[key] = best_match
                result["entities"] = entities

        # 13. Validate dynamic SQL
        dynamic_sql = (result.get("dynamicSql") or "").strip()
        if dynamic_sql:
            sql_upper = dynamic_sql.upper().lstrip()
            if not sql_upper.startswith("SELECT") or any(x in sql_upper for x in ["UPDATE", "DELETE", "INSERT", "DROP", "TRUNCATE"]):
                logger.error(f"[PostProcess] BLOCKED dangerous SQL: {dynamic_sql[:100]}")
                result["dynamicSql"] = None
                result["intent"]     = "permission_denied"
                result["entities"]   = {"reason": "Chỉ hỗ trợ truy vấn SELECT an toàn."}

        # 14. Ensure confidence
        if "confidence" not in result:
            result["confidence"] = "medium"

        return result

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
