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
import time
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

import pandas as pd # type: ignore
from loguru import logger # type: ignore

from router.hard_router import hard_router, IntentResult
from router.light_router import light_router
from router.permissions import check_permission
from services.answer_generator import answer_generator
from tools.executor import tool_executor

# ── Timeout budget ────────────────────────────────────────────────────────────
_MAX_TOTAL_SECONDS = 7.0   # Tối đa 7s cho toàn bộ flow

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
    "create_notification", "send_email", "create_user", "update_user", "delete_user",
    "create_major", "update_major", "create_course", "update_course",
    "create_specialization", "create_room", "create_semester",
    "create_sub_specialization", "create_class",
    "add_student_to_class", "remove_student_from_class",
}

_ERR_RATE_LIMIT = "⚠️ Hệ thống AI đang quá tải. Vui lòng thử lại sau 30 giây."
_ERR_SYSTEM     = "⚠️ Hệ thống gặp sự cố. Vui lòng thử lại."


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
                parts = []
                for k, v in row.items():
                    if v is not None and v != "" and v != 0:
                        parts.append(f"**{k}**: {v}")
                lines.append(f"{i+1}. " + " | ".join(parts[:5]))
            else:
                lines.append(f"{i+1}. {row}")
        if len(tool_result) > 10:
            lines.append(f"... và {len(tool_result) - 10} mục khác")
        return "\n".join(lines)

    return str(tool_result)[:2000]


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


