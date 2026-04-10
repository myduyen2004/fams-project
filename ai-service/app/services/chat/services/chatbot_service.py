"""
services/chatbot_service.py  ── v4.0 (Final Fix)

FIXES v4.0 (so với v3):
  ✅ [CRITICAL] Bỏ _LLM_SEMAPHORE và _llm_call_with_retry tự viết
               → llm_client đã có semaphore + retry + circuit breaker hoàn chỉnh
               → Double-throttle gây deadlock đã được loại bỏ
  ✅ [CRITICAL] Không retry RuntimeError vô ích
               (llm_client đã throw RuntimeError SAU KHI hết retry nội bộ)
  ✅ [HIGH]    Stream: không giữ lock toàn bộ generator nữa
               → gọi generate_stream() bình thường, llm_client tự quản lý semaphore
  ✅ [MEDIUM]  Error messages phân biệt rate limit vs lỗi hệ thống
"""
from __future__ import annotations

import io
import json
import re
import time
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional, Tuple, Union, cast

import pandas as pd # type: ignore
from loguru import logger # type: ignore

from app.services.chat.router.hard_router import hard_router, IntentResult
from app.services.chat.router.core_tool_inventory import is_kept_tool
from app.services.chat.router.light_router import light_router
from app.services.chat.router.ml_intent_classifier import ml_intent_classifier
from app.services.chat.router.query_preprocessor import query_preprocessor
from app.services.chat.router.trend_router import trend_router
from app.services.chat.router.permissions import check_permission
from app.services.chat.router.tool_catalog import (
    FIELD_META,
    build_action_review_fields,
    build_missing_fields,
    detect_agent,
    get_agent_label,
    get_tool_agent,
    has_enough_required_entities,
    require_all_required_fields,
    validate_required_entities,
)
from app.services.chat.db.queries import normalize_entities
from app.services.chat.services.answer_generator import answer_generator
from app.services.chat.tools.executor import tool_executor

# ── Timeout budget ────────────────────────────────────────────────────────────
_MAX_TOTAL_SECONDS = 7.0   # Tối đa 7s cho toàn bộ flow
_PAGE_SIZE = 100
_LONG_MESSAGE_TOKEN_THRESHOLD = 32
_LONG_MESSAGE_CHAR_THRESHOLD = 240
_LONG_MESSAGE_LINE_THRESHOLD = 3

# ── Route mapping ─────────────────────────────────────────────────────────────
_ROUTE_MAP: Dict[str, str] = {
    "view_lecturers":         "/academic-staff/lecturers",
    "view_students":          "/academic-staff/students",
    "view_majors":            "/academic-staff/majors",
    "view_courses":           "/academic-staff/courses",
    "view_rooms":             "/academic-staff/rooms",
    "view_semesters":         "/academic-staff/semesters",
    "view_schedule":          "/academic-staff/schedule",
    "view_results":           "/academic-staff/academic-results",
    "view_users":             "/admin/users",
    "view_inactive_users":    "/admin/locked-users",
    "view_logs":              "/admin/system-logs",
    "view_alerts":            "/admin/alerts",
    "view_notifications":     "/admin/notification-management",
    "view_dashboard":         "/academic-staff/dashboard",
    "view_profile":           "/academic-staff/profile",
    "view_classes":           "/academic-staff/classes",
    "view_teaching_classes":  "/lecturer/classes",
    "view_specializations":   "/academic-staff/specializations",
    "view_sub_specializations": "/academic-staff/sub-specializations",
    "view_timetable":         "/academic-staff/schedule",
    "get_my_schedule":        "/student/schedule",
    "get_my_grades":          "/student/grades",
    "get_my_notifications":   "/notifications",
    "get_own_grades":         "/student/grades",
    "view_grades":            "/academic-staff/academic-results",
    "view_messages":          "/academic-staff/messages",
    "view_assignments":       "/academic-staff/assignments",
    "view_exam_grades":       "/academic-staff/exam-grades",
    "view_resit_grades":      "/academic-staff/resit-grades",
    "view_wifi_aps":          "/academic-staff/wifi-aps",
    "view_attendance_config": "/academic-staff/attendance",
    "view_schedule_requests": "/academic-staff/requests",
}

_ROLE_PREFIXES = {"LECTURER": "lecturer", "STUDENT": "student"}

_BACKEND_ACTION_TOOLS = {
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
_AI_ONLY_TOOLS = {"general_offtopic_chat", "fpt_tool", "fptu_knowledge_lookup"}
_ACADEMIC_STUDENT_CONTEXT_TOOLS = {
    "get_my_attendance_overview",
    "get_my_absence_history",
    "get_my_attendance_risk_courses",
}

_ERR_RATE_LIMIT = "⚠️ Hệ thống AI đang quá tải. Vui lòng thử lại sau 30 giây."
_ERR_SYSTEM     = "⚠️ Hệ thống gặp sự cố. Vui lòng thử lại."
_ERR_UNSUPPORTED = "Xin lỗi, chức năng này hệ thống chưa phát triển."


def _fallback_answer(tool_result: Any, tool_name: str) -> str:
    """
    Tạo câu trả lời template khi LLM timeout/lỗi.
    Trả về dữ liệu thô đã format thay vì gọi LLM.
    """
    if not tool_result:
        return "Không tìm thấy dữ liệu phù hợp trong hệ thống."

    if isinstance(tool_result, dict) and tool_result.get("__error__"):
        return "⚠️ Không thể truy vấn dữ liệu do lỗi hệ thống. Vui lòng thử lại."

    if isinstance(tool_result, list):
        if not tool_result:
            return "Không tìm thấy dữ liệu phù hợp."
        # Format dữ liệu thô thành bảng đơn giản
        lines = [f"📊 **Kết quả** ({len(tool_result)} mục):"]
        for i, row in enumerate(tool_result[:10]):
            if isinstance(row, dict):
                parts: List[str] = []
                for k, v in row.items():
                    if v is not None and v != "" and v != 0:
                        parts.append(f"**{k}**: {v}")
                # Use explicit loop or limit to avoid slice indexing issue in some type checkers
                parts_to_join = [parts[j] for j in range(min(5, len(parts)))]
                lines.append(f"{i+1}. " + " | ".join(parts_to_join))
            else:
                lines.append(f"{i+1}. {row}")
        if len(tool_result) > 10:
            lines.append(f"... và {len(tool_result) - 10} mục khác")
        return "\n".join(lines)

    return str(tool_result)[:2000]


def _academic_student_code_missing_fields() -> List[Dict[str, Any]]:
    meta = dict(FIELD_META.get("student_code", {}))
    return [{
        "name": "student_code",
        "label": meta.get("label", "Mã sinh viên"),
        "placeholder": meta.get("placeholder", "Ví dụ: SE170001"),
        "format": meta.get("format", "SE******"),
        "description": "Vui lòng cung cấp mã sinh viên để tra cứu điểm danh.",
    }]


def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "429" in msg or "rate limit" in msg or "rate_limit" in msg
        or "too many requests" in msg or "quota" in msg
    )


def _resolve_redirect(
    tool_name: str,
    redirect_from_intent: Optional[str],
    user_role: str,
    entities: Optional[Dict] = None,
) -> Optional[str]:
    path = redirect_from_intent or _ROUTE_MAP.get(tool_name)
    if not path:
        return None
    role_lower = user_role.lower()
    if tool_name == "view_profile":
        if user_role == "ADMIN":
            return "/admin/profile"
        return "/academic-staff/profile" if user_role == "ACADEMIC_STAFF" else f"/{role_lower}/profile"
    if tool_name == "view_notifications":
        if user_role == "ADMIN":
            return "/admin/notification-management"
        if user_role == "ACADEMIC_STAFF":
            return "/academic-staff/notification-management"
        if user_role == "LECTURER":
            return "/lecturer/granted/notifications"
        return "/notifications"
    if user_role in ("LECTURER", "STUDENT"):
        if tool_name == "view_grades":
            class_name = entities.get("class_name") if entities else None
            base = f"/{role_lower}/grades"
            return f"{base}?class={class_name}" if class_name else base
        if tool_name == "view_messages":
            return f"/{role_lower}/messages"
        if tool_name == "view_assignments":
            return f"/{role_lower}/assignments"
        if tool_name in ("get_own_schedule", "view_schedule"):
            return f"/{role_lower}/schedule"
    if tool_name == "view_lecturers":
        if entities:
            lecturer_code = entities.get("lecturer_code") or entities.get("code")
            full_name = entities.get("full_name")
            if lecturer_code:
                return f"{path}?code={lecturer_code}"
            if full_name:
                return f"{path}?q={full_name}"
        return path
    if tool_name == "view_students":
        if entities:
            student_code = entities.get("student_code") or entities.get("code")
            full_name = entities.get("full_name")
            if student_code:
                return f"{path}?code={student_code}"
            if full_name:
                return f"{path}?q={full_name}"
        return path
    prefix = _ROLE_PREFIXES.get(user_role)
    if prefix and "/academic-staff/" in path:
        if tool_name not in ("view_students", "view_lecturers"):
            path = path.replace("/academic-staff/", f"/{prefix}/")
    return path


