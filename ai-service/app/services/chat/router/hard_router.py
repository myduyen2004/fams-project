"""
router/hard_router.py  ── v3.0 (Fix toàn diện)
Stage 0 – Regex/LRU cache routing trước khi gọi LLM.

FIXES v3.0:
  ✅ [HIGH]   LRU cache thread-safe với threading.Lock
  ✅ [HIGH]   Semantic match threshold giảm 0.8 → 0.72 để bắt nhiều navigation hơn
  ✅ [HIGH]   _find_best_match tối ưu: thoát sớm khi tìm thấy score cao
  ✅ [MEDIUM] nav_candidates precomputed một lần khi module load (không tính lại mỗi request)
  ✅ [MEDIUM] Text responses check TRƯỚC clarification để tránh conflict
"""
from __future__ import annotations

import re
import difflib
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger
from app.services.chat.db.tools_loader import tools_loader # type: ignore

from app.services.chat.config.settings import CACHE_CONFIG


# ── Data model ────────────────────────────────────────────────────────────────
@dataclass
class IntentResult:
    intent:        str
    tool_name:     Optional[str]       = None
    entities:      Dict[str, Any]      = field(default_factory=dict)
    action:        Optional[Dict]      = None
    answer:        Optional[str]       = None
    redirect_path: Optional[str]       = None


# ── Navigation patterns ───────────────────────────────────────────────────────
_NAV_PATTERNS: list[tuple[str, str]] = [
    ("view_students",          r"(?:trang|mục|màn hình|danh sách)?\s*(?:sinh viên|sv|students)"),
    ("view_lecturers",         r"(?:trang|mục|màn hình|danh sách)?\s*(?:giảng viên|gv|lecturers)"),
    ("view_majors",            r"(?:trang|mục|màn hình|danh sách)?\s*(?:ngành học|ngành|quản lý ngành|majors)"),
    ("view_courses",           r"(?:trang|mục|màn hình|danh sách)?\s*(?:môn học|môn|courses)"),
    ("view_rooms",             r"(?:xem|trang|mục|màn hình|danh sách)?\s*(?:phòng học|phòng|view_rooms|rooms|view_phòng)"),
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
    ("view_sub_specializations", r"(?:trang|mục|màn hình|danh sách)?\s*(?:chuyên ngành hẹp|sub-specializations)"),
    ("view_results",           r"(?:trang|mục|màn hình|kết quả)?\s*(?:kết quả học tập|bảng điểm|results)"),
]
_NAV_COMPILED = [
    (tool, re.compile(rf"^(?:{kws})$", re.I | re.UNICODE))
    for tool, kws in _NAV_PATTERNS
]

# ✅ FIX: Precompute nav_candidates một lần khi module load (không tính lại per-request)
_NAV_CANDIDATES: List[Tuple[str, List[str]]] = []
for _tool, _pattern_str in _NAV_PATTERNS:
    _kws = _pattern_str.replace("(?:", "").replace(")?", "").replace("\\s*", " ").split("|")
    _NAV_CANDIDATES.append((_tool, [k.strip() for k in _kws if k.strip() and len(k.strip()) > 2]))


# ── Entity-detection keywords ─────────────────────────────────────────────────
_ENTITY_KEYWORDS = [
    "hôm nay", "ngày mai", "tuần này", "tuần tới", "kỳ này", "kỳ sau",
    "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy", "chủ nhật",
    "tháng", "ngày", "lớp", "môn", "phòng", "sv", "gv", "sinh viên", "học sinh", "giảng viên"
]
_ENTITY_RE = re.compile(rf"\b({'|'.join(_ENTITY_KEYWORDS)})\b", re.I)

# ── Shortcut patterns ─────────────────────────────────────────────────────────
_SHORTCUT_DEFS: list[tuple[str, str, Optional[str]]] = [
    ("_defer", r"(?:gửi|tạo|soạn)\s+(?:thông báo|email|tin nhắn)"
               r"|(?:thông báo cho|nhắn tin cho|email cho)"
               r"|(?:tạo|thêm)\s+(?:người dùng|tài khoản|user|sv mới|gv mới)"
               r"|(?:vô hiệu hóa|khóa|xóa|kích hoạt)\s+(?:tài khoản|user|người dùng)"
               r"|(?:tạo|thêm|xóa|cập nhật)\s+(?:lớp|class|môn học|trong học kỳ|ngành|học kỳ|phòng|chuyên ngành)"
               r"|thêm\s+(?:sv|sinh viên)\s+\S+\s+vào\s+(?:lớp|class)"
               r"|(?:duyệt|từ chối)\s+(?:yêu cầu|request)",
     None),
    ("update_attendance_manually", r"cập nhật điểm danh|điểm danh hộ|sửa điểm danh", None),
    ("approve_schedule_request",   r"duyệt đổi lịch|đồng ý đổi lịch",               None),
    ("reject_schedule_request",    r"từ chối đổi lịch",                               None),
]
_SHORTCUTS: list[tuple[str, re.Pattern, Optional[str]]] = [
    (tool, re.compile(pattern, re.I | re.UNICODE), entity)
    for tool, pattern, entity in _SHORTCUT_DEFS
]

