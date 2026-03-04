"""
services/answer_generator.py
Stage 3 – Converts raw tool results into a natural Vietnamese response.

Optimizations vs original:
  • navigation intents bypass LLM entirely (instant response)
  • permission_denied bypasses LLM
  • prompt is a clean template, no .replace() chains
  • JSON serialization centralized via DateTimeEncoder
"""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Generator

from loguru import logger

from services.llm_client import llm_client

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
}

_PROMPT = """
Bạn là FAMS AI Assistant – trợ lý phân tích dữ liệu chuyên nghiệp. Nhiệm vụ của bạn là giải thích kết quả từ hệ thống cho người dùng một cách chính xác và hữu ích nhất.

HỘI THOẠI GẦN ĐÂY:
{history}

YÊU CẦU NGƯỜI DÙNG: {message}
HÔM NAY LÀ NGÀY: {today}

KẾT QUẢ TỪ HỆ THỐNG:
- Ý định (Intent): {intent}
- Công cụ sử dụng: {tool}
- Dữ liệu thô: {tool_result}

HƯỚNG DẪN TRẢ LỜI (CHỈ THỊ CẤP CAO):
1. PHÂN TÍCH TỔNG HỢP: Đọc kỹ "Dữ liệu thô". Tuyệt đối không được "vẽ" thêm thông tin không có trong kết quả hệ thống.
2. ĐỐI CHIẾU Ý ĐỊNH (FACT-CHECKING): 
   - Nếu người dùng hỏi về một khía cạnh cụ thể (Ví dụ: Lúc mấy giờ? Ở đâu? Ai?), hãy trả lời trực diện vào thông tin đó trước khi liệt kê chi tiết.
   - Đặc biệt lưu ý về thời gian: Nếu kết quả không khớp với mốc thời gian (hôm nay/tuần này), phải đính chính rõ cho người dùng.
3. TRÌNH BÀY CHUYÊN NGHIỆP:
   - Sử dụng bảng (nếu cần) hoặc danh sách • gạch đầu dòng rõ ràng.
   - In đậm (**) các mã số, tên riêng, điểm số, và trạng thái quan trọng.
   - Với dữ liệu thống kê (phổ điểm, vắng mặt), hãy sử dụng progress bar bằng ký tự (ví dụ: `████░░ 60%`) để minh họa trực quan.
4. TƯ VẤN THÔNG MINH & CẢNH BÁO:
   - Sử dụng icon: 📈 (tiến bộ), ⚠️ (nguy cơ/vắng nhiều), 🛡️ (bảo mật/bất thường), 🏆 (xếp hạng cao).
   - Nếu thấy sinh viên có GPA thấp (<2.0) hoặc vắng nhiều (>20%), hãy in đậm và thêm icon ⚠️ để nhắc nhở Giảng viên.
   - Với **Class Health Check**, hãy trình bày như một "Phiếu khám sức khỏe" của lớp, nhấn mạnh vào các chỉ số bất thường.
   - Với **Student Ranking**, hãy sử dụng icon 🥇, 🥈, 🥉 cho Top 3 sinh viên dẫn đầu.
5. NGÔN NGỮ: Tiếng Việt tự nhiên, lễ phép (Dạ, thưa...), đóng vai trò là một cộng tác viên đắc lực của hệ thống.

Trả lời:
"""


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


def _serialize(data: Any, is_action: bool = False) -> str:
    if data is None:
        if is_action:
            return "(Hành động đang được hệ thống xử lý phía backend, vui lòng xác nhận với người dùng là yêu cầu đã được gửi đi thành công)"
        return "Không có dữ liệu"
    try:
        return json.dumps(data, ensure_ascii=False, cls=DateTimeEncoder, indent=2)
    except TypeError:
        return str(data)


