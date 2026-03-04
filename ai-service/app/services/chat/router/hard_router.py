"""
router/hard_router.py
Stage 0 – Regex/LRU cache routing trước khi gọi LLM.

Tất cả pattern được compile một lần khi module load → O(1) per request.
Đồng bộ với tool list trong light_router.py và permissions.py.
"""
from __future__ import annotations

import re
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from loguru import logger

from config.settings import CACHE_CONFIG


# ── Data model ────────────────────────────────────────────────────────────────
@dataclass
class IntentResult:
    intent:        str
    tool_name:     Optional[str]       = None
    entities:      Dict[str, Any]      = field(default_factory=dict)
    action:        Optional[Dict]      = None
    answer:        Optional[str]       = None   # chỉ dùng cho intent=direct_response
    redirect_path: Optional[str]       = None


# ── Navigation patterns (exact match sau khi strip prefix) ───────────────────
# Format: (tool_name, regex_alternation)
_NAV_PATTERNS: list[tuple[str, str]] = [
    ("view_students",          r"(?:trang|mục|màn hình|danh sách)?\s*(?:sinh viên|sv|students)"),
    ("view_lecturers",         r"(?:trang|mục|màn hình|danh sách)?\s*(?:giảng viên|gv|lecturers)"),
    ("view_majors",            r"(?:trang|mục|màn hình|danh sách)?\s*(?:ngành học|ngành|quản lý ngành|majors)"),
    ("view_courses",           r"(?:trang|mục|màn hình|danh sách)?\s*(?:môn học|môn|courses)"),
    ("view_rooms",             r"(?:trang|mục|màn hình)?\s*(?:phòng học|phòng|rooms)"),
    ("view_semesters",         r"(?:trang|mục|màn hình)?\s*(?:học kỳ|kỳ|semesters)"),
    ("view_classes",           r"(?:trang|mục|màn hình|danh sách)?\s*(?:lớp học|lớp|classes)"),
    ("view_schedule",          r"(?:trang|mục|màn hình)?\s*(?:lịch học|lịch dạy|lịch cá nhân|thời khóa biểu)"),
    ("view_grades",            r"(?:trang|mục|màn hình|bảng)?\s*(?:điểm số|điểm|kết quả học tập|grades)"),
    ("view_timetable",         r"(?:trang|mục|màn hình)?\s*(?:thời khóa biểu tổng|lịch tổng|tkb tổng)"),
    ("view_users",             r"(?:trang|mục|màn hình)?\s*(?:quản lý người dùng|tài khoản|users)"),
    ("view_notifications",     r"(?:trang|mục|màn hình)?\s*thông báo"),
    ("view_profile",           r"(?:trang|mục|màn hình)?\s*(?:cá nhân|hồ sơ.*|profile)"),
    ("view_schedule_requests", r"(?:trang|mục|màn hình)?\s*(?:yêu cầu đổi lịch|đơn đổi lịch|requests)"),
    ("view_teaching_classes",  r"(?:trang|mục|màn hình)?\s*lớp đang dạy"),
    ("view_attendance_config", r"(?:trang|mục|màn hình)?\s*(?:cấu hình điểm danh|điểm danh)"),
    ("view_dashboard",         r"(?:trang|mục|màn hình)?\s*(?:bảng điều khiển|thống kê tổng|dashboard)"),
    ("view_logs",              r"(?:trang|mục|màn hình)?\s*(?:nhật ký hệ thống|logs)"),
    ("view_alerts",            r"(?:trang|mục|màn hình)?\s*(?:cảnh báo|alerts)"),
    ("view_wifi_aps",          r"(?:trang|mục|màn hình)?\s*(?:quản lý wifi|wifi|aps)"),
    ("view_exam_grades",       r"(?:trang|mục|màn hình)?\s*(?:điểm thi|exam grades)"),
    ("view_resit_grades",      r"(?:trang|mục|màn hình)?\s*(?:điểm thi lại|resit grades)"),
    ("view_assignments",       r"(?:trang|mục|màn hình)?\s*(?:bài tập|assignments)"),
    ("view_messages",          r"(?:trang|mục|màn hình)?\s*(?:tin nhắn|messages|chat)"),
    ("view_specializations",   r"(?:trang|mục|màn hình|danh sách)?\s*(?:chuyên ngành|specializations)"),
]
_NAV_COMPILED = [
    (tool, re.compile(rf"^(?:{kws})$", re.I | re.UNICODE))
    for tool, kws in _NAV_PATTERNS
]

