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

from loguru import logger # type: ignore

from config.settings import CACHE_CONFIG


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
    "tháng", "ngày", "lớp", "môn", "phòng", "sv", "gv", "sinh viên", "giảng viên"
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

# ── Fallback: bare user code ──────────────────────────────────────────────────
_CODE_RE = re.compile(r"\b(SE\d{3,}|GV\d{3,}|AD\d{3,}|AS\d{3,})\b", re.I)

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
    return tool.startswith((
        "create_", "update_", "delete_", "send_",
        "approve_", "reject_", "assign_", "activate_",
        "add_", "remove_", "publish_", "export_",
        "import_", "update_"
    ))


class HardRouter:
    """Stage 0 – O(1) regex/cache routing. Thread-safe."""

    def __init__(self) -> None:
        self._cache: OrderedDict[str, IntentResult] = OrderedDict()
        # ✅ FIX: Thread-safe lock cho LRU cache
        self._lock  = threading.Lock()

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

        # 5. Semantic match (precomputed candidates)
        if best_nav := self._find_best_match(msg_core, _NAV_CANDIDATES, threshold=0.72):
            logger.debug(f"[HardRouter] Semantic match: '{message}' → {best_nav}")
            result = IntentResult(intent="navigation", tool_name=best_nav)
            self._cache_set(message, result)
            return result

        # 6. Exact navigation regex
        for tool, pattern in _NAV_COMPILED:
            if pattern.match(msg_core):
                result = IntentResult(intent="navigation", tool_name=tool)
                self._cache_set(message, result)
                return result

        # 7. Clarification cho terms có prefix (rare)
        if clue := _CLARIFICATIONS.get(msg_core):
            return IntentResult(intent="direct_response", answer=clue)

        # 8. Shortcut patterns
        for tool, pattern, entity_key in _SHORTCUTS:
            m = pattern.search(msg_lower)
            if not m:
                continue
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

        # 9. Smart defer: entity keywords + multi-word
        if _ENTITY_RE.search(msg_lower) and len(msg_lower.split()) > 1:
            logger.debug(f"[HardRouter] smart defer: '{message}'")
            return None

        # 10. Bare user code (SE/GV)
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