def _make_step(stage: int, name: str, status: str, detail: str = "") -> Dict[str, Any]:
    step = {"stage": stage, "name": name, "status": status}
    if detail:
        step["detail"] = detail
    return step


def _intent_result_to_dict(ir: IntentResult) -> Dict[str, Any]:
    return {
        "intent":       ir.intent,
        "toolName":     ir.tool_name,
        "entities":     ir.entities,
        "action":       ir.action,
        "redirectPath": ir.redirect_path,
        "dynamicSql":   None,
    }


def _should_use_llm_router(message: str, preprocessed: Optional[Dict[str, Any]] = None) -> bool:
    raw_message = str(message or "")
    token_count = int((preprocessed or {}).get("tokenCount") or len(raw_message.split()))
    line_count = raw_message.count("\n") + 1 if raw_message else 0
    return (
        token_count >= _LONG_MESSAGE_TOKEN_THRESHOLD
        or len(raw_message) >= _LONG_MESSAGE_CHAR_THRESHOLD
        or line_count >= _LONG_MESSAGE_LINE_THRESHOLD
    )


def _trend_only_fallback(message: str) -> Dict[str, Any]:
    return {
        "intent": "need_clarification",
        "toolName": None,
        "entities": {
            "missingInfo": (
                "Tôi đang ưu tiên Trend Router cho câu hỏi thông thường. "
                "Bạn hãy nêu ngắn gọn hơn và chỉ rõ mã sinh viên, lớp, môn, phòng hoặc học kỳ cần tra cứu."
            )
        },
        "confidence": "low",
        "agent": detect_agent(message),
    }


def _build_response(
    answer: str,
    steps: List[Dict],
    redirect: Optional[str],
    action: Optional[Dict],
    agent: Optional[str] = None,
    missing_fields: Optional[List[Dict[str, Any]]] = None,
    pending_tool: Optional[str] = None,
    original_message: Optional[str] = None,
    pending_entities: Optional[Dict[str, Any]] = None,
    continuation: Optional[Dict[str, Any]] = None,
    action_review: bool = False,
) -> Dict[str, Any]:
    response: Dict[str, Any] = {
        "answer": answer,
        "thinkingSteps": steps,
        "redirectPath": redirect,
        "action": action,
    }
    if agent:
        response["agent"] = agent
        response["agentLabel"] = get_agent_label(agent)
    if missing_fields:
        response["missingFields"] = missing_fields
    if pending_tool:
        response["pendingTool"] = pending_tool
    if original_message:
        response["originalMessage"] = original_message
    if pending_entities:
        response["pendingEntities"] = pending_entities
    if continuation:
        response["continuation"] = continuation
    if action_review:
        response["actionReview"] = True
    return response


# ── Clarification questions mapping ───────────────────────────────────────────
_FIELD_QUESTIONS = {
    "class_name": "Bạn muốn xem lịch của **lớp học** nào? Vui lòng cho tôi biết mã lớp (ví dụ: PRF192_SE1, MAD101_L1).",
    "student_code": "Bạn muốn tra cứu **sinh viên** nào? Vui lòng cho tôi biết mã sinh viên (ví dụ: SE170001, HE170123).",
    "lecturer_code": "Bạn muốn xem thông tin **giảng viên** nào? Vui lòng cho tôi biết mã giảng viên (ví dụ: GV001).",
    "course_name": "Bạn muốn tra cứu **môn học** nào? Vui lòng cho tôi biết tên hoặc mã môn (ví dụ: PRF192, OOP).",
    "major_name": "Bạn muốn xem thông tin **ngành học** nào? (ví dụ: Công nghệ thông tin, Kỹ thuật phần mềm)",
    "semester_code": "Bạn muốn xem thông tin **học kỳ** nào? (ví dụ: SP26, FA25, SU26)",
    "room_name": "Bạn muốn xem thông tin **phòng học** nào? (ví dụ: A101, B202)",
    "date": "Bạn muốn xem thông tin ngày nào? (ví dụ: hôm nay, ngày mai, 2026-03-08)",
    "request_id": "Bạn muốn xử lý **yêu cầu đổi lịch** số mấy?",
}

_TOOL_CONTEXT = {
    "get_class_schedule": "lịch học của lớp",
    "get_enrollments_by_class": "danh sách sinh viên trong lớp",
    "get_attendance_by_slot": "điểm danh của lớp",
    "get_attendance_stats_by_class": "thống kê vắng mặt của lớp",
    "get_grade_report_by_class": "bảng điểm của lớp",
    "get_other_lecturer_schedule": "lịch dạy của giảng viên",
    "get_other_student_schedule": "lịch học của sinh viên",
    "get_student_by_code": "thông tin sinh viên",
    "get_lecturer_by_code": "thông tin giảng viên",
}

_EMPTY_RESULT_RETRY_FIELDS: Dict[str, List[str]] = {
    "count_students_by_major": ["major_name", "major_code"],
    "get_students_by_major": ["major_name", "major_code"],
    "get_students_at_risk": ["major_name", "major_code"],
    "get_gpa_stats_by_major": ["major_name", "major_code"],
    "get_specializations_by_major": ["major_name", "major_code"],
    "get_sub_specializations": ["specialization_name", "specialization_code", "major_name"],
    "get_courses_by_name": ["course_name", "course_code"],
    "get_grade_components_by_course": ["course_name", "course_code"],
    "get_detail_course_grade": ["course_name", "course_code"],
    "get_students_by_class": ["class_name"],
    "get_enrollments_by_class": ["class_name"],
    "get_class_schedule": ["class_name"],
    "get_class_info": ["class_name"],
    "get_grade_report_by_class": ["class_name"],
    "get_attendance_by_slot": ["class_name"],
    "get_attendance_stats_by_class": ["class_name"],
    "get_lecturer_by_code": ["lecturer_code", "full_name"],
    "get_student_by_code": ["student_code", "full_name"],
}


def _build_retry_fields(field_names: List[str]) -> List[Dict[str, Any]]:
    retry_fields: List[Dict[str, Any]] = []
    for field in field_names:
        meta = FIELD_META.get(field, {})
        format_hint = meta.get("formatHint", "")
        question = f"Vui lòng kiểm tra lại {meta.get('label', field.replace('_', ' '))}."
        if format_hint:
            question = f"{question} {format_hint}"
        retry_fields.append({
            "id": field,
            "name": field,
            "label": meta.get("label", field.replace("_", " ").title()),
            "placeholder": meta.get("placeholder", f"Nhập {field}"),
            "inputType": meta.get("inputType", "text"),
            "question": question,
            "required": False,
        })
    return retry_fields