# ── Entity-detection keywords (Nghi vấn có thực thể cần LLM trích xuất) ──────────
_ENTITY_KEYWORDS = [
    "hôm nay", "ngày mai", "tuần này", "tuần tới", "kỳ này", "kỳ sau",
    "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy", "chủ nhật",
    "tháng", "ngày", "lớp", "môn", "phòng", "sv", "gv", "sinh viên", "giảng viên"
]
_ENTITY_RE = re.compile(rf"\b({'|'.join(_ENTITY_KEYWORDS)})\b", re.I)

# ── Shortcut patterns ─────────────────────────────────────────────────────────
# Format: (tool_name, pattern_str, entity_key_or_None)
_SHORTCUT_DEFS: list[tuple[str, str, Optional[str]]] = [

    # ── Defer complex actions to LLM (cần extract params) ──────────────────
    ("_defer", r"(?:gửi|tạo|soạn)\s+(?:thông báo|email|tin nhắn)"
               r"|(?:thông báo cho|nhắn tin cho|email cho)"
               r"|(?:tạo|thêm)\s+(?:người dùng|tài khoản|user|sv mới|gv mới)"
               r"|(?:vô hiệu hóa|khóa|xóa|kích hoạt)\s+(?:tài khoản|user|người dùng)"
               r"|(?:tạo|thêm|xóa|cập nhật)\s+(?:lớp|class|môn học|ngành|học kỳ|phòng|chuyên ngành)"
               r"|thêm\s+(?:sv|sinh viên)\s+\S+\s+vào\s+(?:lớp|class)"
               r"|(?:duyệt|từ chối)\s+(?:yêu cầu|request)",
     None),

    # ── Personal schedule / grades / attendance / notifications ─────────────
    ("get_my_schedule_requests",
     r"request của tôi|yêu cầu đổi lịch của tôi|các request tôi đã tạo"
     r"|lịch sử request của tôi|trạng thái.*yêu cầu.*đổi lịch.*của tôi",
     None),

    ("get_own_schedule",
     r"lịch của (?:tôi|em|mình)|lịch (?:học|dạy|cá nhân) của (?:tôi|em|mình)"
     r"|danh sách môn học (?:của tôi|của em|tôi học|em học|kỳ này)"
     r"|hôm nay (?:tôi|em) học (?:gì|ở đâu)|hôm nay (?:tôi|em) dạy (?:gì|ở đâu)"
     r"|tuần này (?:tôi|em) (?:học|dạy) gì",
     None),

    ("get_own_grades",
     r"điểm của (?:tôi|em|mình)|bảng điểm.* của (?:tôi|em|mình)|bảng điểm (?:tôi|em|mình)"
     r"|điểm (?:tôi|em|mình)|xem điểm của em|điểm môn của (?:tôi|em|mình)"
     r"|gpa|điểm trung bình",
     None),

    ("get_my_notifications",
     r"thông báo của tôi|thông báo mới|có thông báo gì"
     r"|tb của em|thông báo của em|có thông báo mới nào"
     r"|có thông báo nào mới không|tôi có thông báo",
     None),

    ("get_my_attendance_status",
     r"điểm danh của (?:tôi|em|mình)|tôi đã điểm danh chưa|trạng thái điểm danh của (?:tôi|em|mình)"
     r"|em đã điểm danh chưa|điểm danh slot vừa rồi",
     None),

    ("get_attendance_report_by_student",
     r"tỉ lệ vắng|tỷ lệ nghỉ|phần trăm vắng|báo cáo điểm danh của (?:tôi|em|mình)",
     None),

    # ── Data shortcuts (no entity) ──────────────────────────────────────────
    ("list_majors",
     r"(?:danh sách|liệt kê|show|list)\s*(?:ngành|các ngành|ngành học)|có những ngành nào|kể tên các ngành",
     None),

    ("get_top_students",
     r"top sinh viên|top gpa|sv xuất sắc|top 10 sv|sinh viên giỏi nhất",
     None),

    ("list_courses",
     r"(?:danh sách|liệt kê|show|list)\s*(?:môn học|môn|courses)|có những môn nào|kể tên các môn",
     None),

    ("list_semesters",
     r"(?:danh sách|liệt kê|show|list)\s*(?:học kỳ|kỳ|semesters)|có những học kỳ nào",
     None),

    ("list_notifications",
     r"(?:danh sách|liệt kê|show|list)\s*(?:thông báo|thanh báo)|có thông báo mới nào không",
     None),

    ("get_empty_rooms",
     r"phòng nào trống|tìm phòng trống|phòng học trống|danh sách phòng trống",
     None),

    ("get_students_without_class",
     r"sv chưa có lớp|sinh viên chưa có lớp|sinh viên chưa được xếp lớp",
     None),

    ("get_active_semester",
     r"học kỳ hiện tại|học kỳ đang diễn ra|kỳ này là kỳ mấy|semester hiện tại",
     None),

    ("get_students_at_risk",
     r"sv nguy cơ|sinh viên có nguy cơ|sv gpa thấp|sinh viên có thể bị đúp"
     r"|sv vắng nhiều|sinh viên học yếu",
     None),

    ("get_abnormal_attendance",
     r"điểm danh bất thường|điểm danh đáng ngờ|log điểm danh lạ"
     r"|điểm danh gian lận|quét nhanh|sai vị trí",
     None),

    # ── Lookup by code (entity extracted from group 1) ──────────────────────
    ("get_student_by_code",
     r"(?:thông tin|chi tiết|tìm|xem|tra cứu)\s+"
     r"(?:sv|sinh viên)\s+"
     r"(?:mã\s+số|có mã|với mã|mã|code\s*:?)\s*"
     r"([A-Z]{2}[A-Z0-9]{1,})",
     "student_code"),

    ("get_lecturer_by_code",
     r"(?:thông tin|chi tiết|tìm|xem|tra cứu)\s+"
     r"(?:sv|sinh viên|gv|giảng viên|giáo viên|thầy|cô)\s+"
     r"(?:mã\s+số|có mã|với mã|mã|code\s*:?)\s*"
     r"([A-Z]{2}[A-Z0-9]{1,})",
     "lecturer_code"),

    ("get_other_student_schedule",
     r"(?:lịch học|lịch|tkb)\s+"
     r"(?:của |cho )?"
     r"(?:sv |sinh viên |bạn )?"
     r"(?:mã số?|có mã|với mã|mã|code\s*:?|mã số?\s*:?)\s*"
     r"([A-Z0-9]{3,})",
     "code"),

    ("get_other_lecturer_schedule",
     r"(?:lịch dạy|lịch giảng|lịch)\s+"
     r"(?:của |cho )?"
     r"(?:gv |giảng viên |giáo viên |thầy |cô )?"
     r"(?:mã số?|có mã|với mã|mã|code\s*:?|mã số?\s*:?)\s*"
     r"([A-Z0-9]{3,})",
     "lecturer_code"),

    # ── Name-based search ───────────────────────────────────────────────────
    ("search_user_by_name",
     r"(?:thông tin|chi tiết|tìm|xem|tra cứu)\s+"
     r"(?:sv|sinh viên|gv|giảng viên|thầy|cô|bạn|người dùng)\s+"
     r"(?:tên |là )?"
     r"([A-ZÀ-Ỹa-zà-ỹ][A-ZÀ-Ỹa-zà-ỹ\s]{1,})",
     "full_name"),

    ("get_other_lecturer_schedule",
     r"(?:thầy|cô|giảng viên|giáo viên|gv)\s+"
     r"([A-ZÀ-Ỹa-zà-ỹ][A-ZÀ-Ỹa-zà-ỹ\s]{1,})"
     r"\s+(?:dạy ở đâu|dạy lớp nào|lịch dạy|lịch giảng|có lịch)",
     "full_name"),

    ("get_other_student_schedule",
     r"(?:sv|sinh viên|bạn)\s+"
     r"([A-ZÀ-Ỹa-zà-ỹ][A-ZÀ-Ỹa-zà-ỹ\s]{1,})"
     r"\s+(?:học ở đâu|học lớp nào|lịch học|có lịch)",
     "full_name"),

    # ── Semester / class lookup ─────────────────────────────────────────────
    ("get_classes_by_semester",
     r"(?:lớp|classes)\s+(?:trong|của|học kỳ)\s+(.+)",
     "semester_name"),

    # ── Class-based queries ─────────────────────────────────────────────────
    ("get_class_schedule",
     r"(?:lớp|class)\s+([A-Z0-9]{2,}(?:\s*[A-Z0-9]+)?)"
     r"\s+(?:học|lịch|phòng|tkb|thời khóa biểu)",
     "class_name"),

    ("get_students_by_class",
     r"(?:danh sách|ds)\s+"
     r"(?:sv |sinh viên )?(?:của |trong |lớp |class )?"
     r"([A-Z][A-Z0-9]{2,}(?:[\-\s][A-Z0-9]+)?)",
     "class_name"),

    ("get_attendance_stats_by_class",
     r"thống kê điểm danh\s+(?:lớp|class)\s+([A-Z0-9]{2,})",
     "class_name"),

    ("get_attendance_by_slot",
     r"điểm danh\s+(?:lớp|slot|buổi)\s+([A-Z0-9]{2,})",
     "class_name"),

    ("get_grade_report_by_class",
     r"bảng điểm\s+(?:lớp|class)\s+([A-Z0-9]{2,})",
     "class_name"),

    # ── Course-based queries ────────────────────────────────────────────────
    ("get_courses_by_name",
     r"(?:thông tin|chi tiết|tìm)\s+(?:môn học|môn|course)\s+(.+)",
     "course_name"),

    ("get_grade_components_by_course",
     r"(?:cấu trúc điểm|thang điểm|điểm thành phần)\s+(?:môn|course)?\s+(.+)",
     "course_name"),

    ("get_courses_by_spec",
     r"(?:môn học|môn)\s+(?:của|thuộc)\s+chuyên ngành\s+(.+)",
     "specialization_name"),

    # ── Specialization queries ──────────────────────────────────────────────
    ("get_specializations_by_major",
     r"(?:chuyên ngành|specialization)\s+(?:của |thuộc )(?:ngành )?(.+)",
     "major_name"),

    ("get_sub_specializations",
     r"(?:chuyên ngành hẹp|sub.spec)\s+(?:của |thuộc )?(.+)",
     "specialization_name"),

    # ── Student stats ───────────────────────────────────────────────────────
    ("count_students_by_major",
     r"(?:bao nhiêu|số lượng|thống kê)\s+(?:sv|sinh viên)\s+"
     r"(?:ngành|theo ngành|đang theo học)\s+(.+)",
     "major_name"),

    ("get_students_by_major",
     r"(?:sv|sinh viên)\s+(?:ngành|của ngành|theo ngành)\s+(.+)",
     "major_name"),

    ("get_lecturers_by_major",
     r"(?:gv|giảng viên)\s+(?:ngành|của ngành|thuộc ngành)\s+(.+)",
     "major_name"),

    ("get_lecturers_by_expertise",
     r"(?:gv|giảng viên)\s+(?:chuyên môn|expertise|chuyên về)\s+(.+)",
     "expertise"),

    ("get_attendance_report_by_student",
     r"báo cáo điểm danh\s+(?:sv|sinh viên|của)\s+(.+)",
     "student_code"),

    ("get_detail_course_grade",
     r"điểm chi tiết\s+(?:môn|course)?\s+(.+)",
     "course_name"),
]