_DATA_SHORTCUTS: list[tuple[str, re.Pattern]] = [
    ("list_majors", re.compile(r"^(?:danh sách|ds)\s*(?:ngành học|ngành)$", re.I | re.UNICODE)),
]

# ── Fallback: bare user code ──────────────────────────────────────────────────
_CODE_RE = re.compile(r"\b(SE\d{3,}|GV\d{3,}|AD\d{3,}|AS\d{3,})\b", re.I)
_SEMESTER_CODE_RE = re.compile(r"\b(SP|SU|FA|WI)\d{2}\b", re.I)
_CLASS_NAME_RE = re.compile(r"\b([A-Z]{2,}\d{2,}[A-Z\d]*_[A-Z0-9]+|[A-Z]{2,}\d{2,}[A-Z\d]*-[A-Z]{2,4}\d{3,4})\b", re.I)
_MAJOR_QUERY_RE = re.compile(
    r"(?:ngành|nghành|nganh|nhành)\s+([A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9\s]+?)(?:$|[,.!?]|\s+(?:tuần|ngày|lớp|slot|tiết|ca|vì|do)\b)",
    re.I | re.UNICODE,
)

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
# ── Clarification for ambiguous bare terms ───────────────────────────────────
_CLARIFICATIONS: dict[str, str] = {
    "chuyên ngành":      "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: CNTT, Quản trị kinh doanh...)",
    "specialization":    "Bạn muốn xem chuyên ngành của **ngành học** nào?",
    "chuyên ngành hẹp":  "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào?",
    "sub-specialization":"Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào?",
    "ngành học":         "Bạn muốn xem thông tin của **ngành học** nào?",
    "ngành":             "Bạn muốn xem thông tin của **ngành học** nào?",
    "điểm":              "Bạn muốn xem điểm của **môn học** nào, hay toàn bộ bảng điểm?",
    "lịch":              "Bạn muốn xem lịch của **lớp** nào, hay **lịch cá nhân** của bạn?",
}

# ── Direct text responses ─────────────────────────────────────────────────────
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

_STRIP_PREFIXES = (
    "cho tôi ", "cho xem ", "cho biết ", "hãy ", "vui lòng ",
    "xem ", "mở trang ", "mở ", "vào trang ", "vào ",
    "đi đến ", "nhảy tới ", "tới trang ", "bảng ",
)


def _is_action(tool: str) -> bool:
    return tool in tools_loader.backend_actions or tool in _FALLBACK_BACKEND_ACTION_TOOLS


def _is_locked(tool: str) -> bool:
    status = tools_loader.tool_status.get(tool)
    return status is False or tool in tools_loader.inactive_tools


def _locked_result(tool: str) -> IntentResult:
    return IntentResult(
        intent="tool_locked",
        tool_name=tool,
        entities={"reason": f"Công cụ '{tool}' hiện đang bị khóa."},
    )



