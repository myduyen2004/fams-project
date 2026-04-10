"""
services/answer_generator.py  ── v5.5 (Bypass LLM for large tables)
Stage 3 – Converts raw tool results into a natural Vietnamese response.

FIXES v5.5:
  ✅ [CRITICAL] Bypass LLM khi data ≥10 rows → format trực tiếp, KHÔNG bị cắt
  ✅ [MEDIUM]  _direct_table_response() + _generate_title() cho fast-path
  ✅ [MEDIUM]  generate_stream() cũng bypass khi ≥10 rows
"""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from typing import Any, Dict, Generator, List, Optional

from loguru import logger # type: ignore

from app.services.chat.router.tool_catalog import (
    detect_agent,
    get_agent_guidance,
    get_agent_label,
    get_role_guidance,
    get_tool_agent,
)
from app.services.chat.services.fptu_knowledge import (
    get_relevant_fptu_context,
    is_fptu_knowledge_question,
)
from app.services.chat.services.llm_client import llm_client

# ✅ NEW: Mapping từ data_tool → count_tool
TOOL_COUNT_MAP: Dict[str, str] = {
    "get_students_by_major": "count_students_by_major",
    "get_students_by_class": "count_students_by_class",
    "get_attendance_by_class": "count_attendance_by_class",
    "get_courses_by_semester": "count_courses_by_semester",
    "get_lecturers_by_department": "count_lecturers_by_department",
    "get_grades_by_class": "count_grades_by_class",
    "get_notifications": "count_notifications",
    "get_schedule_requests": "count_schedule_requests",
    "get_empty_rooms": "count_empty_rooms",
    "search_user_by_name": "count_users_by_name",
    "get_enrollments_by_class": "count_enrollments_by_class",
}

# ✅ NEW: Mapping từ data_tool → view_tool để điều hướng
TOOL_VIEW_MAP: Dict[str, str] = {
    "get_students_by_major": "view_students",
    "get_students_by_class": "view_classes",
    "get_attendance_by_class": "view_classes",
    "get_courses_by_semester": "view_courses",
    "get_lecturers_by_department": "view_lecturers",
    "get_grades_by_class": "view_grades",
    "get_notifications": "view_notifications",
    "get_schedule_requests": "view_schedule_requests",
    "get_empty_rooms": "view_rooms",
    "search_user_by_name": "view_users",
    "get_enrollments_by_class": "view_classes",
}

_EXACT_LOOKUP_TOOLS = {
    "get_lecturer_by_code",
    "get_student_by_code",
    "get_user_by_code",
}

_NAV_LABELS: Dict[str, str] = {
    "view_students":        "Danh sách Sinh viên",
    "view_lecturers":       "Danh sách Giảng viên",
    "view_majors":          "Quản lý Ngành học",
    "view_courses":         "Quản lý Môn học",
    "view_rooms":           "Quản lý Phòng học",
    "view_semesters":       "Quản lý Học kỳ",
    "view_classes":         "Danh sách Lớp học",
    "view_schedule":        "Lịch học/dạy Cá nhân",
    "view_grades":          "Kết quả Học tập",
    "view_timetable":       "Thời khóa biểu Tổng",
    "view_users":           "Quản lý Người dùng",
    "view_notifications":   "Thông báo Hệ thống",
    "view_profile":         "Hồ sơ Cá nhân",
    "view_schedule_requests": "Yêu cầu Đổi lịch",
    "view_teaching_classes": "Lớp đang Giảng dạy",
    "view_attendance_config": "Cấu hình Điểm danh",
    "view_dashboard":       "Bảng điều khiển Thống kê",
    "view_logs":            "Nhật ký Hệ thống",
    "view_alerts":          "Cảnh báo Bảo mật",
    "view_wifi_aps":        "Quản lý WiFi/AP",
    "view_exam_grades":     "Quản lý Điểm thi",
    "view_resit_grades":    "Quản lý Điểm thi lại",
    "view_assignments":     "Danh sách Bài tập",
    "view_messages":        "Tin nhắn & Chat",
    "view_specializations": "Chuyên ngành Đào tạo",
    "view_sub_specializations": "Chuyên ngành Hẹp",
    "view_inactive_users":  "Tài khoản Bị khóa",
}