# Compile shortcuts
_SHORTCUTS: list[tuple[str, re.Pattern, Optional[str]]] = [
    (tool, re.compile(pattern, re.I | re.UNICODE), entity)
    for tool, pattern, entity in _SHORTCUT_DEFS
]

# ── Fallback: bare user code ──────────────────────────────────────────────────
_CODE_RE = re.compile(r"\b(SE\d{3,}|GV\d{3,}|AD\d{3,}|AS\d{3,})\b", re.I)

# ── Clarification for ambiguous bare terms ───────────────────────────────────
_CLARIFICATIONS: dict[str, str] = {
    "chuyên ngành":      "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: Công nghệ thông tin, Quản trị kinh doanh...)",
    "specialization":    "Bạn muốn xem chuyên ngành của **ngành học** nào?",
    "chuyên ngành hẹp":  "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào? (Ví dụ: Kỹ thuật phần mềm, Hệ thống thông tin...)",
    "sub-specialization":"Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào?",
    "ngành học":         "Bạn muốn xem thông tin của **ngành học** nào?",
    "ngành":             "Bạn muốn xem thông tin của **ngành học** nào?",
    "điểm":              "Bạn muốn xem điểm của **môn học** nào, hay toàn bộ bảng điểm?",
    "lịch":              "Bạn muốn xem lịch của **lớp** nào, hay **lịch cá nhân** của bạn?",
}