def _build_response(
    answer: str,
    steps: List[Dict],
    redirect: Optional[str],
    action: Optional[Dict],
) -> Dict[str, Any]:
    return {"answer": answer, "thinkingSteps": steps, "redirectPath": redirect, "action": action}


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
    ) -> Dict[str, Any]:
        steps: List[Dict[str, Any]] = []
        t_start = time.time()

        def _remaining() -> float:
            return max(0, _MAX_TOTAL_SECONDS - (time.time() - t_start))

        # ── Stage 1: Hard Router ──────────────────────────────────────────
        steps.append(_make_step(1, "Hard Router",
            "Kiểm tra nhanh pattern (regex/cache). Nếu khớp → trả về ngay, không gọi LLM."))
        hard_result: Optional[IntentResult] = hard_router.route(message, user_role)

        if hard_result and hard_result.intent == "direct_response":
            steps[-1]["status"] += " → Khớp mẫu trực tiếp"
            return _build_response(hard_result.answer, steps, None, None)

        if hard_result:
            steps[-1]["status"] += f" → Pattern matched: {hard_result.tool_name}"
            intent_data       = _intent_result_to_dict(hard_result)
            corrected_message = message
        else:
            steps[-1]["status"] += " → Không khớp → LLM path"
            intent_data = None

        # ── Stage 2: Light Router ─────────────────────────────────────────
        if intent_data is None:
            active_routing_model = routing_model or "llama-3.1-8b-instant"
            steps.append(_make_step(2, "Unified Router",
                "Phân tích intent, trích xuất entities qua LLM."))
            try:
                intent_data = light_router.route(
                    message, user_role, user_code, history, active_routing_model
                )
                logger.info(f"[ChatbotService] LightRouter output: {json.dumps(intent_data, ensure_ascii=False, default=str)}")
            except RuntimeError as exc:
                # llm_client đã hết retry → không retry thêm
                err = _ERR_RATE_LIMIT if _is_rate_limit_error(exc) else _ERR_SYSTEM
                logger.error(f"[ChatbotService] LightRouter exhausted: {exc}")
                steps[-1]["status"] += " → LLM không khả dụng"
                return _build_response(err, steps, None, None)
            except Exception as exc:
                logger.error(f"[ChatbotService] LightRouter error: {exc}")
                steps[-1]["status"] += " → Lỗi"
                return _build_response(_ERR_SYSTEM, steps, None, None)

            confidence        = intent_data.get("confidence", "medium")
            # KHÔNG dùng corrected_text để tránh ghi đè tên riêng tiếng Việt
            corrected_message = message
            detail_parts = []
            detail_parts.append(
                f"Intent: {intent_data.get('intent')} | Tool: {intent_data.get('toolName')} | "
                f"Confidence: {confidence} | "
                f"Entities: {json.dumps(intent_data.get('entities', {}), ensure_ascii=False, default=str)}"
            )
            steps[-1]["detail"]  = "\n".join(detail_parts)
            steps[-1]["status"] += f" → Phân tích xong ({confidence})"
        else:
            steps.append(_make_step(2, "Unified Router", "Bỏ qua (Hard Router đã khớp)"))
            corrected_message = message

        # ── Handle need_clarification (hỏi lại khi không hiểu) ─────────────
        if intent_data.get("intent") == "need_clarification" or (
            intent_data.get("confidence") == "low" and not intent_data.get("toolName")
        ):
            missing_info = intent_data.get("entities", {}).get("missingInfo")
            if not missing_info:
                missing_info = "Xin lỗi, tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể mô tả chi tiết hơn không?"
            steps.append(_make_step(3, "Clarification", "Cần làm rõ yêu cầu"))
            steps.append(_make_step(4, "Answer Generator", "Tạo câu hỏi làm rõ"))
            return _build_response(f"❓ {missing_info}", steps, None, None)

        # ── Permission check ──────────────────────────────────────────────
        tool_name = (intent_data.get("toolName") or "").strip()
        if tool_name and not tool_name.startswith("view_"):
            allowed, reason = check_permission(user_role, tool_name)
            if not allowed:
                intent_data = {"intent": "permission_denied", "entities": {"reason": reason}, "toolName": None}

        # ── Stage 3: Tool Executor ────────────────────────────────────────
        tool_result = None
        intent      = (intent_data.get("intent") or "").strip().lower()
        tool_name   = (intent_data.get("toolName") or "").strip()
        needs_tool  = bool(tool_name or intent_data.get("dynamicSql"))
        is_backend  = (intent == "action" or tool_name in _BACKEND_ACTION_TOOLS)
        if is_backend and not (tool_name or intent_data.get("action")):
            is_backend = False

        if is_backend:
            steps.append(_make_step(3, "Tool Executor", "Chuẩn bị tham số hành động backend."))
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

        elif needs_tool and intent not in ("permission_denied", "direct_response"):
            steps.append(_make_step(3, "Tool Executor", "Truy vấn dữ liệu từ Database."))
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
                    # Tạo câu hỏi làm rõ dựa trên lỗi
                    clarify_msg = self._generate_clarification_question(error_msg, tool_name_err, message)
                    steps.append(_make_step(4, "Answer Generator", "Yêu cầu làm rõ thông tin"))
                    return _build_response(clarify_msg, steps, None, None)
                
                # ✅ FIX: Ensure tool_result is always a list (even if empty or None from executor)
                if tool_result is None:
                    tool_result = []
                count = len(tool_result) if isinstance(tool_result, list) else "-"
                steps[-1]["status"] += f" → {count} dòng kết quả"
            if tool_result and (isinstance(tool_result, list) and len(tool_result) > 0 or not isinstance(tool_result, list)):
                sample = tool_result[:3] if isinstance(tool_result, list) else tool_result
                steps[-1]["detail"] = f"Sample: {json.dumps(sample, ensure_ascii=False, default=str)}"
        else:
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không cần truy vấn DB)."))

        # ── Stage 4: Answer Generator ─────────────────────────────────────
        steps.append(_make_step(4, "Answer Generator", "Tổng hợp câu trả lời cuối cùng."))
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
                    corrected_message, intent_data, tool_result, history, answer_model, today=today_str
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
        return _build_response(answer, steps, redirect, intent_data.get("action"))

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
    ) -> Generator[Dict[str, Any], None, None]:
        steps: List[Dict[str, Any]] = []
        t_start = time.time()

        def _remaining() -> float:
            return max(0, _MAX_TOTAL_SECONDS - (time.time() - t_start))

        # Stage 1
        steps.append(_make_step(1, "Hard Router", "Kiểm tra nhanh pattern."))
        yield {"type": "step", "step": steps[-1]}

        hard_result: Optional[IntentResult] = hard_router.route(message, user_role)
        if hard_result and hard_result.intent == "direct_response":
            steps[-1]["status"] += " → Khớp mẫu trực tiếp"
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": hard_result.answer}
            return

        if hard_result:
            steps[-1]["status"] += f" → Pattern matched: {hard_result.tool_name}"
            intent_data, corrected_message = _intent_result_to_dict(hard_result), message
        else:
            steps[-1]["status"] += " → Không khớp → LLM path"
            intent_data = None
        yield {"type": "step", "step": steps[-1]}

        # Stage 2
        if intent_data is None:
            steps.append(_make_step(2, "Unified Router", "Phân tích intent qua LLM."))
            yield {"type": "step", "step": steps[-1]}
            try:
                intent_data = light_router.route(
                    message, user_role, user_code, history,
                    routing_model or "llama-3.1-8b-instant"
                )
            except Exception as exc:
                err = _ERR_RATE_LIMIT if _is_rate_limit_error(exc) else _ERR_SYSTEM
                logger.error(f"[Stream] LightRouter failed: {exc}")
                steps[-1]["status"] += " → LLM không khả dụng"
                yield {"type": "step",   "step": steps[-1]}
                yield {"type": "answer", "chunk": err}
                return

            confidence        = intent_data.get("confidence", "medium")
            # KHÔNG dùng corrected_text để tránh ghi đè tên riêng tiếng Việt
            corrected_message = message
            steps[-1]["detail"] = (
                f"Intent: {intent_data.get('intent')} | Tool: {intent_data.get('toolName')} | Confidence: {confidence}"
            )
            steps[-1]["status"] += f" → Xong ({confidence})"
        else:
            steps.append(_make_step(2, "Unified Router", "Bỏ qua (Hard Router matched)."))
            corrected_message = message
        yield {"type": "step", "step": steps[-1]}

        # Stage 3
        tool_result = None
        intent    = (intent_data.get("intent") or "").strip().lower()
        tool_name = (intent_data.get("toolName") or "").strip()
        needs_tool = bool(tool_name or intent_data.get("dynamicSql"))

        if intent == "action" or tool_name in _BACKEND_ACTION_TOOLS:
            steps.append(_make_step(3, "Tool Executor", "Chuẩn bị action backend."))
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

        elif needs_tool and intent not in ("permission_denied", "direct_response"):
            steps.append(_make_step(3, "Tool Executor", "Truy vấn Database."))
            yield {"type": "step", "step": steps[-1]}
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
                # ✅ FIX: Ensure tool_result is always a list (even if empty or None from executor)
                if tool_result is None:
                    tool_result = []
                count = len(tool_result) if isinstance(tool_result, list) else "-"
                steps[-1]["status"] += f" → {count} dòng"
            if tool_result and (isinstance(tool_result, list) and len(tool_result) > 0 or not isinstance(tool_result, list)):
                sample = tool_result[:3] if isinstance(tool_result, list) else tool_result
                steps[-1]["detail"] = f"Sample: {json.dumps(sample, ensure_ascii=False, default=str)}"
            yield {"type": "step", "step": steps[-1]}
        else:
            steps.append(_make_step(3, "Tool Executor", "Bỏ qua (không cần truy vấn DB)."))
            yield {"type": "step", "step": steps[-1]}

        # Stage 4: Stream answer — ✅ Timeout-aware với fallback\n        steps.append(_make_step(4, "Answer Generator", "Tổng hợp câu trả lời."))
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
                    corrected_message, intent_data, tool_result, history, answer_model, today=today_str
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
        steps.append(_make_step(3, "Answer Generator", "Done"))

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