def _classify_question(message: str) -> str:
    """Phân loại loại câu hỏi để generate câu trả lời phù hợp."""
    msg = message.lower().strip()
    if re.search(r'(bao nhiêu|tổng số|tổng cộng|có mấy|trung bình|avg|average|count|total)', msg):
        return "single_value"
    if re.search(r'(gpa|điểm).*(là|bao nhiêu|trung bình)', msg):
        return "single_value"
    if re.search(r'(nhiều nhất|ít nhất|cao nhất|thấp nhất|lớn nhất|nhỏ nhất)', msg):
        return "ranked"
    if re.search(r'(top\s*\d+|xếp hạng|hạng nhất)', msg):
        return "ranked"
    if re.search(r'(có.*không\??$|tồn tại|có.*(trong|ở).*(không|ko)\??$)', msg):
        return "yes_no"
    if re.search(r'(so sánh|compare|hơn.*hay|hay.*hơn|khác nhau|giữa các)', msg):
        return "comparison"
    return "table"


def _detect_followup(message: str, history: Optional[List[Dict[str, str]]]) -> str:
    """
    Detect follow-up question và tạo context analysis string cho LLM.
    Returns: chuỗi mô tả context để inject vào prompt.
    """
    q_type = _classify_question(message)

    if not history or len(history) < 2:
        return f"Loại câu hỏi: {q_type}. Câu hỏi độc lập."

    msg_lower = message.lower().strip()
    word_count = len(msg_lower.split())

    followup_signals = []
    if word_count <= 6:
        followup_signals.append("câu ngắn (≤6 từ)")
    if re.search(r'[<>=!]+\s*\d', msg_lower):
        followup_signals.append("có filter số học")
    for kw in ['trong số', 'trong kết quả', 'lọc', 'chỉ lấy', 'trong đó', 'từ danh sách']:
        if kw in msg_lower:
            followup_signals.append(f"từ khóa '{kw}'")
            break
    if any(kw in msg_lower for kw in ['đó', 'trên', 'vừa']) and word_count <= 10:
        followup_signals.append("tham chiếu kết quả trước")

    if not followup_signals:
        return f"Loại câu hỏi: {q_type}. Câu hỏi độc lập."

    # Extract previous user/bot messages from history
    prev_user = ""
    for msg in reversed(history[-6:]):
        if msg.get("role", "").upper() == "USER" and not prev_user:
            prev_user = msg.get("content", "")

    # Detect domain
    domains = {
        "phòng học":  ["phòng", "room", "trống", "tiết"],
        "sinh viên":  ["sinh viên", "student", "sv"],
        "giảng viên": ["giảng viên", "lecturer", "gv"],
        "ngành học":  ["ngành", "major", "chuyên ngành"],
        "lớp học":    ["lớp", "class"],
        "điểm số":   ["điểm", "grade", "gpa", "score"],
        "lịch học":  ["lịch", "schedule"],
    }
    domain = "chưa rõ"
    for d, keywords in domains.items():
        if any(kw in prev_user.lower() for kw in keywords):
            domain = d
            break

    # Detect filter
    filter_parts = []
    num_match = re.search(r'([<>=!]+)\s*(\d+(?:\.\d+)?)', msg_lower)
    if num_match:
        op, val = num_match.group(1), num_match.group(2)
        if any(w in msg_lower for w in ["chỗ", "chổ", "ngồi", "capacity", "sức chứa"]):
            filter_parts.append(f"capacity {op} {val}")
        elif "gpa" in msg_lower:
            filter_parts.append(f"gpa {op} {val}")
        elif any(w in msg_lower for w in ["sinh viên", "sv", "student"]):
            filter_parts.append(f"total_students {op} {val}")
        elif any(w in msg_lower for w in ["điểm", "score"]):
            filter_parts.append(f"score {op} {val}")
        else:
            filter_parts.append(f"(field không xác định) {op} {val}")

    filter_desc = f"Filter cần áp dụng: {', '.join(filter_parts)}" if filter_parts else "Lọc theo điều kiện trong câu hỏi"

    return (
        f"⚠️ ĐÂY LÀ FOLLOW-UP QUESTION (signals: {', '.join(followup_signals)}).\n"
        f"- Loại câu hỏi: {q_type}\n"
        f"- Domain từ lịch sử: {domain}\n"
        f"- Câu hỏi trước của user: \"{prev_user[:100]}\"\n"
        f"- {filter_desc}\n"
        f"→ ÁP DỤNG filter trên data được cung cấp. Nếu data không phù hợp, suy luận từ lịch sử hội thoại."
    )