class HardRouter:
    """Stage 0 – O(1) regex/cache routing. Thread-safe."""

    def __init__(self) -> None:
        self._cache: OrderedDict[str, IntentResult] = OrderedDict()
        # ✅ FIX: Thread-safe lock cho LRU cache
        self._lock  = threading.Lock()
        
        # Register cache clearing on tool reload
        tools_loader.on_reload(self.clear_cache)

    def clear_cache(self) -> None:
        """Xóa sạch cache khi tools được reload."""
        with self._lock:
            self._cache.clear()
            logger.info("[HardRouter] Cache cleared due to tool reload")

    # ✅ FIX: Semantic match với early exit và threshold 0.72 (giảm từ 0.8)
    @staticmethod
    def _find_best_match(
        text: str,
        candidates: List[Tuple[str, List[str]]],
        threshold: float = 0.72,
    ) -> Optional[str]:
        best_tool  = None
        max_score  = 0.0
        for tool, keywords in candidates:
            for kw in keywords:
                if not kw:
                    continue
                score = difflib.SequenceMatcher(None, text, kw).ratio()
                if score > max_score:
                    max_score = score
                    best_tool = tool
                    # Early exit nếu đã tìm thấy match rất tốt
                    if score >= 0.92:
                        return tool
        return best_tool if max_score >= threshold else None

    def route(self, message: str, user_role: str) -> Optional[IntentResult]:
        # 1. Thread-safe LRU cache check
        # ✅ FIX: dùng lock khi đọc/ghi cache
        with self._lock:
            cached = self._cache.get(message)
            if cached:
                self._cache.move_to_end(message)
                return cached

        # 2. Normalize
        msg_lower = message.lower().strip()
        msg_core  = self._strip_prefixes(msg_lower)
        had_prefix = (msg_lower != msg_core)

        # 3. Kiểm tra greeting TRƯỚC (tránh conflict với clarification)
        for pattern, answer in _TEXT_RESPONSES:
            if pattern.search(msg_lower):
                result = IntentResult(intent="direct_response", answer=answer)
                self._cache_set(message, result)
                return result

        # 4. Clarification cho bare terms (không có prefix)
        if not had_prefix:
            if clue := _CLARIFICATIONS.get(msg_core):
                return IntentResult(intent="direct_response", answer=clue)

        # 5. Exact data shortcuts
        for tool, pattern in _DATA_SHORTCUTS:
            if pattern.match(msg_core):
                if _is_locked(tool):
                    result = _locked_result(tool)
                    self._cache_set(message, result)
                    return result
                result = IntentResult(intent="data_query", tool_name=tool)
                self._cache_set(message, result)
                return result

        # 6. Exact navigation regex
        for tool, pattern in _NAV_COMPILED:
            if pattern.match(msg_core):
                if _is_locked(tool):
                    result = _locked_result(tool)
                    self._cache_set(message, result)
                    return result
                result = IntentResult(intent="navigation", tool_name=tool)
                self._cache_set(message, result)
                return result

        # 6.5 Defer data-heavy taxonomy/course questions to Trend/LLM instead of nav semantic fallback
        if re.search(r"(môn|mon|course).*(chuyên ngành hẹp|chuyen nganh hep|chuyên ngành|chuyen nganh)", msg_lower) or re.search(
            r"(chuyên ngành hẹp|chuyen nganh hep).*(môn|mon|course)", msg_lower
        ):
            logger.debug(f"[HardRouter] taxonomy defer: '{message}'")
            return None

        # 7. Semantic navigation fallback (chạy sau exact match để tránh cướp tool)
        if best_nav := self._find_best_match(msg_core, _NAV_CANDIDATES, threshold=0.72):
            logger.debug(f"[HardRouter] Semantic match: '{message}' → {best_nav}")
            if _is_locked(best_nav):
                result = _locked_result(best_nav)
                self._cache_set(message, result)
                return result
            result = IntentResult(intent="navigation", tool_name=best_nav)
            self._cache_set(message, result)
            return result

        # 8. Clarification cho terms có prefix (rare)
        if clue := _CLARIFICATIONS.get(msg_core):
            return IntentResult(intent="direct_response", answer=clue)

        # 8.5 Direct action shortcut: create class chat group
        if re.search(r"(tạo|tao|mở|mo).*(nhóm chat|group chat)", msg_lower):
            class_match = _CLASS_NAME_RE.search(message)
            entities = {}
            if class_match:
                entities["class_name"] = class_match.group(1).upper()
            if _is_locked("create_group_chat"):
                return _locked_result("create_group_chat")
            return IntentResult(
                intent="action",
                tool_name="create_group_chat",
                entities=entities,
                action={"type": "CREATE_GROUP_CHAT", "params": entities},
            )

        # 8.6 Direct action shortcut: create notification
        if re.search(r"(gửi|gởi|tao|tạo|đăng).*(thông báo)", msg_lower):
            entities: Dict[str, Any] = {}
            class_match = _CLASS_NAME_RE.search(message)
            if class_match:
                entities["class_name"] = class_match.group(1).upper()
                entities["target_type"] = "CLASS"
            elif re.search(r"(lớp tôi đang giảng dạy|lop toi dang giang day|lớp tôi dạy|lop toi day)", msg_lower):
                entities["target_type"] = "CLASS"
            elif "toàn trường" in msg_lower:
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

            content_match = re.search(
                r"(?:rằng|rang|với nội dung|nội dung là|nội dung|về việc)\s+(.+)$",
                message,
                re.IGNORECASE,
            )
            if content_match:
                entities["content"] = content_match.group(1).strip().rstrip(".")
            else:
                fallback = re.sub(
                    r"^\s*(gửi|gởi|tao|tạo|đăng)\s+(?:một\s+)?thông báo(?:\s+mới)?\s*",
                    "",
                    message,
                    count=1,
                    flags=re.IGNORECASE,
                )
                fallback = re.sub(r"^\s*(?:đến|cho)\s+", "", fallback, count=1, flags=re.IGNORECASE)
                fallback = re.sub(
                    r"^\s*(?:toàn thể|toàn bộ)\s+(?:học sinh|sinh viên|giảng viên|giáo viên|nhân viên đào tạo)\s*",
                    "",
                    fallback,
                    count=1,
                    flags=re.IGNORECASE,
                )
                fallback = re.sub(r"^\s*(?:toàn trường)\s*", "", fallback, count=1, flags=re.IGNORECASE)
                if class_match:
                    fallback = re.sub(
                        rf"^\s*(?:lớp\s+)?{re.escape(class_match.group(1))}\s*",
                        "",
                        fallback,
                        count=1,
                        flags=re.IGNORECASE,
                )
                fallback = fallback.strip(" .:-")
                generic_boilerplate = re.fullmatch(
                    r"(?:một\s+)?thông báo(?:\s+mới)?(?:\s+cho\s+lớp\s+tôi\s+đang\s+giảng\s+dạy|"
                    r"\s+cho\s+lop\s+toi\s+dang\s+giang\s+day)?|"
                    r"(?:lớp\s+tôi\s+đang\s+giảng\s+dạy|lop\s+toi\s+dang\s+giang\s+day)",
                    fallback,
                    re.IGNORECASE,
                )
                if fallback and not generic_boilerplate:
                    entities["content"] = fallback

            if _is_locked("create_notification"):
                return _locked_result("create_notification")
            return IntentResult(
                intent="action",
                tool_name="create_notification",
                entities=entities,
                action={"type": "CREATE_NOTIFICATION", "params": entities},
            )

        # 8.7 Direct major student list/count routing
        major_match = _MAJOR_QUERY_RE.search(message)
        if major_match and re.search(r"(sinh viên|học sinh|sv)", msg_lower):
            major_name = major_match.group(1).strip()
            major_tool = "count_students_by_major" if re.search(r"(bao nhiêu|đếm|tổng số|có mấy)", msg_lower) else "get_students_by_major"
            
            if _is_locked(major_tool):
                return _locked_result(major_tool)
            return IntentResult(
                intent="data_query",
                tool_name=major_tool,
                entities={"major_name": major_name},
            )

        # 8.8 Direct attendance routing for student-scoped queries
        student_code_match = re.search(r"\b(SE\d{5,6}|HE\d{5,6}|IA\d{5,6})\b", message, re.IGNORECASE)
        if student_code_match and re.search(r"(vắng|điểm danh|chuyên cần|cấm thi|rớt môn)", msg_lower):
            student_code = student_code_match.group(1).upper()
            semester_match = _SEMESTER_CODE_RE.search(message)
            entities: Dict[str, Any] = {"student_code": student_code}
            if semester_match:
                entities["semester_code"] = semester_match.group(0).upper()

            tool_name = "get_my_absence_history"
            if re.search(r"(nguy cơ|cấm thi|rớt môn)", msg_lower):
                tool_name = "get_my_attendance_risk_courses"
            elif re.search(r"(tổng quan|chuyên cần của|điểm danh của)", msg_lower):
                tool_name = "get_my_attendance_overview"

            if _is_locked(tool_name):
                return _locked_result(tool_name)
            return IntentResult(
                intent="data_query",
                tool_name=tool_name,
                entities=entities,
            )

        # 9. Shortcut patterns
        for tool, pattern, entity_key in _SHORTCUTS:
            m = pattern.search(msg_lower)
            if not m:
                continue
            if tool == "_defer":
                logger.debug("[HardRouter] deferred to LLM (action keyword)")
                return None
            actual_tool, entities = self._resolve(tool, entity_key, m)
            if _is_locked(actual_tool):
                return _locked_result(actual_tool)
            intent = "action" if _is_action(actual_tool) else "data_query"
            return IntentResult(
                intent    = intent,
                tool_name = actual_tool,
                entities  = entities,
                action    = {"type": actual_tool.upper(), "params": entities} if intent == "action" else None,
            )

        # 9. Smart defer: entity keywords + multi-word
        if _ENTITY_RE.search(msg_lower) and len(msg_lower.split()) > 1:
            logger.debug(f"[HardRouter] smart defer: '{message}'")
            return None

        return None  # → LLM

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _strip_prefixes(text: str) -> str:
        changed = True
        while changed:
            changed = False
            for p in _STRIP_PREFIXES:
                if text.startswith(p):
                    text    = text[len(p):].strip()
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
                if entity_key in ("student_code", "lecturer_code", "code"):
                    entities["code"] = raw.upper()
            else:
                if entity_key in ("student_code", "lecturer_code", "code", "full_name"):
                    actual = "search_user_by_name"
                    entities["full_name"] = raw
                else:
                    entities[entity_key] = raw
        return actual, entities

    def _cache_set(self, key: str, value: IntentResult) -> None:
        # ✅ FIX: Thread-safe cache write
        with self._lock:
            self._cache[key] = value
            if len(self._cache) > CACHE_CONFIG.max_size:
                self._cache.popitem(last=False)


hard_router = HardRouter()