def _build_empty_result_retry(tool_name: str, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
    retry_fields = _EMPTY_RESULT_RETRY_FIELDS.get(tool_name, [])
    if not retry_fields:
        return []
    if not any(entities.get(field) not in (None, "", []) for field in retry_fields):
        return []
    return _build_retry_fields(retry_fields)


# ── ChatbotService ─────────────────────────────────────────────────────────────
class ChatbotService:
    """
    QUAN TRỌNG: Không thêm semaphore hay retry ở tầng này.
    llm_client đã có: semaphore (max 3 concurrent) + per-key cooldown +
    circuit breaker + jitter backoff + model fallback.
    Thêm vào chỉ gây double-throttle và deadlock.
    """

    def _generate_clarification_question(self, error_msg: str, tool_name: str, original_message: str) -> str:
        """Tạo câu hỏi làm rõ dựa trên trường bị thiếu."""
        # Extract field name from error: "Thiếu trường bắt buộc: class_name"
        field_name = ""
        if "Thiếu trường bắt buộc:" in error_msg:
            field_name = error_msg.split(":")[-1].strip()
        
        # Get context-specific question
        context = _TOOL_CONTEXT.get(tool_name, "thông tin bạn yêu cầu")
        question = _FIELD_QUESTIONS.get(field_name, f"Vui lòng cung cấp thêm thông tin để tôi có thể tra cứu {context}.")
        
        return f"❓ Tôi cần thêm thông tin để tra cứu {context}.\n\n{question}"

    @staticmethod
    def _hydrate_entities_from_message(
        tool_name: str,
        message: str,
        entities: Dict[str, Any],
    ) -> Dict[str, Any]:
        hydrated = dict(entities or {})
        msg_lower = message.lower()

        schedule_tools = {
            "get_own_schedule",
            "get_my_schedule",
            "get_my_schedule_targeted",
            "get_class_schedule",
            "get_other_lecturer_schedule",
            "get_lecturer_schedule_by_search",
            "get_other_student_schedule",
            "get_student_schedule_by_search",
        }

        if tool_name in schedule_tools and not (
            hydrated.get("date") or (hydrated.get("start_date") and hydrated.get("end_date"))
        ):
            if "tuần sau" in msg_lower or "tuan sau" in msg_lower or "next week" in msg_lower:
                hydrated["date"] = "NEXT_WEEK"
            elif "tuần này" in msg_lower or "tuan nay" in msg_lower or "this week" in msg_lower:
                hydrated["date"] = "THIS_WEEK"
            elif "ngày mai" in msg_lower or "ngay mai" in msg_lower or "tomorrow" in msg_lower:
                hydrated["date"] = "TOMORROW"
            elif "hôm nay" in msg_lower or "hom nay" in msg_lower or "today" in msg_lower:
                hydrated["date"] = "TODAY"

        if tool_name == "get_empty_rooms":
            if not hydrated.get("slot_number"):
                if re.search(r"(tất cả slot|tat ca slot|mọi slot|moi slot|cả ngày|ca ngay|all slots?)", msg_lower, re.IGNORECASE):
                    hydrated["slot_number"] = "ALL"
                slot_match = re.search(r"\b(?:slot|tiết|ca)\s*(\d+)\b", message, re.IGNORECASE)
                if slot_match:
                    hydrated["slot_number"] = int(slot_match.group(1))
            if not hydrated.get("date"):
                if "ngày mai" in msg_lower or "tomorrow" in msg_lower:
                    hydrated["date"] = "TOMORROW"
                elif "hôm nay" in msg_lower or "hom nay" in msg_lower or "today" in msg_lower:
                    hydrated["date"] = "TODAY"

        return hydrated

    @staticmethod
    def _merge_entities(
        base: Optional[Dict[str, Any]],
        extra: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        merged: Dict[str, Any] = {}
        for source in (base or {}, extra or {}):
            for key, value in source.items():
                if value not in (None, "", []):
                    merged[key] = value
        return merged

    @staticmethod
    def _normalize_for_debug(
        tool_name: str,
        entities: Dict[str, Any],
        user_code: str,
    ) -> Dict[str, Any]:
        normalized = normalize_entities(entities, user_code=user_code, tool_name=tool_name)
        normalized.pop("__invalid_required_fields__", None)
        return normalized

    @staticmethod
    def _infer_intent_for_tool(tool_name: str) -> str:
        if tool_name.startswith("view_"):
            return "navigation"
        if tool_name in _BACKEND_ACTION_TOOLS:
            return "action"
        return "data_query"

    def _slice_rows(
        self,
        rows: Any,
        offset: int,
        page_size: int,
    ) -> tuple[Any, Optional[Dict[str, Any]]]:
        if not isinstance(rows, list):
            return rows, None

        total = len(rows)
        safe_offset = max(0, int(offset or 0))
        page_rows = rows[safe_offset: safe_offset + page_size]

        if page_rows and isinstance(page_rows[0], dict):
            page_rows = [{**row, "__total__": total} for row in page_rows]

        next_offset = safe_offset + len(page_rows)
        continuation = None
        if next_offset < total:
            continuation = {
                "offset": next_offset,
                "pageSize": page_size,
                "total": total,
            }
        return page_rows, continuation

    def chat(
        self,
        *,
        user_id: int,
        user_role: str,
        user_code: str,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        routing_model: Optional[str] = None,
        answer_model: Optional[str] = None,
        extra_entities: Optional[Dict[str, Any]] = None,
        pending_tool: Optional[str] = None,
        original_message: Optional[str] = None,
        pending_entities: Optional[Dict[str, Any]] = None,
        continuation: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        steps: List[Dict[str, Any]] = []
        t_start = time.time()
        is_continuation_request = bool(continuation and isinstance(continuation, dict))

        def _remaining() -> float:
            return max(0, _MAX_TOTAL_SECONDS - (time.time() - t_start))

        # ── Stage 1: Normalize + Hard Router ──────────────────────────────
        preprocessed = query_preprocessor.process(message)
        routing_message = str(preprocessed.get("message") or message)
        normalize_detail = ""
        if preprocessed.get("changed"):
            normalize_detail = (
                f"Routing message: {routing_message}"
                + (
                    f" | Corrections: {', '.join(cast(List[str], preprocessed.get('corrections') or []))}"
                    if preprocessed.get("corrections")
                    else ""
                )
            )
        # ── Step 1-4: Input → Normalize → Spell correction → Hard Router ──
        steps.append(_make_step(
            1,
            "Normalize + Spell Correction + Hard Router",
            "Chuẩn hóa câu hỏi, sửa lỗi chính tả nhẹ/fuzzy và kiểm tra nhanh pattern (regex/cache).",
            normalize_detail,
        ))
        hard_result: Optional[IntentResult] = None if (pending_tool or continuation) else hard_router.route(routing_message, user_role)

        if hard_result and hard_result.intent == "direct_response":
            steps[-1]["status"] += " → Khớp mẫu trực tiếp"
            return _build_response(hard_result.answer, steps, None, None)

        if hard_result and hard_result.intent == "tool_locked":
            steps[-1]["status"] += " → Tool đang bị khóa"
            steps.append(_make_step(2, "Trend Model (Intent)", "Bỏ qua (tool đã bị khóa từ Hard Router)."))
            steps.append(_make_step(3, "LLM local (Fallback + Reasoning)", "Bỏ qua (tool đã bị khóa)."))
            steps.append(_make_step(4, "Tool (DB)", "Bỏ qua (tool bị khóa)."))
            steps.append(_make_step(5, "Response (LLM)", "Thông báo trạng thái khóa tool."))
            intent_data = _intent_result_to_dict(hard_result)
            answer = answer_generator.generate(
                message,
                intent_data,
                None,
                history,
                answer_model,
                today=datetime.now().strftime("%Y-%m-%d"),
                user_role=user_role,
            )
            return _build_response(
                answer,
                steps,
                None,
                None,
                agent=detect_agent(message, hard_result.tool_name or ""),
            )

        if hard_result:
            steps[-1]["status"] += f" → Pattern matched: {hard_result.tool_name}"
            intent_data       = _intent_result_to_dict(hard_result)
            corrected_message = message
        else:
            steps[-1]["status"] += " → Không khớp → Phân tích chuyên sâu"
            intent_data = None

        # ── Stage 2: Trend / Unified Router ───────────────────────────────
        # ── Step 5-6: Trend Model → LLM local (Fallback + Reasoning) ──────
        if is_continuation_request:
            steps[-1]["status"] += " → Bỏ qua (đang tải thêm dữ liệu)"
            steps.append(_make_step(2, "Trend Model (Intent)", "Tiếp tục phân trang cho kết quả trước đó."))
            continuation_message = str(continuation.get("originalMessage") or original_message or message)
            continuation_entities = self._merge_entities(
                cast(Optional[Dict[str, Any]], continuation.get("entities")),
                extra_entities,
            )
            continuation_entities = self._hydrate_entities_from_message(
                str(continuation.get("toolName") or ""),
                continuation_message,
                continuation_entities,
            )
            continuation_tool = str(continuation.get("toolName") or "")
            continuation_entities = self._normalize_for_debug(
                continuation_tool,
                continuation_entities,
                user_code,
            )
            continuation_entities["__page_offset__"] = int(continuation.get("offset") or 0)
            continuation_entities["__page_size__"] = int(continuation.get("pageSize") or _PAGE_SIZE)
            intent_data = {
                "intent": str(continuation.get("intent") or self._infer_intent_for_tool(continuation_tool)),
                "toolName": continuation_tool,
                "entities": continuation_entities,
                "confidence": "high",
                "agent": continuation.get("agent") or get_tool_agent(continuation_tool),
            }
            corrected_message = continuation_message
            steps[-1]["detail"] = (
                f"Continue tool: {continuation_tool} | Offset: {continuation.get('offset', 0)} | "
                f"Entities: {json.dumps(continuation_entities, ensure_ascii=False, default=str)}"
            )
            steps[-1]["status"] += " → Trang kế tiếp"
        elif pending_tool:
            steps[-1]["status"] += " → Bỏ qua (đang tiếp tục tool trước đó)"
            steps.append(_make_step(2, "Trend Model (Intent)", "Tiếp tục tool đang chờ bổ sung thông tin."))
            merged_entities = self._merge_entities(pending_entities, extra_entities)
            merged_entities = self._normalize_for_debug(pending_tool, merged_entities, user_code)
            intent_data = {
                "intent": self._infer_intent_for_tool(pending_tool),
                "toolName": pending_tool,
                "entities": merged_entities,
                "confidence": "high",
                "agent": get_tool_agent(pending_tool),
            }
            if pending_tool in _BACKEND_ACTION_TOOLS:
                intent_data["action"] = {"type": pending_tool.upper(), "params": merged_entities}
            corrected_message = original_message or message
            steps[-1]["detail"] = (
                f"Resume tool: {pending_tool} | Agent: {intent_data.get('agent')} | "
                f"Entities: {json.dumps(merged_entities, ensure_ascii=False, default=str)}"
            )
            steps[-1]["status"] += " → Dùng dữ liệu bổ sung"
        elif intent_data is None:
            active_routing_model = routing_model or "llama-3.1-8b-instant"
            use_llm_router = _should_use_llm_router(routing_message, preprocessed)
            steps.append(_make_step(2, "Trend Model (Intent)",
                "Ưu tiên Trend Model cho câu ngắn. Nếu câu quá dài hoặc Trend hụt → fallback sang LLM local."))
            
            # ✅ v6.0: Logic routing theo yêu cầu User
            # Nếu câu ngắn -> ưu tiên Trend
            # Nếu câu dài -> ưu tiên LLM
            if use_llm_router:
                try:
                    intent_data = light_router.route(
                        routing_message, user_role, user_code, history, active_routing_model
                    )
                    steps[-1]["status"] += " → LLM local (câu dài)"
                except Exception as exc:
                    logger.error(f"[ChatbotService] LLM routing failed: {exc}")
                    steps[-1]["status"] += " → LLM lỗi"
            
            if intent_data is None:
                # Thử Trend Router (Step 5)
                intent_data = trend_router.route(routing_message, user_role, user_code, history)
                if intent_data:
                    steps[-1]["status"] += " → Trend matched"
                else:
                    # Thử ML Classifier (nếu có)
                    intent_data = ml_intent_classifier.classify(routing_message, user_role, user_code, history)
                    if intent_data:
                        steps[-1]["status"] += " → ML matched"
            
            if intent_data is None and not use_llm_router:
                # Fallback sang LLM cho câu ngắn nếu Trend/ML hụt (Step 6)
                try:
                    intent_data = light_router.route(
                        routing_message, user_role, user_code, history, active_routing_model
                    )
                    steps[-1]["status"] += " → LLM local (fallback)"
                except Exception as exc:
                    logger.error(f"[ChatbotService] LLM fallback failed: {exc}")

            if intent_data is None:
                intent_data = _trend_only_fallback(routing_message)
                steps[-1]["status"] += " → Trend/ML fallback"
                steps[-1]["detail"] = (
                    f"TrendRouter và MLIntentClassifier chưa khớp"
                    + (
                        ", sau khi đã thử LLM path cho câu dài"
                        if use_llm_router
                        else ", câu hỏi cũng chưa vượt ngưỡng dài"
                    )
                    + " "
                    f"({_LONG_MESSAGE_TOKEN_THRESHOLD} tokens / {_LONG_MESSAGE_CHAR_THRESHOLD} chars)."
                )

            confidence = intent_data.get("confidence", "medium")
            corrected_message = message
            intent_data["entities"] = self._merge_entities(
                cast(Optional[Dict[str, Any]], intent_data.get("entities")),
                extra_entities,
            )
            routed_tool_name = str(intent_data.get("toolName") or "")
            if routed_tool_name:
                intent_data["entities"] = self._normalize_for_debug(
                    routed_tool_name,
                    cast(Dict[str, Any], intent_data.get("entities") or {}),
                    user_code,
                )
            detail_parts = []
            detail_parts.append(
                f"Intent: {intent_data.get('intent')} | Tool: {intent_data.get('toolName')} | "
                f"Confidence: {confidence} | "
                f"Entities: {json.dumps(intent_data.get('entities', {}), ensure_ascii=False, default=str)}"
            )
            existing_detail = str(steps[-1].get("detail") or "").strip()
            steps[-1]["detail"] = "\n".join([part for part in [existing_detail, *detail_parts] if part])
            if "Trend matched" not in steps[-1]["status"]:
                steps[-1]["status"] += f" → Phân tích xong ({confidence})"
        else:
            steps.append(_make_step(2, "Trend / ML / Unified Router", "Bỏ qua (Hard Router đã khớp)"))
            corrected_message = message
            intent_data["entities"] = self._merge_entities(
                cast(Optional[Dict[str, Any]], intent_data.get("entities")),
                extra_entities,
            )
            existing_tool_name = str(intent_data.get("toolName") or "")
            if existing_tool_name:
                intent_data["entities"] = self._normalize_for_debug(
                    existing_tool_name,
                    cast(Dict[str, Any], intent_data.get("entities") or {}),
                    user_code,
                )

        # ── Handle need_clarification (hỏi lại khi không hiểu) ─────────────
        if intent_data.get("intent") == "need_clarification" or (
            intent_data.get("confidence") == "low"
            and not intent_data.get("toolName")
            and intent_data.get("intent") not in ("general_chat", "permission_denied", "direct_response", "navigation")
        ):
            missing_info = intent_data.get("entities", {}).get("missingInfo")
            if not missing_info:
                missing_info = "Xin lỗi, tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể mô tả chi tiết hơn không?"
            steps.append(_make_step(3, "Clarification", "Cần làm rõ yêu cầu"))
            steps.append(_make_step(4, "Answer Generator", "Tạo câu hỏi làm rõ"))
            return _build_response(
                f"❓ {missing_info}",
                steps,
                None,
                None,
                agent=cast(Optional[str], intent_data.get("agent")) or detect_agent(message),
            )

        if intent_data.get("intent") == "tool_locked":
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (tool bị khóa)."))
            steps.append(_make_step(4, "Answer Generator", "Thông báo trạng thái khóa tool."))
            answer = answer_generator.generate(
                corrected_message,
                intent_data,
                None,
                history,
                answer_model,
                today=datetime.now().strftime("%Y-%m-%d"),
                user_role=user_role,
            )
            return _build_response(
                answer,
                steps,
                None,
                None,
                agent=cast(Optional[str], intent_data.get("agent")),
            )

        current_tool_name = (intent_data.get("toolName") or "").strip()
        if not current_tool_name and intent_data.get("intent") == "general_chat":
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không khớp tool ngoài lề nào trong hệ thống)."))
            steps.append(_make_step(4, "Answer Generator", "Trả về thông báo chức năng chưa được hệ thống hỗ trợ."))
            return _build_response(
                _ERR_UNSUPPORTED,
                steps,
                None,
                None,
                agent=cast(Optional[str], intent_data.get("agent")) or detect_agent(message),
            )
        if not current_tool_name and intent_data.get("intent") not in ("general_chat", "need_clarification", "permission_denied", "direct_response", "navigation"):
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không khớp tool nào trong hệ thống)."))
            steps.append(_make_step(4, "Answer Generator", "Trả về thông báo chức năng chưa được hệ thống hỗ trợ."))
            return _build_response(
                _ERR_UNSUPPORTED,
                steps,
                None,
                None,
                agent=cast(Optional[str], intent_data.get("agent")) or detect_agent(message),
            )
        if current_tool_name and not is_kept_tool(current_tool_name) and current_tool_name not in _AI_ONLY_TOOLS:
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (tool đã bị loại khỏi inventory lõi)."))
            steps.append(_make_step(4, "Answer Generator", "Trả về thông báo chức năng chưa được hệ thống hỗ trợ."))
            return _build_response(
                _ERR_UNSUPPORTED,
                steps,
                None,
                None,
                agent=cast(Optional[str], intent_data.get("agent")) or detect_agent(message),
            )

        # ── Permission check ──────────────────────────────────────────────
        tool_name = (intent_data.get("toolName") or "").strip()
        intent_data["agent"] = intent_data.get("agent") or (get_tool_agent(tool_name) if tool_name else detect_agent(message))
        if tool_name and tool_name not in _AI_ONLY_TOOLS and not tool_name.startswith("view_"):
            allowed, reason = check_permission(user_role, tool_name)
            if not allowed:
                intent_data = {
                    "intent": "permission_denied",
                    "entities": {"reason": reason},
                    "toolName": None,
                    "agent": detect_agent(message, tool_name),
                }

        tool_name = (intent_data.get("toolName") or "").strip()
        if tool_name:
            intent_data["entities"] = self._hydrate_entities_from_message(
                tool_name,
                original_message or corrected_message,
                cast(Dict[str, Any], intent_data.get("entities") or {}),
            )

        # ── Validate required entities before executor ───────────────────
        tool_name = (intent_data.get("toolName") or "").strip()
        if (
            tool_name
            and tool_name not in _AI_ONLY_TOOLS
            and not is_continuation_request
            and intent_data.get("intent") not in ("navigation", "permission_denied", "tool_locked", "direct_response")
        ):
            validated_entities = validate_required_entities(
                tool_name,
                cast(Dict[str, Any], intent_data.get("entities") or {}),
            )
            lecturer_class_notification_missing = (
                tool_name == "create_notification"
                and user_role == "LECTURER"
                and str(validated_entities.get("target_type") or "").strip().upper() == "CLASS"
                and not str(validated_entities.get("class_name") or "").strip()
            )
            if lecturer_class_notification_missing:
                steps.append(_make_step(3, "Tool Executor", "Dừng trước khi gọi tool vì thiếu lớp mục tiêu cho thông báo."))
                steps[-1]["detail"] = "Giảng viên gửi thông báo theo lớp cần chỉ rõ mã lớp đang giảng dạy."
                steps.append(_make_step(4, "Answer Generator", "Yêu cầu người dùng bổ sung mã lớp trước khi gửi thông báo."))
                pending_entities = {k: v for k, v in validated_entities.items() if not str(k).startswith("__")}
                return _build_response(
                    "Tôi cần mã lớp bạn đang giảng dạy để gửi thông báo đúng đối tượng.",
                    steps,
                    None,
                    None,
                    agent=cast(Optional[str], intent_data.get("agent")),
                    missing_fields=_build_retry_fields(["class_name"]),
                    pending_tool=tool_name,
                    original_message=original_message or corrected_message,
                    pending_entities=pending_entities,
                )
            action_confirmed = str(validated_entities.get("__action_confirmed__") or "").strip().lower() in {
                "1", "true", "yes", "on"
            }
            should_review_action = (
                intent_data.get("intent") == "action"
                and require_all_required_fields(tool_name)
                and bool(build_action_review_fields(tool_name, validated_entities))
            )
            if should_review_action and not action_confirmed:
                steps.append(_make_step(3, "Tool Executor", "Tạm dừng để người dùng xác nhận thông tin thực hiện action."))
                steps[-1]["detail"] = "Hiển thị lại đầy đủ các trường bắt buộc để kiểm tra hoặc chỉnh sửa trước khi thực hiện."
                steps.append(_make_step(4, "Answer Generator", "Hiển thị bảng xác nhận thông tin action."))
                return _build_response(
                    "Vui lòng kiểm tra và xác nhận thông tin bên dưới trước khi thực hiện thao tác.",
                    steps,
                    None,
                    None,
                    agent=cast(Optional[str], intent_data.get("agent")),
                    missing_fields=build_action_review_fields(tool_name, validated_entities),
                    pending_tool=tool_name,
                    original_message=original_message or corrected_message,
                    pending_entities={k: v for k, v in validated_entities.items() if not str(k).startswith("__")},
                    action_review=True,
                )
            if (
                user_role == "ACADEMIC_STAFF"
                and tool_name in _ACADEMIC_STUDENT_CONTEXT_TOOLS
                and not str(validated_entities.get("student_code") or "").strip()
            ):
                steps.append(_make_step(3, "Tool Executor", "Dừng trước khi gọi tool vì thiếu hoặc sai tham số bắt buộc.", "Thiếu mã sinh viên cho chế độ tra cứu của nhân viên đào tạo."))
                steps.append(_make_step(4, "Answer Generator", "Yêu cầu người dùng bổ sung đúng định dạng."))
                pending_entities = {k: v for k, v in validated_entities.items() if not str(k).startswith("__")}
                return _build_response(
                    "Tôi cần mã sinh viên để tra cứu điểm danh cho sinh viên cụ thể. Vui lòng điền vào bảng bên dưới.",
                    steps,
                    None,
                    None,
                    agent=cast(Optional[str], intent_data.get("agent")),
                    missing_fields=_academic_student_code_missing_fields(),
                    pending_tool=tool_name,
                    original_message=original_message or corrected_message,
                    pending_entities=pending_entities,
                )
            invalid_required_fields = cast(List[str], validated_entities.get("__invalid_required_fields__") or [])
            allow_schedule_request_by_slot_ids = False
            if tool_name == "create_schedule_request":
                original_slot_id = str(validated_entities.get("original_slot_id") or "").strip()
                requested_slot_id = str(validated_entities.get("requested_slot_id") or "").strip()
                reason = str(validated_entities.get("reason") or "").strip()
                allow_schedule_request_by_slot_ids = (
                    original_slot_id.isdigit() and requested_slot_id.isdigit() and bool(reason)
                )

            required_missing = [] if allow_schedule_request_by_slot_ids else build_missing_fields(tool_name, validated_entities)
            if not allow_schedule_request_by_slot_ids and not has_enough_required_entities(tool_name, validated_entities):
                steps.append(_make_step(3, "Tool Executor", "Dừng trước khi gọi tool vì thiếu hoặc sai tham số bắt buộc."))
                if invalid_required_fields:
                    steps[-1]["detail"] = (
                        "Tham số bắt buộc chưa hợp lệ: "
                        + ", ".join(invalid_required_fields)
                    )
                else:
                    steps[-1]["detail"] = "Thiếu tham số bắt buộc."
                steps.append(_make_step(4, "Answer Generator", "Yêu cầu người dùng bổ sung đúng định dạng."))
                review_fields = build_action_review_fields(tool_name, validated_entities) if should_review_action else required_missing
                return _build_response(
                    "Vui lòng kiểm tra và hoàn thiện đầy đủ thông tin bên dưới trước khi thực hiện thao tác."
                    if should_review_action
                    else "Tôi cần thêm thông tin hợp lệ để xử lý chính xác. Vui lòng điền vào bảng bên dưới.",
                    steps,
                    None,
                    None,
                    agent=cast(Optional[str], intent_data.get("agent")),
                    missing_fields=review_fields,
                    pending_tool=tool_name,
                    original_message=original_message or corrected_message,
                    pending_entities={k: v for k, v in validated_entities.items() if not str(k).startswith("__")},
                    action_review=should_review_action,
                )
            validated_entities.pop("__invalid_required_fields__", None)
            validated_entities.pop("__action_confirmed__", None)
            intent_data["entities"] = validated_entities

        # ── Step 7: Tool (DB) ───────────────────────────────────────────────
        tool_result = None
        continuation_response = None
        intent      = (intent_data.get("intent") or "").strip().lower()
        tool_name   = (intent_data.get("toolName") or "").strip()
        needs_tool  = bool((tool_name and tool_name not in _AI_ONLY_TOOLS) or intent_data.get("dynamicSql"))
        is_backend  = tool_name in _BACKEND_ACTION_TOOLS
        if is_backend and not (tool_name or intent_data.get("action")):
            is_backend = False

        if is_backend:
            steps.append(_make_step(3, "Tool (DB)", "Chuẩn bị tham số hành động backend."))
            intent_data = cast(Dict[str, Any], intent_data)
            intent_data["intent"] = "action"
            intent = "action"
            action = intent_data.get("action")
            if not action or not isinstance(action, dict):
                action = {"type": tool_name.upper(), "params": intent_data.get("entities", {})}
                intent_data["action"] = action
            else:
                if tool_name in _BACKEND_ACTION_TOOLS:
                    action["type"] = tool_name.upper()
                if not action.get("params"):
                    action["params"] = intent_data.get("entities", {})
            steps[-1]["detail"]  = f"Action: {json.dumps(action, ensure_ascii=False, default=str)}"
            steps[-1]["status"] += " → Tham số đã sẵn sàng"
            steps.append(_make_step(4, "Response (LLM)", "Bỏ qua sinh câu trả lời mô tả vì đây là action backend."))
            steps[-1]["status"] += " → Chuyển sang backend"
            return _build_response(
                "Đang thực hiện thao tác theo yêu cầu của bạn.",
                steps,
                None,
                cast(Optional[Dict[str, Any]], intent_data.get("action")),
                agent=cast(Optional[str], intent_data.get("agent")),
            )

        elif needs_tool and intent not in ("permission_denied", "direct_response"):
            steps.append(_make_step(3, "Tool (DB)", "Truy vấn dữ liệu từ Database."))
            sub_intents = intent_data.get("sub_intents")
            if sub_intents and isinstance(sub_intents, list):
                multi = []
                for si in sub_intents:
                    res = tool_executor.execute(si, user_id, user_role, user_code)
                    multi.append({"tool": si.get("toolName"), "entities": si.get("entities"), "data": res})
                tool_result = multi
                steps[-1]["status"] += f" → {len(sub_intents)} sub-queries xong"
            else:
                tool_result = tool_executor.execute(intent_data, user_id, user_role, user_code)
                
                # ✅ FIX: Nếu thiếu trường bắt buộc → hỏi lại người dùng, KHÔNG bịa dữ liệu
                if isinstance(tool_result, dict) and tool_result.get("__missing_field__"):
                    error_msg = tool_result.get("error", "Thiếu thông tin")
                    tool_name_err = tool_result.get("tool", "")
                    steps[-1]["status"] += f" → Thiếu thông tin"
                    steps[-1]["detail"] = f"Lỗi: {error_msg}"
                    entities = cast(Dict[str, Any], intent_data.get("entities") or {})
                    missing_fields = build_missing_fields(tool_name_err or tool_name, entities)
                    clarify_msg = self._generate_clarification_question(error_msg, tool_name_err, message)
                    steps.append(_make_step(4, "Answer Generator", "Yêu cầu làm rõ thông tin"))
                    return _build_response(
                        clarify_msg,
                        steps,
                        None,
                        None,
                        agent=cast(Optional[str], intent_data.get("agent")),
                        missing_fields=missing_fields,
                        pending_tool=tool_name_err or tool_name,
                        original_message=original_message or corrected_message,
                        pending_entities={k: v for k, v in entities.items() if not str(k).startswith("__")},
                    )
                
                # ✅ FIX: Ensure tool_result is always a list (even if empty or None from executor)
                if tool_result is None:
                    tool_result = []
                if isinstance(tool_result, dict) and "__paginated_rows__" in tool_result:
                    current_offset = int(tool_result.get("__offset__") or 0)
                    page_size = int(tool_result.get("__page_size__") or _PAGE_SIZE)
                    total = int(tool_result.get("__total__") or 0)
                    page_rows = cast(List[Dict[str, Any]], tool_result.get("__paginated_rows__") or [])
                    if page_rows and isinstance(page_rows[0], dict):
                        page_rows = [{**row, "__total__": total} for row in page_rows]
                    next_offset = current_offset + len(page_rows)
                    if next_offset < total:
                        continuation_response = {
                            "toolName": tool_name,
                            "intent": intent,
                            "entities": intent_data.get("entities", {}),
                            "agent": intent_data.get("agent"),
                            "originalMessage": original_message or corrected_message,
                            "offset": next_offset,
                            "pageSize": page_size,
                            "total": total,
                        }
                    tool_result = page_rows
                    count = len(tool_result)
                else:
                    count = len(tool_result) if isinstance(tool_result, list) else "-"
                    current_offset = int((continuation or {}).get("offset") or 0)
                    tool_result, page_meta = self._slice_rows(
                        tool_result,
                        current_offset,
                        _PAGE_SIZE,
                    )
                    if page_meta:
                        continuation_response = {
                            "toolName": tool_name,
                            "intent": intent,
                            "entities": intent_data.get("entities", {}),
                            "agent": intent_data.get("agent"),
                            "originalMessage": original_message or corrected_message,
                            **page_meta,
                        }
                steps[-1]["status"] += f" → {count} dòng kết quả"
                if isinstance(tool_result, list) and not tool_result:
                    retry_fields = _build_empty_result_retry(
                        tool_name,
                        cast(Dict[str, Any], intent_data.get("entities") or {}),
                    )
                    if retry_fields:
                        steps[-1]["status"] = "Không tìm thấy dữ liệu khớp"
                        steps[-1]["detail"] = (
                            "Không tìm thấy bản ghi phù hợp với mã/ngành/lớp/môn đã nhập. "
                            "Yêu cầu người dùng kiểm tra lại thông tin."
                        )
                        steps.append(_make_step(4, "Response (LLM)", "Yêu cầu người dùng nhập lại thông tin định danh."))
                        return _build_response(
                            "Tôi không tìm thấy dữ liệu khớp chính xác. Vui lòng kiểm tra và nhập lại thông tin bên dưới.",
                            steps,
                            None,
                            None,
                            agent=cast(Optional[str], intent_data.get("agent")),
                            missing_fields=retry_fields,
                            pending_tool=tool_name,
                            original_message=original_message or corrected_message,
                            pending_entities={k: v for k, v in cast(Dict[str, Any], intent_data.get("entities") or {}).items() if not str(k).startswith("__")},
                        )
            if tool_result and (isinstance(tool_result, list) and len(tool_result) > 0 or not isinstance(tool_result, list)):
                sample = tool_result[:3] if isinstance(tool_result, list) else tool_result
                steps[-1]["detail"] = f"Sample: {json.dumps(sample, ensure_ascii=False, default=str)}"
        else:
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không cần truy vấn DB)."))

        # ── Step 8: Response (LLM) ──────────────────────────────────────────
        steps.append(_make_step(4, "Response (LLM)", "Tổng hợp câu trả lời cuối cùng."))
        today_str = datetime.now().strftime("%Y-%m-%d")

        # ✅ Timeout budget: nếu đã dùng gần hết 7s → fallback answer (không gọi LLM)
        remaining = _remaining()
        if remaining < 1.5 and tool_result:
            logger.warning(f"[ChatbotService] Budget exhausted ({remaining:.1f}s left) → fallback answer")
            answer = _fallback_answer(tool_result, tool_name)
            steps[-1]["status"] += " → Fallback (hết thời gian)"
        else:
            try:
                answer = answer_generator.generate(
                    corrected_message,
                    intent_data,
                    tool_result,
                    history,
                    answer_model,
                    today=today_str,
                    user_role=user_role,
                )
            except RuntimeError as exc:
                if _is_rate_limit_error(exc) and tool_result:
                    answer = _fallback_answer(tool_result, tool_name)
                    logger.warning("[ChatbotService] Rate limited → fallback answer from data")
                else:
                    answer = _ERR_RATE_LIMIT if _is_rate_limit_error(exc) else _ERR_SYSTEM
                logger.error(f"[ChatbotService] AnswerGenerator exhausted: {exc}")
            except Exception as exc:
                logger.error(f"[ChatbotService] AnswerGenerator error: {exc}")
                if tool_result:
                    answer = _fallback_answer(tool_result, tool_name)
                else:
                    answer = _ERR_SYSTEM

        steps[-1]["status"] += " → Hoàn thành"
        redirect = _resolve_redirect(tool_name, intent_data.get("redirectPath"), user_role, intent_data.get("entities"))
        return _build_response(
            answer,
            steps,
            redirect,
            intent_data.get("action"),
            agent=cast(Optional[str], intent_data.get("agent")),
            continuation=continuation_response,
        )

    def chat_stream(
        self,
        *,
        user_id: int,
        user_role: str,
        user_code: str,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        routing_model: Optional[str] = None,
        answer_model: Optional[str] = None,
        extra_entities: Optional[Dict[str, Any]] = None,
        pending_tool: Optional[str] = None,
        original_message: Optional[str] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        steps: List[Dict[str, Any]] = []
        t_start = time.time()

        def _remaining() -> float:
            return max(0, _MAX_TOTAL_SECONDS - (time.time() - t_start))

        # Stage 1
        preprocessed = query_preprocessor.process(message)
        routing_message = str(preprocessed.get("message") or message)
        normalize_detail = ""
        if preprocessed.get("changed"):
            normalize_detail = (
                f"Routing message: {routing_message}"
                + (
                    f" | Corrections: {', '.join(cast(List[str], preprocessed.get('corrections') or []))}"
                    if preprocessed.get("corrections")
                    else ""
                )
            )
        # ── Step 1-4: Input → Normalize → Spell correction → Hard Router ──
        steps.append(_make_step(1, "Normalize + Spell Correction + Hard Router", "Chuẩn hóa câu hỏi và kiểm tra nhanh pattern.", normalize_detail))
        yield {"type": "step", "step": steps[-1]}

        hard_result: Optional[IntentResult] = None if pending_tool else hard_router.route(routing_message, user_role)
        if hard_result and hard_result.intent == "direct_response":
            steps[-1]["status"] += " → Khớp mẫu trực tiếp"
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": hard_result.answer}
            return

        if hard_result and hard_result.intent == "tool_locked":
            steps[-1]["status"] += " → Tool đang bị khóa"
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": f"🔒 **Công cụ đã bị khóa**: Công cụ '{hard_result.tool_name}' hiện đang bị khóa."}
            return

        if hard_result:
            steps[-1]["status"] += f" → Pattern matched: {hard_result.tool_name}"
            intent_data, corrected_message = _intent_result_to_dict(hard_result), message
        else:
            steps[-1]["status"] += " → Không khớp → Trend/LLM path"
            intent_data = None
        yield {"type": "step", "step": steps[-1]}

        # ── Step 5-6: Trend Model → LLM local (Fallback + Reasoning) ──────
        if pending_tool:
            steps.append(_make_step(2, "Trend Model (Intent)", "Tiếp tục tool đang chờ bổ sung thông tin."))
            merged_entities = self._merge_entities({}, extra_entities)
            intent_data = {
                "intent": self._infer_intent_for_tool(pending_tool),
                "toolName": pending_tool,
                "entities": merged_entities,
                "confidence": "high",
                "agent": get_tool_agent(pending_tool),
            }
            if pending_tool in _BACKEND_ACTION_TOOLS:
                intent_data["action"] = {"type": pending_tool.upper(), "params": merged_entities}
            corrected_message = original_message or message
            steps[-1]["detail"] = f"Resume tool: {pending_tool}"
            steps[-1]["status"] += " → Dùng dữ liệu bổ sung"
        elif intent_data is None:
            use_llm_router = _should_use_llm_router(routing_message, preprocessed)
            steps.append(_make_step(2, "Trend Model (Intent)", "Câu ngắn: Trend Router rồi LLM local fallback. Câu dài: ưu tiên LLM local router."))
            yield {"type": "step", "step": steps[-1]}
            
            # ✅ v6.0 logic in stream
            if use_llm_router:
                try:
                    intent_data = light_router.route(
                        routing_message, user_role, user_code, history,
                        routing_model or "llama-3.1-8b-instant"
                    )
                    steps[-1]["status"] += " → LLM local (câu dài)"
                except Exception as exc:
                    logger.error(f"[Stream] LLM routing failed: {exc}")
                    steps[-1]["status"] += " → LLM lỗi"

            if intent_data is None:
                intent_data = trend_router.route(routing_message, user_role, user_code, history)
                if intent_data:
                    steps[-1]["status"] += " → Trend matched"
                else:
                    intent_data = ml_intent_classifier.classify(routing_message, user_role, user_code, history)
                    if intent_data:
                        steps[-1]["status"] += " → ML matched"

            if intent_data is None and not use_llm_router:
                # LLM local fallback for short messages
                try:
                    intent_data = light_router.route(
                        routing_message, user_role, user_code, history,
                        routing_model or "llama-3.1-8b-instant"
                    )
                    steps[-1]["status"] += " → LLM local (fallback)"
                except Exception as exc:
                    logger.error(f"[Stream] LLM fallback failed: {exc}")

            if intent_data is None:
                intent_data = _trend_only_fallback(routing_message)
                steps[-1]["status"] += " → Trend/ML fallback"

            confidence        = intent_data.get("confidence", "medium")
            corrected_message = message
            intent_data["entities"] = self._merge_entities(
                cast(Optional[Dict[str, Any]], intent_data.get("entities")),
                extra_entities,
            )
            extra_detail = f"Intent: {intent_data.get('intent')} | Tool: {intent_data.get('toolName')} | Confidence: {confidence}"
            existing_detail = str(steps[-1].get("detail") or "").strip()
            steps[-1]["detail"] = "\n".join([part for part in [existing_detail, extra_detail] if part])
            if "Trend matched" not in steps[-1]["status"]:
                steps[-1]["status"] += f" → Xong ({confidence})"
        else:
            steps.append(_make_step(2, "Trend / ML / Unified Router", "Bỏ qua (Hard Router matched)."))
            corrected_message = message
            intent_data["entities"] = self._merge_entities(
                cast(Optional[Dict[str, Any]], intent_data.get("entities")),
                extra_entities,
            )
        yield {"type": "step", "step": steps[-1]}

        if intent_data.get("intent") == "tool_locked":
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (tool bị khóa)."))
            yield {"type": "step", "step": steps[-1]}
            yield {
                "type": "answer",
                "chunk": f"🔒 **Công cụ đã bị khóa**: {(intent_data.get('entities') or {}).get('reason', 'Công cụ này hiện đang bị khóa.')}",
            }
            return

        current_tool_name = (intent_data.get("toolName") or "").strip()
        if not current_tool_name and intent_data.get("intent") == "general_chat":
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không khớp tool ngoài lề nào trong hệ thống)."))
            yield {"type": "step", "step": steps[-1]}
            steps.append(_make_step(4, "Answer Generator", "Trả về thông báo chức năng chưa được hệ thống hỗ trợ."))
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": _ERR_UNSUPPORTED}
            return
        if not current_tool_name and intent_data.get("intent") not in ("general_chat", "need_clarification", "permission_denied", "direct_response", "navigation"):
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không khớp tool nào trong hệ thống)."))
            yield {"type": "step", "step": steps[-1]}
            steps.append(_make_step(4, "Answer Generator", "Trả về thông báo chức năng chưa được hệ thống hỗ trợ."))
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": _ERR_UNSUPPORTED}
            return

        # ── Step 7: Tool (DB) ───────────────────────────────────────────────
        tool_result = None
        intent    = (intent_data.get("intent") or "").strip().lower()
        tool_name = (intent_data.get("toolName") or "").strip()
        intent_data["agent"] = intent_data.get("agent") or (get_tool_agent(tool_name) if tool_name else detect_agent(message))
        needs_tool = bool((tool_name and tool_name not in _AI_ONLY_TOOLS) or intent_data.get("dynamicSql"))

        if tool_name in _BACKEND_ACTION_TOOLS:
            steps.append(_make_step(3, "Tool (DB)", "Chuẩn bị action backend."))
            yield {"type": "step", "step": steps[-1]}
            intent_data["intent"] = "action"
            action = intent_data.get("action")
            if not action or not isinstance(action, dict):
                action = {"type": tool_name.upper(), "params": intent_data.get("entities", {})}
                intent_data["action"] = action
            else:
                if tool_name in _BACKEND_ACTION_TOOLS:
                    action["type"] = tool_name.upper()
                if not action.get("params"):
                    action["params"] = intent_data.get("entities", {})
            steps[-1]["detail"]  = f"Action: {json.dumps(action, ensure_ascii=False, default=str)}"
            steps[-1]["status"] += " → Tham số sẵn sàng"
            yield {"type": "action", "action": action}
            yield {"type": "step",   "step": steps[-1]}
            steps.append(_make_step(4, "Response (LLM)", "Bỏ qua sinh câu trả lời mô tả vì đây là action backend."))
            steps[-1]["status"] += " → Chuyển sang backend"
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": "Đang thực hiện thao tác theo yêu cầu của bạn."}
            return

        elif needs_tool and intent not in ("permission_denied", "direct_response"):
            steps.append(_make_step(3, "Tool (DB)", "Truy vấn Database."))
            yield {"type": "step", "step": steps[-1]}
            sub_intents = intent_data.get("sub_intents")
            if sub_intents and isinstance(sub_intents, list):
                # ... logic sub_intents ...
                multi = []
                for si in sub_intents:
                    res = tool_executor.execute(si, user_id, user_role, user_code)
                    multi.append({"tool": si.get("toolName"), "entities": si.get("entities"), "data": res})
                tool_result = multi
                steps[-1]["status"] += f" → {len(sub_intents)} sub-queries xong"
            else:
                tool_result = tool_executor.execute(intent_data, user_id, user_role, user_code)
                if tool_result is None:
                    tool_result = []
                count = len(tool_result) if isinstance(tool_result, list) else "-"
                steps[-1]["status"] += f" → {count} dòng"
            if tool_result and (isinstance(tool_result, list) and len(tool_result) > 0 or not isinstance(tool_result, list)):
                sample = tool_result[:3] if isinstance(tool_result, list) else tool_result
                steps[-1]["detail"] = f"Sample: {json.dumps(sample, ensure_ascii=False, default=str)}"
            yield {"type": "step", "step": steps[-1]}
        else:
            steps.append(_make_step(3, "Tool (DB)", "Bỏ qua (không cần truy vấn DB)."))
            yield {"type": "step", "step": steps[-1]}

        # Stage 4: Stream answer
        steps.append(_make_step(4, "Response (LLM)", "Tổng hợp câu trả lời."))
        yield {"type": "step", "step": steps[-1]}

        redirect = _resolve_redirect(tool_name, intent_data.get("redirectPath"), user_role, intent_data.get("entities"))
        if redirect:
            yield {"type": "redirect", "path": redirect}

        today_str = datetime.now().strftime("%Y-%m-%d")

        # ✅ Timeout budget: nếu đã dùng gần hết 7s → fallback answer
        remaining = _remaining()
        if remaining < 1.5 and tool_result:
            logger.warning(f"[Stream] Budget exhausted ({remaining:.1f}s left) → fallback answer")
            yield {"type": "answer", "chunk": _fallback_answer(tool_result, tool_name)}
        else:
            try:
                for chunk in answer_generator.generate_stream(
                    corrected_message,
                    intent_data,
                    tool_result,
                    history,
                    answer_model,
                    today=today_str,
                    user_role=user_role,
                ):
                    yield {"type": "answer", "chunk": chunk}
            except RuntimeError as exc:
                if _is_rate_limit_error(exc) and tool_result:
                    logger.warning("[Stream] Rate limited → fallback answer")
                    yield {"type": "answer", "chunk": _fallback_answer(tool_result, tool_name)}
                else:
                    err = _ERR_RATE_LIMIT if _is_rate_limit_error(exc) else _ERR_SYSTEM
                    logger.error(f"[Stream] AnswerGenerator failed: {exc}")
                    yield {"type": "answer", "chunk": err}
            except Exception as exc:
                logger.error(f"[Stream] AnswerGenerator error: {exc}")
                if tool_result:
                    yield {"type": "answer", "chunk": _fallback_answer(tool_result, tool_name)}
                else:
                    yield {"type": "answer", "chunk": _ERR_SYSTEM}

        steps[-1]["status"] += " → Hoàn thành"
        yield {"type": "step", "step": steps[-1]}

    # ── Excel ─────────────────────────────────────────────────────────────────
    def chat_with_excel(
        self,
        *,
        user_id: int,
        user_role: str,
        user_code: str,
        file_content: bytes,
        filename: str,
        history: Optional[List[Dict[str, str]]] = None,
        routing_model: Optional[str] = None,
        answer_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        steps: List[Dict[str, Any]] = []
        steps.append(_make_step(1, "Excel Analysis", "Đang phân tích file..."))
        excel_summary = self._parse_excel(file_content, filename)
        steps[-1]["status"] = f"Done — {len(excel_summary)} chars"

        synthetic_message = (
            f"Tôi đã tải lên file '{filename}'. Dữ liệu:\n\n{excel_summary}\n\n"
            "Hãy phân tích và trả lời các câu hỏi về dữ liệu này."
        )
        try:
            intent_data = light_router.route(
                synthetic_message, user_role, user_code, history,
                routing_model or "llama-3.1-8b-instant"
            )
        except Exception as exc:
            logger.error(f"[Excel] LightRouter failed: {exc}")
            intent_data = {"intent": "data_query", "toolName": "excel_query", "entities": {}}
        steps.append(_make_step(2, "Intent", f"Intent: {intent_data.get('intent')}"))

        try:
            answer = answer_generator.generate(
                synthetic_message, intent_data,
                {"excel_summary": excel_summary}, history, answer_model
            )
        except Exception as exc:
            logger.error(f"[Excel] AnswerGenerator failed: {exc}")
            answer = _ERR_SYSTEM
        steps.append(_make_step(3, "Response (LLM)", "Done"))

        return {
            "answer":        answer,
            "thinkingSteps": steps,
            "excelSummary":  excel_summary,
            "action":        intent_data.get("action"),
            "redirectPath":  _resolve_redirect(
                intent_data.get("toolName") or "",
                intent_data.get("redirectPath"),
                user_role,
                intent_data.get("entities"),
            ),
        }

    @staticmethod
    def _parse_excel(content: bytes, filename: str) -> str:
        try:
            df = pd.read_excel(io.BytesIO(content))
            rows, cols = df.shape
            full = df.to_string(index=False)
            if len(full) > 100_000:
                full = df.head(500).to_string(index=False) + "\n\n...(đã lược bớt)..."
            numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
            stats = f"\nThống kê:\n{df[numeric_cols].describe().to_string()}" if numeric_cols else ""
            return (
                f"File: {filename}\nKích thước: {rows} hàng, {cols} cột\n"
                f"Cột: {', '.join(df.columns.tolist())}\n\nDữ liệu:\n{full}\n{stats}"
            )
        except Exception as exc:
            logger.error(f"Excel parse error '{filename}': {exc}")
            return f"Không thể phân tích file: {exc}"


chatbot_service = ChatbotService()