# ✅ v5.5: Prompt cho kết quả NHỎ (< 10 rows) - bảng lớn đã bypass LLM
_PROMPT = """Bạn là FAMS AI Assistant. Trả lời CHUYÊN NGHIỆP bằng tiếng Việt.

⚠️ TUYỆT ĐỐI KHÔNG BỊA DỮ LIỆU. CHỈ dùng dữ liệu DATABASE bên dưới.

ROLE: {user_role}
ROLE_GUIDANCE: {role_guidance}
AGENT: {agent_label}
AGENT_GUIDANCE: {agent_guidance}
YÊU CẦU: {message}
LỊCH SỬ: {history}
PHÂN TÍCH: {question_analysis}
DỮ LIỆU (Tool: {tool}):
{tool_result}
HÔM NAY: {today}

🔴 QUY TẮC BẮT BUỘC:
1. KHÔNG bịa dữ liệu. "[KHÔNG CÓ DỮ LIỆU]" → "Không tìm thấy dữ liệu phù hợp."
2. COPY Y NGUYÊN toàn bộ bảng markdown từ DỮ LIỆU — KHÔNG cắt, KHÔNG bỏ dòng.
3. KHÔNG nói "Dựa trên dữ liệu..." → ĐI THẲNG VÀO KẾT QUẢ.
4. Follow-up → đọc filter trong PHÂN TÍCH, áp dụng lên data.

LOẠI CÂU HỎI → TRẢ LỜI:
- single_value → 1 câu: "[X] là **[giá trị]**"
- ranked → 🥇 TOP + bảng ngắn
- yes_no → ✅/❌ + 1 câu
- table → COPY toàn bộ bảng

ĐỊNH DẠNG: **In đậm** giá trị quan trọng. Emoji: 📋 📊 🏫 👨‍🏫 👨‍🎓 📌"""

_GENERAL_CHAT_PROMPT = """Bạn là FAMS AI Assistant. Hãy trả lời bằng tiếng Việt tự nhiên, ấm áp, thông minh.

Đây là câu hỏi ngoài lề hệ thống FAMS, vì vậy hãy trả lời bằng kiến thức và suy luận của AI, KHÔNG giả vờ đó là dữ liệu trong cơ sở dữ liệu FAMS.

ROLE: {user_role}
ROLE_GUIDANCE: {role_guidance}
AGENT: {agent_label}
AGENT_GUIDANCE: {agent_guidance}
LỊCH SỬ: {history}
CÂU HỎI: {message}
HÔM NAY: {today}
TRI THỨC FPTU CỤC BỘ:
{knowledge_context}

QUY TẮC:
1. Trả lời ngắn gọn, hữu ích, tự nhiên.
2. Nếu là phép tính đơn giản, trả lời trực tiếp kết quả.
3. Nếu là lời khuyên đời sống, trả lời thực tế, nhẹ nhàng, tích cực.
4. Nếu là câu hỏi thời tiết hiện tại hoặc dữ liệu thời gian thực mà bạn không có nguồn live, hãy nói rõ bạn không có dữ liệu thời tiết thời gian thực trong hệ thống.
5. Không nhắc đến database, tool hay router.
6. Nếu câu hỏi liên quan Trường Đại học FPT/FPTU và phần TRI THỨC FPTU CỤC BỘ có dữ liệu phù hợp, ưu tiên trả lời dựa trên đó.
7. Nếu người dùng hỏi về FPTU nhưng TRI THỨC FPTU CỤC BỘ không có thông tin tương ứng, nói rõ bạn chưa thấy thông tin đó trong file tri thức hiện có; không tự bịa.
"""

_FPTU_KNOWLEDGE_PROMPT = """Bạn là FAMS AI Assistant. Hãy trả lời ngắn gọn, rõ ràng bằng tiếng Việt.

Bạn đang trả lời từ file tri thức nội bộ `fptu-information.json`.

ROLE: {user_role}
AGENT: {agent_label}
CÂU HỎI: {message}
HÔM NAY: {today}
TRI THỨC FPTU:
{knowledge_context}

QUY TẮC:
1. Chỉ dùng thông tin có trong TRI THỨC FPTU.
2. Nếu câu hỏi đòi dữ liệu cá nhân hoặc trạng thái riêng của người dùng, nói rõ file tri thức này không chứa dữ liệu cá nhân.
3. Nếu không thấy thông tin phù hợp, nói rõ là chưa có trong file tri thức hiện tại.
4. Không nhắc đến database, tool executor hay router.
"""


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


# ✅ FIX: Giới hạn output tối đa để tránh bloat prompt
# Updated to support 100+ row tables (approx 150-200 chars per row)
_MAX_TOOL_RESULT_CHARS = 50000