class AnswerGenerator:
    """Stage 3 – natural language answer builder."""

    def generate(
        self,
        message: str,
        intent_data: Dict[str, Any],
        tool_result: Any,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        today: Optional[str] = None,
    ) -> str:
        intent    = (intent_data.get("intent") or "").strip().lower()
        tool_name = intent_data.get("toolName") or ""
        today     = today or datetime.now().strftime("%Y-%m-%d")

        # ── Fast-path: no LLM needed ─────────────────────────────────────
        if intent == "permission_denied":
            reason = (intent_data.get("entities") or {}).get(
                "reason", "Bạn không có quyền thực hiện hành động này."
            )
            return f"🚫 **Truy cập bị từ chối**: {reason}"

        if intent == "navigation" or tool_name.startswith("view_"):
            return self._navigation_response(tool_name, tool_result)

        # ── LLM response ─────────────────────────────────────────────────
        prompt = _PROMPT.format(
            history=self._fmt_history(history),
            message=message,
            intent=intent,
            tool=tool_name,
            tool_result=_serialize(tool_result, is_action=(intent == "action")),
            today=today,
        )
        try:
            logger.debug(f"[AnswerGen] Prompt sent to LLM:\n{prompt}")
            return llm_client.complete(prompt, model)
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
    ) -> Generator[str, None, None]:
        intent    = (intent_data.get("intent") or "").strip().lower()
        tool_name = intent_data.get("toolName") or ""
        today     = today or datetime.now().strftime("%Y-%m-%d")

        # ── Fast-path: no LLM needed ─────────────────────────────────────
        if intent == "permission_denied":
            reason = (intent_data.get("entities") or {}).get(
                "reason", "Bạn không có quyền thực hiện hành động này."
            )
            yield f"🚫 **Truy cập bị từ chối**: {reason}"
            return

        if intent == "navigation" or tool_name.startswith("view_"):
            yield self._navigation_response(tool_name, tool_result)
            return

        # ── LLM response ─────────────────────────────────────────────────
        prompt = _PROMPT.format(
            history=self._fmt_history(history),
            message=message,
            intent=intent,
            tool=tool_name,
            tool_result=_serialize(tool_result, is_action=(intent == "action")),
            today=today,
        )
        try:
            logger.debug(f"[AnswerGen] Stream prompt sent to LLM:\n{prompt}")
            for chunk in llm_client.stream_complete(prompt, model):
                yield chunk
        except Exception as exc:
            logger.error(f"[AnswerGen] LLM stream error: {exc}")
            yield "Xin lỗi, hệ thống gặp sự cố khi tạo câu trả lời. Vui lòng thử lại."

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _navigation_response(tool_name: str, tool_result: Any) -> str:
        label = _NAV_LABELS.get(tool_name, "trang bạn yêu cầu")

        # Handle smart view_specializations / view_sub_specializations
        if isinstance(tool_result, dict):
            if not tool_result.get("found"):
                if tool_name == "view_specializations":
                    return "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: Công nghệ thông tin, Quản trị kinh doanh…)"
                if tool_name == "view_sub_specializations":
                    return "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào? (Ví dụ: Kỹ thuật phần mềm, Hệ thống thông tin…)"
                target = "ngành học" if tool_result.get("type") == "major" else "chuyên ngành"
                return f"Không tìm thấy {target} phù hợp. Bạn có thể nói rõ hơn không?"
            name = tool_result.get("name", "")
            return f"Dạ, tôi đang mở **{label}** của **{name}** cho bạn!"

        return f"Dạ, tôi đang mở **{label}** cho bạn. Bạn có thể xem chi tiết tại đó!"

    @staticmethod
    def _fmt_history(history: Optional[List[Dict[str, str]]]) -> str:
        if not history:
            return "(không có)"
        # Limit to last 5 turns (10 messages) for speed
        recent = history[-10:]
        parts = []
        for m in recent:
            role = "Người dùng" if m.get("role", "").upper() == "USER" else "Trợ lý"
            # Truncate very long assistant messages in history to avoid bloat
            content = m['content']
            if len(content) > 300:
                content = content[:300] + "..."
            parts.append(f"{role}: {content}")
        return "\n".join(parts)


answer_generator = AnswerGenerator()