# ── Direct text responses (greeting, etc.) ───────────────────────────────────
_TEXT_RESPONSES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\b(hi|hello|xin chào|chào|hey)\b", re.I),
     "Xin chào! Tôi là FAMS AI Assistant. Tôi có thể giúp gì cho bạn hôm nay? 😊"),
    (re.compile(r"\b(tạm biệt|bye|goodbye)\b", re.I),
     "Hẹn gặp lại! Chúc bạn một ngày tốt lành."),
    (re.compile(r"\b(cảm ơn|thanks|thank you|camon)\b", re.I),
     "Không có gì! Rất vui được giúp bạn."),
    (re.compile(r"\b(bạn là ai|who are you|em là ai)\b", re.I),
     "Tôi là FAMS AI Assistant – trợ lý thông minh của hệ thống quản lý đào tạo FAMS. "
     "Tôi có thể tra cứu lịch học, điểm số, danh sách lớp và nhiều thông tin khác!"),
    (re.compile(r"\b(bạn có thể làm gì|help|giúp tôi|hướng dẫn|tôi cần gì)\b", re.I),
     "Tôi có thể giúp bạn:\n"
     "• Tra cứu lịch học/dạy, điểm số, điểm danh\n"
     "• Tìm kiếm sinh viên, giảng viên, môn học\n"
     "• Xem thông tin ngành, chuyên ngành, học kỳ\n"
     "• Phân tích file Excel đã tải lên\n"
     "Hãy hỏi tôi bất cứ điều gì!"),
]

