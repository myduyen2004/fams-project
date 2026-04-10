from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from app.services.chat.router.core_tool_inventory import is_kept_tool
from app.services.chat.router.tool_catalog import get_tool_agent
from app.services.chat.services.fptu_knowledge import is_fptu_knowledge_question


_OWN_PRONOUN_RE = re.compile(r"\b(của tôi|cua toi|của em|cua em|em|tôi|toi|my)\b", re.IGNORECASE)
_LIST_RE = re.compile(r"\b(danh sách|liet ke|liệt kê|list|hiển thị|hien thi|cho xem|xem)\b", re.IGNORECASE)
_INFO_RE = re.compile(r"\b(thông tin|thong tin|chi tiết|chi tiet|tra cứu|tra cuu)\b", re.IGNORECASE)
_SCHEDULE_RE = re.compile(r"\b(lịch|thời khóa biểu|thoi khoa bieu|tkb|schedule)\b", re.IGNORECASE)
_TEACHING_RE = re.compile(r"\b(lịch dạy|lich day|dạy|day|teaching)\b", re.IGNORECASE)
_GRADE_RE = re.compile(r"\b(điểm|diem|gpa|bảng điểm|bang diem|grade)\b", re.IGNORECASE)
_ATTENDANCE_RE = re.compile(r"\b(điểm danh|diem danh|chuyên cần|chuyen can|vắng|vang|attendance)\b", re.IGNORECASE)
_COURSE_RE = re.compile(r"\b(môn|mon|course)\b", re.IGNORECASE)
_ROOM_RE = re.compile(r"\b(phòng|phong|room|lab)\b", re.IGNORECASE)
_NOTIFICATION_RE = re.compile(r"\b(thông báo|thong bao|notification)\b", re.IGNORECASE)
_UNREAD_RE = re.compile(r"\b(chưa đọc|chua doc|unread)\b", re.IGNORECASE)
_MAJOR_RE = re.compile(r"\b(ngành|nganh|major)\b", re.IGNORECASE)
_SPEC_RE = re.compile(r"\b(chuyên ngành|chuyen nganh|specialization)\b", re.IGNORECASE)
_SUB_SPEC_RE = re.compile(r"\b(chuyên ngành hẹp|chuyen nganh hep|sub specialization|sub-specialization)\b", re.IGNORECASE)
_EXPERTISE_RE = re.compile(r"\b(chuyên môn|chuyen mon|expertise)\b", re.IGNORECASE)
_WORKLOAD_RE = re.compile(r"\b(khối lượng giảng dạy|khoi luong giang day|workload|tải giảng dạy|tai giang day)\b", re.IGNORECASE)
_TOP_RE = re.compile(r"\b(top|cao nhất|cao nhat|giỏi nhất|gioi nhat|kết quả cao nhất)\b", re.IGNORECASE)
_AT_RISK_RE = re.compile(r"\b(nguy cơ học vụ|nguy co hoc vu|at risk|nguy cơ)\b", re.IGNORECASE)
_CLASSMATE_RE = re.compile(r"\b(học cùng lớp|hoc cung lop|cùng lớp với|cung lop voi|classmate)\b", re.IGNORECASE)
_CONSECUTIVE_ABSENCE_RE = re.compile(r"\b(vắng liên tiếp|vang lien tiep|consecutive absences?)\b", re.IGNORECASE)
_ACTIVE_SEMESTER_RE = re.compile(r"\b(học kỳ hiện tại|hoc ky hien tai|học kỳ đang hoạt động|hoc ky dang hoat dong|kỳ này|ky nay)\b", re.IGNORECASE)
_LIST_SEMESTERS_RE = re.compile(r"\b(danh sách|liet ke|liệt kê|list).*(học kỳ|hoc ky)\b", re.IGNORECASE)
_LIST_MAJORS_RE = re.compile(r"\b(danh sách|liet ke|liệt kê|list).*(ngành|nganh|major)\b", re.IGNORECASE)
_COMPONENT_RE = re.compile(r"\b(cấu phần điểm|cau phan diem|thành phần điểm|thanh phan diem)\b", re.IGNORECASE)
_OVERVIEW_RE = re.compile(r"\b(tổng quan|tong quan|overview)\b", re.IGNORECASE)
_ABNORMAL_RE = re.compile(r"\b(bất thường|bat thuong|abnormal)\b", re.IGNORECASE)
_EXCEL_RE = re.compile(r"\b(excel)\b", re.IGNORECASE)
_USER_ACCOUNT_RE = re.compile(r"\b(tài khoản|tai khoan|người dùng|nguoi dung|user)\b", re.IGNORECASE)
_ACTIVATE_RE = re.compile(r"\b(kích hoạt|kich hoat|mở khóa|mo khoa|activate)\b", re.IGNORECASE)
_CREATE_RE = re.compile(r"\b(tạo|tao|thêm|them|create)\b", re.IGNORECASE)
_UPDATE_RE = re.compile(r"\b(cập nhật|cap nhat|sửa|sua|update)\b", re.IGNORECASE)
_EMAIL_ACTION_RE = re.compile(r"\b(email|gửi email|gui email|mail)\b", re.IGNORECASE)
_ROLE_COUNT_RE = re.compile(r"\b(thống kê|thong ke|đếm|dem|count|số lượng|so luong)\b", re.IGNORECASE)
_STANDING_RE = re.compile(r"\b(tình trạng học tập|tinh trang hoc tap|academic standing|hoc luc)\b", re.IGNORECASE)
_MY_ID_RE = re.compile(r"\b(mã sinh viên của tôi|ma sinh vien cua toi|student id)\b", re.IGNORECASE)
_SLOT_QUERY_RE = re.compile(r"\b(slot nào|slots nào|khung giờ nào|slot nao)\b", re.IGNORECASE)