def _serialize(data: Any, is_action: bool = False, tool_name: Optional[str] = None, entities: Optional[Dict] = None) -> str:
    # Explicitly check for None, empty string, empty list, empty dict
    if data is None or data == "" or data == [] or data == {}:
        if is_action:
            return "(Hành động đang được xử lý phía backend. Xác nhận với người dùng là yêu cầu đã gửi thành công.)"
        return "[KHÔNG CÓ DỮ LIỆU]"
    
    try:
        # ✅ NEW: Format list of dicts as markdown table (with count_tool support)
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return _format_table(data, tool_name=tool_name, entities=entities)
        
        text = json.dumps(data, ensure_ascii=False, cls=DateTimeEncoder, indent=2)
        # ✅ FIX: Cắt nếu quá dài
        if len(text) > _MAX_TOOL_RESULT_CHARS:
            logger.warning(f"[AnswerGen] tool_result truncated: {len(text)} → {_MAX_TOOL_RESULT_CHARS} chars")
            text = text[:_MAX_TOOL_RESULT_CHARS] + "\n... (đã lược bớt để tối ưu)"
        return text
    except Exception as e:
        logger.error(f"[AnswerGen] _serialize error: {e}. data type={type(data)}, trying fallback")
        try:
            return str(data)[:_MAX_TOOL_RESULT_CHARS]
        except:
            return "[KHÔNG CÓ DỮ LIỆU]"


def _format_table(rows: List[Dict[str, Any]], tool_name: Optional[str] = None, entities: Optional[Dict] = None) -> str:
    """Format list of dicts as markdown table or count summary with suggestions."""
    if not rows:
        return "[KHÔNG CÓ DỮ LIỆU]"
    
    try:
        page_offset = int((entities or {}).get("__page_offset__") or 0)
        # ✅ v5.3: Show 100 rows, cut if >100
        if len(rows) > 100 and page_offset == 0:
            result = (
                f"[TOO_MANY_RESULTS: {len(rows)}]\n"
                f"Hiển thị tổng  {len(rows)} kết quả.\n\n"
                f"Dưới đây là {min(100, len(rows))} mẫu đầu tiên:\n"
            ) + "\n" + _format_table_impl(rows[:100])
            return result
        
        # ✅ For datasets ≤100 rows, return full table
        return _format_table_impl(rows)
    except Exception as e:
        logger.error(f"[AnswerGen] _format_table error: {e}. Fallback to basic format")
        return _format_table_impl(rows)



def _format_table_impl(rows: List[Dict[str, Any]]) -> str:
    """Internal table formatter - ✅ v5.2 FIXED markdown table format."""
    if not rows:
        return "[KHÔNG CÓ DỮ LIỆU]"
    
    # Get all unique keys, excluding metadata fields
    keys = []
    for row in rows:
        for k in row.keys():
            if k not in keys and k != "__total__":  # ✅ Skip __total__ metadata
                keys.append(k)
    
    if not keys:
        return str(rows)
    
    # Limit to first 8 columns to avoid super wide table
    if len(keys) > 8:
        keys = keys[:8]
    
    # Build markdown table
    header = "| " + " | ".join(keys) + " |"
    # ✅ FIX: Separator line MUST have space padding to match header format
    separator = "| " + " | ".join(["-" * len(k) for k in keys]) + " |"
    
    lines = [header, separator]
    
    for row in rows:
        values = []
        for k in keys:
            v = row.get(k, "")
            # Convert to string, truncate if too long
            if v is None:
                v = ""
            else:
                v = str(v)
                if len(v) > 30:
                    v = v[:27] + "..."
            # Escape pipe character in values
            v = v.replace("|", "\\|")
            values.append(v)
        lines.append("| " + " | ".join(values) + " |")
    
    return "\n".join(lines)