# ── Prefix strips (chỉ strip các từ vô nghĩa, không strip intent) ───────────
_STRIP_PREFIXES = (
    "cho tôi ", "cho xem ", "cho biết ", "hãy ", "vui lòng ",
    "xem ", "mở trang ", "mở ", "vào trang ", "vào ",
    "đi đến ", "nhảy tới ", "tới trang ", "bảng ",
)


def _is_action(tool: str) -> bool:
    return tool.startswith(("create_", "update_", "delete_", "send_",
                             "approve_", "reject_", "assign_", "activate_",
                             "add_", "remove_", "publish_", "export_",
                             "import_", "update_"))


class HardRouter:
    """Stage 0 – O(1) regex/cache routing."""

    def __init__(self) -> None:
        self._cache: OrderedDict[str, IntentResult] = OrderedDict()

    def route(self, message: str, user_role: str) -> Optional[IntentResult]:
        # 1. LRU cache
        if cached := self._cache.get(message):
            self._cache.move_to_end(message)
            return cached

        # 2. Normalize and check for prefixes
        msg_lower = message.lower().strip()
        msg_core  = self._strip_prefixes(msg_lower)
        had_prefix = (msg_lower != msg_core)

        # 3. If no prefix and it's a bare ambiguous term -> Clarification first
        if not had_prefix:
            if clue := _CLARIFICATIONS.get(msg_core):
                return IntentResult(intent="direct_response", answer=clue)

        # 4. Exact navigation match
        for tool, pattern in _NAV_COMPILED:
            if pattern.match(msg_core):
                return IntentResult(intent="navigation", tool_name=tool)

        # 5. Clarification for terms that HAD a prefix but didn't match nav (rare)
        # or terms that didn't match anything else.
        if clue := _CLARIFICATIONS.get(msg_core):
             return IntentResult(intent="direct_response", answer=clue)

        # 6. Shortcut patterns
        for tool, pattern, entity_key in _SHORTCUTS:
            m = pattern.search(msg_lower)
            if not m:
                continue

            # Defer complex actions → LLM extract params
            if tool == "_defer":
                logger.debug("[HardRouter] deferred to LLM (action keyword)")
                return None

            actual_tool, entities = self._resolve(tool, entity_key, m)
            intent = "action" if _is_action(actual_tool) else "data_query"
            return IntentResult(
                intent    = intent,
                tool_name = actual_tool,
                entities  = entities,
                action    = {"type": actual_tool.upper(), "params": entities} if intent == "action" else None,
            )

        # 6. Smart Defer: Nếu chứa từ khóa thực thể phức tạp (và KHÔNG khớp shortcut/nav) -> chuyển LLM
        if _ENTITY_RE.search(msg_lower):
            # Nếu tin nhắn dài và có từ khóa thực thể -> defer
            if len(msg_lower.split()) > 1:
                logger.debug(f"[HardRouter] smart defer: complexity detected in '{message}'")
                return None

        # 7. Fallback: bare user code (SE/GV prefix)
        if cm := _CODE_RE.search(msg_lower):
            code = cm.group(1).upper()
            if code.startswith("SE"):
                return IntentResult(
                    intent="data_query", tool_name="get_student_by_code",
                    entities={"student_code": code, "code": code},
                )
            if code.startswith("GV"):
                return IntentResult(
                    intent="data_query", tool_name="get_lecturer_by_code",
                    entities={"lecturer_code": code, "code": code},
                )

        # 6. Direct text responses (greeting, etc.)
        for pattern, answer in _TEXT_RESPONSES:
            if pattern.search(msg_lower):
                result = IntentResult(intent="direct_response", answer=answer)
                self._cache_set(message, result)
                return result

        return None  # → LLM

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _strip_prefixes(text: str) -> str:
        changed = True
        while changed:
            changed = False
            for p in _STRIP_PREFIXES:
                if text.startswith(p):
                    text = text[len(p):].strip()
                    changed = True
        return text

    @staticmethod
    def _resolve(tool: str, entity_key: Optional[str], match: re.Match) -> tuple[str, dict]:
        entities: dict[str, Any] = {}
        actual = tool

        if entity_key and match.lastindex:
            raw       = match.group(1).strip()
            has_space = bool(re.search(r"\s", raw))
            is_code   = not has_space and raw.replace("-", "").isalnum()

            if is_code:
                entities[entity_key] = raw.upper()
                # Đảm bảo "code" key luôn có mặt cho schedule lookups
                if entity_key in ("student_code", "lecturer_code", "code"):
                    entities["code"] = raw.upper()
            else:
                # Có khoảng trắng / dấu → là tên người → dùng search_user_by_name
                if entity_key in ("student_code", "lecturer_code", "code", "full_name"):
                    actual = "search_user_by_name"
                    entities["full_name"] = raw
                else:
                    entities[entity_key] = raw

        return actual, entities

    def _cache_set(self, key: str, value: IntentResult) -> None:
        self._cache[key] = value
        if len(self._cache) > CACHE_CONFIG.max_size:
            self._cache.popitem(last=False)


hard_router = HardRouter()