_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_SEMESTER_CODE_RE = re.compile(r"\b(SP|SU|FA|WI)\d{2}\b", re.IGNORECASE)
_STUDENT_CODE_RE = re.compile(r"\b(SE|HE|IA)\d{5,6}\b", re.IGNORECASE)
_LECTURER_CODE_RE = re.compile(r"\bGV\d{2,6}\b", re.IGNORECASE)
_USER_CODE_RE = re.compile(r"\b(?:SE|HE|IA|GV|AD|AS)\d{3,6}\b", re.IGNORECASE)
_COURSE_CODE_RE = re.compile(r"\b[A-Z]{3,4}\d{3}\b", re.IGNORECASE)
_ROOM_CODE_RE = re.compile(r"\b([A-Z]\d{2,3}|LAB\d{2})\b", re.IGNORECASE)
_CLASS_NAME_RE = re.compile(r"\b([A-Z]{2,}\d{2,}[A-Z\d]*_[A-Z0-9]+|[A-Z]{2,}\d{2,}[A-Z\d]*-[A-Z]{2,4}\d{3,4})\b", re.IGNORECASE)
_SLOT_RE = re.compile(r"\b(slot|ca|tiết|tiet)\s*(?:số\s*)?(\d+)\b", re.IGNORECASE)
_SESSION_RE = re.compile(r"\b(?:phiên|phien|session)\s*(\d+)\b", re.IGNORECASE)
_SLOT_SWAP_RE = re.compile(
    r"(?:đổi|doi)\s+(?:từ|tu)\s+(?:slot|phiên|phien|session)\s*(\d+)\s+(?:sang|qua|to)\s+(?:slot|phiên|phien|session)\s*(\d+)",
    re.IGNORECASE,
)
_STATUS_RE = re.compile(r"\b(PRESENT|ABSENT|LATE)\b", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_QUOTE_RE = re.compile(r"[\"“”']([^\"“”']{3,})[\"“”']")

_STOP_TAIL_RE = re.compile(
    r"\s+(?:đang|dang|hiện|hien|có|co|gồm|gom|là|la|nào|nao|như thế nào|nhu the nao|là gì|la gi).*$",
    re.IGNORECASE,
)
_TRAILING_PUNCT_RE = re.compile(r"[\s,.:;!?]+$")

_DATE_KEYWORDS = (
    ("hôm nay", "TODAY"),
    ("hom nay", "TODAY"),
    ("ngày mai", "TOMORROW"),
    ("ngay mai", "TOMORROW"),
    ("tuần này", "THIS_WEEK"),
    ("tuan nay", "THIS_WEEK"),
    ("tuần sau", "NEXT_WEEK"),
    ("tuan sau", "NEXT_WEEK"),
)

_ROLE_ALIASES = {
    "LECTURER": ("giảng viên", "giang vien", "lecturer", "teacher", "gv"),
    "STUDENT": ("sinh viên", "sinh vien", "student", "sv", "học sinh", "hoc sinh"),
    "ADMIN": ("admin", "quản trị", "quan tri", "administrator"),
    "ACADEMIC_STAFF": ("academic staff", "phòng đào tạo", "phong dao tao", "staff"),
}


def _clean_named_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip(" .,:;?!")
    cleaned = _STOP_TAIL_RE.sub("", cleaned).strip()
    cleaned = _TRAILING_PUNCT_RE.sub("", cleaned)
    return cleaned or None


def _extract_named_value(message: str, pattern: re.Pattern[str]) -> Optional[str]:
    match = pattern.search(message)
    if not match:
        return None
    return _clean_named_value(match.group(1))


def _extract_major_name(message: str) -> Optional[str]:
    return _extract_named_value(
        message,
        re.compile(
            r"(?:ngành|nganh)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?=$|[,.!?]|\s+(?:đang|dang|hiện|hien|có|co|gồm|gom|là|la|nào|nao)\b)",
            re.IGNORECASE,
        ),
    )


def _extract_specialization_name(message: str) -> Optional[str]:
    return _extract_named_value(
        message,
        re.compile(
            r"(?:chuyên ngành|chuyen nganh)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?=$|[,.!?]|\s+(?:đang|dang|hiện|hien|có|co|gồm|gom|là|la|nào|nao)\b)",
            re.IGNORECASE,
        ),
    )


def _extract_sub_specialization_name(message: str) -> Optional[str]:
    return _extract_named_value(
        message,
        re.compile(
            r"(?:chuyên ngành hẹp|chuyen nganh hep|sub[\s-]*specialization)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?=$|[,.!?]|\s+(?:đang|dang|hiện|hien|có|co|gồm|gom|là|la|nào|nao)\b)",
            re.IGNORECASE,
        ),
    )


def _extract_course_name(message: str) -> Optional[str]:
    return _extract_named_value(
        message,
        re.compile(
            r"(?:môn học|môn|mon|course)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?=$|[,.!?]|\s+(?:gồm|gom|có|co|là|la|bao gồm|bao gom|nào|nao)\b)",
            re.IGNORECASE,
        ),
    )


def _extract_expertise(message: str) -> Optional[str]:
    return _extract_named_value(
        message,
        re.compile(
            r"(?:chuyên môn|chuyen mon)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?=$|[,.!?]|\s+(?:thuộc|thuoc|của|cua|trong|ngành|nganh)\b)",
            re.IGNORECASE,
        ),
    )


def _extract_role_value(message: str) -> Optional[str]:
    lowered = message.lower()
    for role, aliases in _ROLE_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return role
    return None


def _extract_reason(message: str) -> Optional[str]:
    return _extract_named_value(message, re.compile(r"(?:vì|vi|do|because)\s+(.+)$", re.IGNORECASE))


def _extract_title_or_content(message: str) -> Dict[str, str]:
    payload: Dict[str, str] = {}
    quote_match = _QUOTE_RE.search(message)
    if quote_match:
        quoted = _clean_named_value(quote_match.group(1))
        if quoted:
            payload["content"] = quoted
            payload["title"] = quoted[:120]
            return payload

    content = _extract_named_value(message, re.compile(r"(?:nội dung|noi dung)\s+(.+)$", re.IGNORECASE))
    if content:
        payload["content"] = content
        payload["title"] = content[:120]
    return payload


def _extract_entities(message: str) -> Dict[str, Any]:
    entities: Dict[str, Any] = {}

    class_match = _CLASS_NAME_RE.search(message)
    if class_match:
        entities["class_name"] = class_match.group(1).upper()

    student_match = _STUDENT_CODE_RE.search(message)
    if student_match:
        entities["student_code"] = student_match.group(0).upper()

    lecturer_match = _LECTURER_CODE_RE.search(message)
    if lecturer_match:
        entities["lecturer_code"] = lecturer_match.group(0).upper()

    user_code_match = _USER_CODE_RE.search(message)
    if user_code_match:
        entities["code"] = user_code_match.group(0).upper()

    course_match = _COURSE_CODE_RE.search(message)
    if course_match:
        entities["course_code"] = course_match.group(0).upper()
        entities.setdefault("course_name", course_match.group(0).upper())

    room_match = _ROOM_CODE_RE.search(message)
    if room_match:
        entities["room_name"] = room_match.group(1).upper()

    semester_match = _SEMESTER_CODE_RE.search(message)
    if semester_match:
        entities["semester_code"] = semester_match.group(0).upper()

    slot_match = _SLOT_RE.search(message)
    if slot_match:
        entities["slot_number"] = slot_match.group(2)

    session_match = _SESSION_RE.search(message)
    if session_match:
        entities["session_id"] = session_match.group(1)

    slot_swap_match = _SLOT_SWAP_RE.search(message)
    if slot_swap_match:
        entities["original_slot_id"] = slot_swap_match.group(1)
        entities["requested_slot_id"] = slot_swap_match.group(2)

    status_match = _STATUS_RE.search(message)
    if status_match:
        entities["status"] = status_match.group(1).upper()

    email_match = _EMAIL_RE.search(message)
    if email_match:
        entities["email"] = email_match.group(0)

    literal_date = _DATE_RE.search(message)
    if literal_date:
        entities["date"] = literal_date.group(0)
    else:
        lowered = message.lower()
        for phrase, value in _DATE_KEYWORDS:
            if phrase in lowered:
                entities["date"] = value
                break

    return entities


class TrendRouter:
    @staticmethod
    def _lookup_or_view(data_tool: str, view_tool: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        if is_kept_tool(data_tool):
            return TrendRouter._result("data_query", data_tool, entities)
        return TrendRouter._result("navigation", view_tool, entities)

    def route(
        self,
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[Dict[str, Any]]:
        del history

        text = str(message or "").strip()
        if not text:
            return None

        msg_lower = text.lower()
        entities = _extract_entities(text)
        entities.update(_extract_title_or_content(text))

        if _ACTIVE_SEMESTER_RE.search(msg_lower) or (
            "học kỳ" in msg_lower and ("đang hoạt động" in msg_lower or "dang hoat dong" in msg_lower or "active" in msg_lower)
        ):
            return self._result("data_query", "get_active_semester", entities)

        if user_role == "ACADEMIC_STAFF" and _OVERVIEW_RE.search(msg_lower) and ("học kỳ" in msg_lower or "hoc ky" in msg_lower):
            return self._result("data_query", "get_semester_overview", entities)

        if (
            _LIST_SEMESTERS_RE.search(msg_lower)
            and "lớp" not in msg_lower
            and "lop" not in msg_lower
        ):
            return self._result("data_query", "list_semesters", entities)

        if (
            _LIST_MAJORS_RE.search(msg_lower)
            and "sinh viên" not in msg_lower
            and "sinh vien" not in msg_lower
            and "giảng viên" not in msg_lower
            and "giang vien" not in msg_lower
            and "chuyên ngành" not in msg_lower
            and "chuyen nganh" not in msg_lower
            and "môn" not in msg_lower
            and "mon" not in msg_lower
        ):
            return self._result("data_query", "list_majors", entities)

        if user_role in {"ADMIN", "ACADEMIC_STAFF", "LECTURER"} and _NOTIFICATION_RE.search(msg_lower):
            if _CREATE_RE.search(msg_lower) or "gửi thông báo" in msg_lower or "gui thong bao" in msg_lower:
                if entities.get("class_name"):
                    entities.setdefault("target_type", "CLASS")
                elif user_role == "LECTURER" and (
                    "lớp tôi đang giảng dạy" in msg_lower
                    or "lop toi dang giang day" in msg_lower
                    or "lớp tôi dạy" in msg_lower
                    or "lop toi day" in msg_lower
                ):
                    entities.setdefault("target_type", "CLASS")
                return self._result("action", "create_notification", entities)

        if user_role in {"ADMIN", "ACADEMIC_STAFF"} and _EMAIL_ACTION_RE.search(msg_lower):
            return self._result("action", "send_email", entities)

        if user_role in {"ADMIN", "ACADEMIC_STAFF"} and (_INFO_RE.search(msg_lower) or "tra cứu" in msg_lower or "tra cuu" in msg_lower) and (
            _USER_ACCOUNT_RE.search(msg_lower) or entities.get("code")
        ):
            return self._result("data_query", "get_user_by_code", entities)

        if user_role == "ADMIN":
            if _ACTIVATE_RE.search(msg_lower) and _USER_ACCOUNT_RE.search(msg_lower):
                return self._result("action", "activate_user", entities)
            if _ROLE_COUNT_RE.search(msg_lower) and ("vai trò" in msg_lower or "vai tro" in msg_lower or "role" in msg_lower):
                role_value = _extract_role_value(text)
                if role_value:
                    entities["role"] = role_value
                return self._result("data_query", "count_users_by_role", entities)
            if _CREATE_RE.search(msg_lower) and _USER_ACCOUNT_RE.search(msg_lower):
                role_value = _extract_role_value(text)
                if role_value:
                    entities["role"] = role_value
                return self._result("action", "create_user", entities)
            if _UPDATE_RE.search(msg_lower) and _USER_ACCOUNT_RE.search(msg_lower):
                role_value = _extract_role_value(text)
                if role_value:
                    entities["role"] = role_value
                return self._result("action", "update_user", entities)
        if _ROOM_RE.search(msg_lower):
            if (
                entities.get("room_name")
                and (
                    "còn trống" in msg_lower
                    or "con trong" in msg_lower
                    or "available" in msg_lower
                )
            ):
                return self._result("data_query", "get_available_slots_for_room", entities)
            if ("trống" in msg_lower or "empty" in msg_lower or "con trong" in msg_lower) and entities.get("date") and not entities.get("room_name"):
                return self._result("data_query", "get_empty_rooms", entities)
            if "mức độ sử dụng" in msg_lower or "usage" in msg_lower:
                return self._result("data_query", "get_room_usage_weekly", entities)
            if entities.get("date") in {"TODAY", None} and (
                "phòng nào" in msg_lower or "phòng nào đang có thể sử dụng" in msg_lower or "rooms today" in msg_lower
            ):
                entities.setdefault("date", "TODAY")
                return self._result("data_query", "get_all_rooms_today", entities)

        if _ATTENDANCE_RE.search(msg_lower):
            if user_role == "ACADEMIC_STAFF" and _ABNORMAL_RE.search(msg_lower):
                return self._result("data_query", "get_abnormal_attendance", entities)
            if _CONSECUTIVE_ABSENCE_RE.search(msg_lower) and entities.get("class_name"):
                return self._result("data_query", "get_consecutive_absences", entities)
            if entities.get("class_name") and entities.get("date") and not entities.get("slot_number"):
                return self._result("data_query", "get_attendance_by_slot", entities)
            if ("thống kê" in msg_lower or "thong ke" in msg_lower) and entities.get("class_name"):
                return self._result("data_query", "get_attendance_stats_by_class", entities)
            if entities.get("slot_number") and entities.get("date"):
                return self._result("data_query", "get_attendance_by_slot_number", entities)
            if user_role == "STUDENT":
                if "báo cáo" in msg_lower or "report" in msg_lower:
                    return self._result("data_query", "get_attendance_report_by_student", entities)
                if _OWN_PRONOUN_RE.search(msg_lower):
                    return self._result("data_query", "get_my_attendance_status", entities)

        if (
            ("giảng viên" in msg_lower or "giang vien" in msg_lower or "lecturer" in msg_lower)
            and entities.get("lecturer_code")
            and (_INFO_RE.search(msg_lower) or "mã" in msg_lower or "ma" in msg_lower or "tra cuu" in msg_lower)
            and not _SCHEDULE_RE.search(msg_lower)
        ):
            return self._lookup_or_view("get_lecturer_by_code", "view_lecturers", entities)

        if user_role == "STUDENT" and _NOTIFICATION_RE.search(msg_lower):
            if _UNREAD_RE.search(msg_lower):
                return self._result("data_query", "count_unread_notifications", entities)
            if _OWN_PRONOUN_RE.search(msg_lower):
                return self._result("data_query", "get_my_notifications", entities)

        if user_role in {"STUDENT", "LECTURER"}:
            target_student_code = str(entities.get("student_code") or "").upper()
            target_lecturer_code = str(entities.get("lecturer_code") or "").upper()
            current_user_code = str(user_code or "").upper()
            refers_to_other_user_schedule = (
                (_SCHEDULE_RE.search(msg_lower) or _TEACHING_RE.search(msg_lower))
                and (
                    (target_student_code and target_student_code != current_user_code)
                    or (target_lecturer_code and target_lecturer_code != current_user_code)
                )
            )
            if refers_to_other_user_schedule:
                return None
            if (
                (_SCHEDULE_RE.search(msg_lower) and _OWN_PRONOUN_RE.search(msg_lower))
                or (user_role == "LECTURER" and _TEACHING_RE.search(msg_lower) and _OWN_PRONOUN_RE.search(msg_lower))
            ):
                return self._result("data_query", "get_own_schedule", entities)

        if user_role == "STUDENT" and _GRADE_RE.search(msg_lower) and _OWN_PRONOUN_RE.search(msg_lower) and not _ATTENDANCE_RE.search(msg_lower):
            if entities.get("course_code"):
                return self._result("data_query", "get_detail_course_grade", entities)
            return self._result("data_query", "get_own_grades", entities)

        if user_role == "STUDENT" and _EXCEL_RE.search(msg_lower):
            return self._result("data_query", "excel_query", entities)

        if entities.get("class_name"):
            if _INFO_RE.search(msg_lower):
                return self._result("data_query", "get_class_info", entities)
            if _SCHEDULE_RE.search(msg_lower):
                return self._result("data_query", "get_class_schedule", entities)
            if _GRADE_RE.search(msg_lower) and not _ATTENDANCE_RE.search(msg_lower):
                return self._result("data_query", "get_full_grade_sheet", entities)
            if _LIST_RE.search(msg_lower) and ("sinh viên" in msg_lower or "sinh vien" in msg_lower or "enrollment" in msg_lower):
                tool_name = "get_enrollments_by_class" if user_role == "LECTURER" else "get_students_by_class"
                return self._result("data_query", tool_name, entities)

        if ("lớp" in msg_lower or "lop" in msg_lower) and entities.get("semester_code"):
            return self._result("data_query", "get_classes_by_semester", entities)

        if _CLASSMATE_RE.search(msg_lower) and entities.get("student_code"):
            return self._result("data_query", "get_classmates", entities)

        if user_role == "ACADEMIC_STAFF":
            if _WORKLOAD_RE.search(msg_lower) and entities.get("lecturer_code"):
                return self._result("data_query", "get_lecturer_workload", entities)
            if _EXPERTISE_RE.search(msg_lower):
                expertise = _extract_expertise(text)
                if expertise:
                    entities["expertise"] = expertise
                major_name = _extract_named_value(
                    text,
                    re.compile(
                        r"(?:bộ môn|bo mon|ngành|nganh)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?=$|[,.!?]|\s+(?:thuộc|thuoc|đang|dang|hiện|hien|có|co)\b)",
                        re.IGNORECASE,
                    ),
                )
                if major_name:
                    entities["major_name"] = major_name
                    entities.setdefault("department", major_name)
                return self._result("data_query", "get_lecturers_by_expertise", entities)
            if ("giảng viên" in msg_lower or "giang vien" in msg_lower) and _MAJOR_RE.search(msg_lower):
                major_name = _extract_major_name(text)
                if major_name:
                    entities["major_name"] = major_name
                return self._result("data_query", "get_lecturers_by_major", entities)
            if (_SCHEDULE_RE.search(msg_lower) or "lịch học của sinh viên" in msg_lower) and entities.get("student_code"):
                return self._result("data_query", "get_other_student_schedule", entities)
            if (_SCHEDULE_RE.search(msg_lower) or "lịch của giảng viên" in msg_lower) and entities.get("lecturer_code"):
                return self._result("data_query", "get_other_lecturer_schedule", entities)
            if ("mã ngành" in msg_lower or "ma nganh" in msg_lower) and _MAJOR_RE.search(msg_lower):
                major_name = _extract_major_name(text) or _extract_named_value(
                    text,
                    re.compile(r"(?:của|cua)?\s*([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+)$", re.IGNORECASE),
                )
                if major_name:
                    entities["major_name"] = major_name
                return self._result("data_query", "get_major_id_by_name", entities)
            if _AT_RISK_RE.search(msg_lower):
                major_name = _extract_major_name(text)
                if major_name:
                    entities["major_name"] = major_name
                return self._result("data_query", "get_students_at_risk", entities)
            if _STANDING_RE.search(msg_lower) and entities.get("student_code"):
                return self._result("data_query", "get_student_academic_standing", entities)
            if ("sinh viên" in msg_lower or "sinh vien" in msg_lower) and _MAJOR_RE.search(msg_lower):
                major_name = _extract_major_name(text)
                if major_name:
                    entities["major_name"] = major_name
                return self._result("data_query", "get_students_by_major", entities)
            if _TOP_RE.search(msg_lower):
                return self._result("data_query", "get_top_students", entities)
            if _NOTIFICATION_RE.search(msg_lower) and _LIST_RE.search(msg_lower):
                return self._result("data_query", "list_notifications", entities)

        if _COMPONENT_RE.search(msg_lower):
            entities.setdefault("course_name", _extract_course_name(text))
            return self._result("data_query", "get_grade_components_by_course", entities)

        if _COURSE_RE.search(msg_lower):
            sub_spec_name = _extract_sub_specialization_name(text)
            if sub_spec_name:
                entities["sub_specialization_name"] = sub_spec_name
                return self._result("data_query", "get_courses_by_sub_spec", entities)

            spec_name = _extract_specialization_name(text)
            if spec_name and not _SUB_SPEC_RE.search(msg_lower):
                entities["specialization_name"] = spec_name
                return self._result("data_query", "get_courses_by_spec", entities)

            if _MAJOR_RE.search(msg_lower):
                major_name = _extract_major_name(text)
                if major_name:
                    entities["major_name"] = major_name
                    return self._result("data_query", "get_courses_by_spec", entities)

            entities.setdefault("course_name", _extract_course_name(text))
            if entities.get("course_code") or entities.get("course_name") or _INFO_RE.search(msg_lower):
                return self._result("data_query", "get_courses_by_name", entities)

        if _SUB_SPEC_RE.search(msg_lower) and _SPEC_RE.search(msg_lower):
            spec_name = _extract_specialization_name(text)
            if spec_name:
                entities["specialization_name"] = spec_name
            return self._result("data_query", "get_sub_specializations", entities)

        if _SPEC_RE.search(msg_lower) and _MAJOR_RE.search(msg_lower) and not _SUB_SPEC_RE.search(msg_lower):
            major_name = _extract_major_name(text)
            if major_name:
                entities["major_name"] = major_name
            return self._result("data_query", "get_specializations_by_major", entities)

        if user_role == "LECTURER":
            if _SLOT_SWAP_RE.search(msg_lower) or ("đổi" in msg_lower and "slot" in msg_lower):
                reason = _extract_reason(text)
                if reason:
                    entities["reason"] = reason
                return self._result("action", "create_schedule_request", entities)
            if ("điểm danh" in msg_lower or "diem danh" in msg_lower) and _UPDATE_RE.search(msg_lower):
                return self._result("action", "update_attendance_manually", entities)
            if "sinh viên" in msg_lower or "sinh vien" in msg_lower:
                if _AT_RISK_RE.search(msg_lower):
                    return self._result("data_query", "get_students_at_risk", entities)
                if entities.get("class_name"):
                    return self._result("data_query", "get_enrollments_by_class", entities)
                if entities.get("student_code"):
                    return self._result("data_query", "get_student_by_code", entities)

        if user_role == "STUDENT" and _COURSE_RE.search(msg_lower) and entities.get("course_code") and _GRADE_RE.search(msg_lower):
            return self._result("data_query", "get_detail_course_grade", entities)

        if entities.get("date") and _SLOT_QUERY_RE.search(msg_lower):
            return self._result("data_query", "get_slots_by_date", entities)

        if user_role == "STUDENT" and _MY_ID_RE.search(msg_lower):
            return self._result("knowledge_query", "fpt_tool", {"source": "fptu-information.json"})

        if user_role in {"STUDENT", "LECTURER"} and is_fptu_knowledge_question(text):
            return self._result("knowledge_query", "fpt_tool", {"source": "fptu-information.json"})

        return None

    @staticmethod
    def _result(intent: str, tool_name: str, entities: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return {
            "intent": intent,
            "toolName": tool_name,
            "entities": {key: value for key, value in (entities or {}).items() if value not in (None, "")},
            "confidence": "high",
            "agent": get_tool_agent(tool_name),
        }


trend_router = TrendRouter()