class AnswerGenerator:
    """Stage 3 – natural language answer builder v5.5."""

    # ── Tool → Title mapping cho direct response ──────────────────────────
    _TOOL_TITLES: Dict[str, str] = {
        "get_empty_rooms": "🏫 Danh sách phòng trống",
        "get_own_schedule": "📅 Lịch của bạn",
        "get_lecturer_by_code": "👨‍🏫 Thông tin giảng viên",
        "get_student_by_code": "👨‍🎓 Thông tin sinh viên",
        "get_user_by_code": "👤 Thông tin người dùng",
        "get_my_attendance_overview": "📋 Tổng quan điểm danh của bạn",
        "get_my_absence_history": "🚨 Lịch sử vắng và trễ của bạn",
        "get_my_attendance_risk_courses": "⚠️ Môn học có nguy cơ vì điểm danh",
        "get_other_lecturer_schedule": "👨‍🏫 Lịch giảng dạy",
        "get_other_student_schedule": "👨‍🎓 Lịch học sinh viên",
        "get_class_schedule": "📅 Lịch lớp học",
        "get_enrollments_by_class": "👨‍🎓 Danh sách sinh viên lớp",
        "get_students_by_major": "👨‍🎓 Sinh viên theo ngành",
        "get_students_by_class": "👨‍🎓 Sinh viên theo lớp",
        "get_lecturers_by_major": "👨‍🏫 Giảng viên theo ngành",
        "get_lecturers_by_expertise": "👨‍🏫 Giảng viên theo chuyên môn",
        "get_grade_report_by_class": "📊 Bảng điểm lớp",
        "get_grade_report_by_course": "📊 Bảng điểm theo môn",
        "get_attendance_stats_by_class": "📋 Thống kê điểm danh",
        "get_absence_rate_by_class": "📋 Tỉ lệ vắng của lớp",
        "get_attendance_by_slot": "📋 Điểm danh buổi học",
        "get_classes_by_semester": "📚 Danh sách lớp học",
        "get_own_grades": "📊 Kết quả học tập",
        "list_courses": "📚 Danh sách môn học",
        "list_majors": "🎓 Danh sách ngành học",
        "list_semesters": "📅 Danh sách học kỳ",
        "list_notifications": "🔔 Danh sách thông báo",
        "get_top_students": "🏆 Sinh viên xuất sắc",
        "get_students_at_risk": "⚠️ Sinh viên cảnh báo học vụ",
        "get_most_absent_students": "⚠️ Sinh viên vắng nhiều nhất",
        "get_lecturer_workload": "👨‍🏫 Tải giảng dạy",
        "get_schedule_request_list": "📋 Yêu cầu đổi lịch",
        "get_my_schedule_requests": "📋 Yêu cầu đổi lịch của bạn",
        "search_user_by_name": "🔍 Kết quả tìm kiếm",
        "get_my_notifications": "🔔 Thông báo của bạn",
        "count_unread_notifications": "🔔 Số thông báo chưa đọc",
        "get_grade_distribution": "📊 Phổ điểm",
        "get_student_ranking_in_class": "🏆 Xếp hạng sinh viên",
        "get_abnormal_attendance": "⚠️ Điểm danh bất thường",
        "get_attendance_rate_by_course": "📋 Tỷ lệ chuyên cần",
        "get_attendance_trends": "📈 Xu hướng vắng mặt",
        "get_semester_overview": "📚 Tổng quan học kỳ",
        "get_room_usage_weekly": "🏫 Sử dụng phòng trong tuần",
        "get_gpa_stats_by_major": "📊 Thống kê GPA theo ngành",
    }

    def generate(
        self,
        message: str,
        intent_data: Dict[str, Any],
        tool_result: Any,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        today: Optional[str] = None,
        user_role: str = "STUDENT",
    ) -> str:
        intent    = (intent_data.get("intent") or "").strip().lower()
        tool_name = intent_data.get("toolName") or ""
        entities  = intent_data.get("entities") or {}
        today     = today or datetime.now().strftime("%Y-%m-%d")
        agent_id  = intent_data.get("agent") or (get_tool_agent(tool_name) if tool_name else detect_agent(message))

        # ── Fast-path: no LLM needed ─────────────────────────────────────
        if intent == "permission_denied":
            reason = (intent_data.get("entities") or {}).get(
                "reason", "Bạn không có quyền thực hiện hành động này."
            )
            return f"🚫 **Truy cập bị từ chối**: {reason}"

        if intent == "tool_locked":
            reason = (intent_data.get("entities") or {}).get(
                "reason", "Công cụ này hiện đang bị khóa."
            )
            return f"🔒 **Công cụ đã bị khóa**: {reason}"

        if intent == "navigation" or (tool_name and tool_name.startswith("view_")):
            return self._navigation_response(tool_name, tool_result)

        if (
            intent == "data_query"
            and tool_name in _EXACT_LOOKUP_TOOLS
            and isinstance(tool_result, list)
            and tool_result
            and isinstance(tool_result[0], dict)
        ):
            return self._direct_table_response(message, tool_result, tool_name, {})

        if intent == "general_chat" or tool_name == "general_offtopic_chat":
            knowledge_context = get_relevant_fptu_context(message)
            prompt = _GENERAL_CHAT_PROMPT.format(
                user_role=user_role,
                role_guidance=get_role_guidance(user_role),
                agent_label=get_agent_label(agent_id),
                agent_guidance=get_agent_guidance(agent_id),
                history=self._fmt_history(history),
                message=message,
                today=today,
                knowledge_context=knowledge_context,
            )
            response = llm_client.complete(prompt, model)
            if is_fptu_knowledge_question(message) and knowledge_context == "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]":
                return "Mình chưa thấy thông tin này trong file tri thức FPTU hiện có."
            return response.strip()

        if intent == "knowledge_query" or tool_name in {"fpt_tool", "fptu_knowledge_lookup"}:
            knowledge_context = get_relevant_fptu_context(message)
            if knowledge_context == "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]":
                return "Mình chưa thấy thông tin này trong file tri thức FPTU hiện có."
            prompt = _FPTU_KNOWLEDGE_PROMPT.format(
                user_role=user_role,
                agent_label=get_agent_label(agent_id),
                message=message,
                today=today,
                knowledge_context=knowledge_context,
            )
            return llm_client.complete(prompt, model).strip()

        # ✅ NEW v5.5: BYPASS LLM cho data_query có bảng lớn (≥10 rows)
        # LLM hay cắt bảng dài → format sẵn rồi trả thẳng, không qua LLM
        if (
            intent == "data_query"
            and isinstance(tool_result, list)
            and len(tool_result) >= 10
            and tool_result
            and isinstance(tool_result[0], dict)
        ):
            return self._direct_table_response(message, tool_result, tool_name, entities)

        # ── LLM response (cho kết quả nhỏ < 10 rows hoặc non-table) ─────
        display_tool = tool_name
        if (
            isinstance(tool_result, list)
            and tool_result
            and isinstance(tool_result[0], dict)
            and "tool" in tool_result[0]
        ):
            display_tool = "Multiple: " + ", ".join(
                set(str(r.get("tool")) for r in tool_result)
            )

        serialized = _serialize(tool_result, is_action=(intent == "action"), tool_name=tool_name, entities=entities)
        question_analysis = _detect_followup(message, history)
        
        if isinstance(tool_result, list) and len(tool_result) > 0:
            logger.info(f"[AnswerGen] tool={tool_name}, rows={len(tool_result)}, q_analysis={question_analysis[:80]}")
        
        # ✅ NEW v5.1: GUARD CLAUSE - Nếu không có dữ liệu → KHÔNG gọi LLM (tránh bịa)
        if serialized == "[KHÔNG CÓ DỮ LIỆU]" and intent == "data_query":
            logger.warning(f"[AnswerGen] NO DATA for query '{message}' → skip LLM to avoid hallucination")
            return "Không tìm thấy dữ liệu phù hợp với yêu cầu của bạn."
        
        prompt = _PROMPT.format(
            user_role         = user_role,
            role_guidance     = get_role_guidance(user_role),
            agent_label       = get_agent_label(agent_id),
            agent_guidance    = get_agent_guidance(agent_id),
            history           = self._fmt_history(history),
            message           = message,
            question_analysis = question_analysis,
            tool              = display_tool,
            tool_result       = serialized,
            today             = today,
        )
        try:
            logger.debug(f"[AnswerGen] Prompt length: {len(prompt)} chars")
            
            response = llm_client.complete(prompt, model)
            
            # ✅ v5.2: POST-PROCESS VALIDATION - Nếu LLM bịa dữ liệu dù không có tool_result
            if self._is_hallucinated_response(response, tool_result, intent):
                logger.error(f"[AnswerGen] HALLUCINATION DETECTED! Replacing with safe response.")
                return "Không tìm thấy dữ liệu phù hợp với yêu cầu của bạn."
            
            return response
        except Exception as exc:
            logger.error(f"[AnswerGen] LLM error: {exc}")
            return "Xin lỗi, hệ thống gặp sự cố khi tạo câu trả lời. Vui lòng thử lại."

    def generate_stream(
        self,
        message: str,
        intent_data: Dict[str, Any],
        tool_result: Any,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        today: Optional[str] = None,
        user_role: str = "STUDENT",
    ) -> Generator[str, None, None]:
        intent    = (intent_data.get("intent") or "").strip().lower()
        tool_name = intent_data.get("toolName") or ""
        entities  = intent_data.get("entities") or {}  # ✅ NEW
        today     = today or datetime.now().strftime("%Y-%m-%d")
        agent_id  = intent_data.get("agent") or (get_tool_agent(tool_name) if tool_name else detect_agent(message))

        # Fast-path
        if intent == "permission_denied":
            reason = (intent_data.get("entities") or {}).get(
                "reason", "Bạn không có quyền thực hiện hành động này."
            )
            yield f"🚫 **Truy cập bị từ chối**: {reason}"
            return

        if intent == "tool_locked":
            reason = (intent_data.get("entities") or {}).get(
                "reason", "Công cụ này hiện đang bị khóa."
            )
            yield f"🔒 **Công cụ đã bị khóa**: {reason}"
            return

        if intent == "navigation" or (tool_name and tool_name.startswith("view_")):
            yield self._navigation_response(tool_name, tool_result)
            return

        if (
            intent == "data_query"
            and tool_name in _EXACT_LOOKUP_TOOLS
            and isinstance(tool_result, list)
            and tool_result
            and isinstance(tool_result[0], dict)
        ):
            yield self._direct_table_response(message, tool_result, tool_name, {})
            return

        if intent == "general_chat" or tool_name == "general_offtopic_chat":
            knowledge_context = get_relevant_fptu_context(message)
            prompt = _GENERAL_CHAT_PROMPT.format(
                user_role=user_role,
                role_guidance=get_role_guidance(user_role),
                agent_label=get_agent_label(agent_id),
                agent_guidance=get_agent_guidance(agent_id),
                history=self._fmt_history(history),
                message=message,
                today=today,
                knowledge_context=knowledge_context,
            )
            if is_fptu_knowledge_question(message) and knowledge_context == "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]":
                yield "Mình chưa thấy thông tin này trong file tri thức FPTU hiện có."
                return
            yield llm_client.complete(prompt, model).strip()
            return

        if intent == "knowledge_query" or tool_name in {"fpt_tool", "fptu_knowledge_lookup"}:
            knowledge_context = get_relevant_fptu_context(message)
            if knowledge_context == "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]":
                yield "Mình chưa thấy thông tin này trong file tri thức FPTU hiện có."
                return
            prompt = _FPTU_KNOWLEDGE_PROMPT.format(
                user_role=user_role,
                agent_label=get_agent_label(agent_id),
                message=message,
                today=today,
                knowledge_context=knowledge_context,
            )
            yield llm_client.complete(prompt, model).strip()
            return

        # ✅ v5.5: BYPASS LLM cho bảng lớn (≥10 rows) — stream cũng không cắt
        if (
            intent == "data_query"
            and isinstance(tool_result, list)
            and len(tool_result) >= 10
            and tool_result
            and isinstance(tool_result[0], dict)
        ):
            yield self._direct_table_response(message, tool_result, tool_name, entities)
            return

        # LLM streaming (< 10 rows)
        display_tool = tool_name
        if (
            isinstance(tool_result, list)
            and tool_result
            and isinstance(tool_result[0], dict)
            and "tool" in tool_result[0]
        ):
            display_tool = "Multiple: " + ", ".join(
                set(str(r.get("tool")) for r in tool_result)
            )

        serialized = _serialize(tool_result, is_action=(intent == "action"), tool_name=tool_name, entities=entities)
        question_analysis = _detect_followup(message, history)
        
        if isinstance(tool_result, list) and len(tool_result) > 0:
            logger.info(f"[AnswerGen] STREAM tool={tool_name}, rows={len(tool_result)}, q_analysis={question_analysis[:80]}")
        
        prompt = _PROMPT.format(
            user_role         = user_role,
            role_guidance     = get_role_guidance(user_role),
            agent_label       = get_agent_label(agent_id),
            agent_guidance    = get_agent_guidance(agent_id),
            history           = self._fmt_history(history),
            message           = message,
            question_analysis = question_analysis,
            tool              = display_tool,
            tool_result       = serialized,
            today             = today,
        )
        try:
            logger.debug(f"[AnswerGen] Stream prompt length: {len(prompt)} chars")
            for chunk in llm_client.stream_complete(prompt, model):
                yield chunk
        except Exception as exc:
            logger.error(f"[AnswerGen] LLM stream error: {exc}")
            yield "Xin lỗi, hệ thống gặp sự cố khi tạo câu trả lời. Vui lòng thử lại."

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _direct_table_response(
        self,
        message: str,
        data: List[Dict[str, Any]],
        tool_name: str,
        entities: Dict[str, Any],
    ) -> str:
        """✅ v5.5: Bypass LLM — format bảng trực tiếp, KHÔNG bao giờ bị cắt."""
        # ✅ Extract total from __total__ field (COUNT(*) OVER()) or fallback to len()
        total = data[0].get("__total__", len(data)) if data else 0
        page_offset = int(entities.get("__page_offset__") or 0)
        shown_start = page_offset + 1 if data else 0
        shown_end = page_offset + len(data)

        # Build title
        title = self._generate_title(message, tool_name, entities)

        # Format full table (dùng _format_table_impl đã có)
        if total > 100:
            table = _format_table_impl(data)
            footer = f"\n\n📊 **Hiển thị {shown_start}-{shown_end}/{total} kết quả**"
        else:
            table = _format_table_impl(data)
            footer = f"\n\n📊 **Tổng cộng: {total} kết quả**"

        result = f"{title}\n\n{table}{footer}"

        logger.info(f"[AnswerGen] DIRECT table bypass: {total} rows, tool={tool_name} ✅")
        return result

    def _generate_title(self, message: str, tool_name: str, entities: Dict[str, Any]) -> str:
        """Generate tiêu đề ngắn gọn từ tool_name + entities."""
        base = self._TOOL_TITLES.get(tool_name, "📋 Kết quả truy vấn")

        # Thêm context từ entities
        suffix_parts = []
        for key in ("class_name", "major_name", "course_name", "room_name",
                     "semester_code", "semester_name", "full_name", "code",
                     "lecturer_code", "student_code", "expertise"):
            val = entities.get(key)
            if val:
                suffix_parts.append(str(val))

        # Thêm date context
        date_val = entities.get("date", "")
        date_labels = {
            "TODAY": "hôm nay", "TOMORROW": "ngày mai",
            "THIS_WEEK": "tuần này", "NEXT_WEEK": "tuần sau",
        }
        date_label = date_labels.get(str(date_val).upper(), "")
        if date_label:
            suffix_parts.append(date_label)

        suffix = " — ".join(suffix_parts[:3])  # Max 3 parts
        if suffix:
            return f"### {base} — {suffix}"
        return f"### {base}"

    @staticmethod
    def _is_hallucinated_response(generated: str, tool_result: Any, intent: str) -> bool:
        """
        ✅ v5.2 ANTI-HALLUCINATION VALIDATOR
        Phát hiện khi LLM bịa dữ liệu dù tool_result rỗng/null.
        Hỏi lại khi:
        - tool_result == None/empty và response có dữ liệu KHÔNG từ tool
        - response tham chiếu đến dữ liệu cụ thể (con số, tên...) nhưng tool không trả về
        """
        if not generated or tool_result is None:
            return False
        
        # Nếu tool_result rỗng/null → LỜI TRẢNG generatedMẠN không được chứa dữ liệu cụ thể
        if isinstance(tool_result, (list, dict)) and not tool_result:
            # Kiểm tra hallucination signatures
            hallucination_markers = [
                "Có", "có", "được", "có", "tất cả",  # Positive existence statements
                "lớp", "sinh viên", "giảng viên",    # Specific domain references
                "số", "mã", "mã SV",                  # Specific codes
                "thứ 2", "thứ 3", "sáng", "chiều",   # Specific times
            ]
            
            if any(marker in generated for marker in hallucination_markers):
                logger.warning(f"[HallucCheck] DETECTED: Empty result but response has data markers: {generated[:100]}")
                return True
        
        return False

    @staticmethod
    def _navigation_response(tool_name: str, tool_result: Any) -> str:
        label = _NAV_LABELS.get(tool_name, "trang bạn yêu cầu")

        if isinstance(tool_result, dict):
            if not tool_result.get("found"):
                if tool_name == "view_specializations":
                    return "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: CNTT, Quản trị kinh doanh...)"
                if tool_name == "view_sub_specializations":
                    return "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào?"
                target = "ngành học" if tool_result.get("type") == "major" else "chuyên ngành"
                return f"Không tìm thấy {target} phù hợp. Bạn có thể nói rõ hơn không?"
            name = tool_result.get("name", "")
            return f"Dạ, tôi đang mở **{label}** của **{name}** cho bạn!"

        return f"Dạ, tôi đang mở **{label}** cho bạn. Bạn có thể xem chi tiết tại đó!"

    @staticmethod
    def _fmt_history(history: Optional[List[Dict[str, str]]]) -> str:
        if not history:
            return "(không có)"
        # ✅ FIX: Giới hạn 5 turns (10 messages), mỗi message tối đa 150 chars
        recent = history[-10:]
        parts  = []
        for m in recent:
            role    = "User" if m.get("role", "").upper() == "USER" else "Bot"
            content = m["content"]
            if len(content) > 150:    # ✅ FIX: giảm từ 300 → 150
                content = content[:150] + "..."
            parts.append(f"{role}: {content}")
        return "\n".join(parts)


answer_generator = AnswerGenerator()
