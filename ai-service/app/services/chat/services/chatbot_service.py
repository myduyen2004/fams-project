"""
services/chatbot_service.py
Main orchestrator. Coordinates the 4-stage pipeline:

  Stage 0  HardRouter   – regex / LRU cache              O(1)
  Stage 1  LightRouter  – LLM intent/entity extraction   ~500ms
  Stage 2  ToolExecutor – SQL query                      ~50ms
  Stage 3  AnswerGen    – LLM natural-language response  ~800ms

Each stage is a separate, testable module.
This file contains NO business logic — only wiring.
"""
from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

import pandas as pd
from loguru import logger

from router.hard_router import hard_router, IntentResult
from router.light_router import light_router
from router.permissions import check_permission
from services.answer_generator import answer_generator
from services.spell_checker import spell_checker
from tools.executor import tool_executor

# ── Route mapping (tool → frontend URL) ──────────────────────────────────────
_ROUTE_MAP: Dict[str, str] = {
    "view_lecturers":     "/academic-staff/lecturers",
    "view_students":      "/academic-staff/students",
    "view_majors":        "/academic-staff/majors",
    "view_courses":       "/academic-staff/courses",
    "view_rooms":         "/academic-staff/rooms",
    "view_semesters":     "/academic-staff/semesters",
    "view_schedule":      "/academic-staff/schedule",
    "view_results":       "/academic-staff/academic-results",
    "view_users":         "/admin/users",
    "view_logs":          "/admin/system-logs",
    "view_alerts":        "/admin/alerts",
    "view_notifications": "/admin/notification-management",
    "view_dashboard":     "/academic-staff/dashboard",
    "view_profile":       "/academic-staff/profile",
    "view_classes":       "/academic-staff/classes",
    "view_teaching_classes": "/lecturer/classes",
    "view_specializations": "/academic-staff/specializations",
    "view_sub_specializations": "/academic-staff/sub-specializations",
    "view_timetable":     "/academic-staff/schedule",
    "get_my_schedule":    "/student/schedule",
    "get_my_grades":      "/student/grades",
    "get_my_notifications": "/notifications",
    
    "get_own_grades":     "/student/grades",
    "view_grades":        "/academic-staff/academic-results",
    "view_messages":      "/academic-staff/messages",
    "view_assignments":   "/academic-staff/assignments",
    "view_exam_grades":   "/academic-staff/exam-grades",
    "view_resit_grades":  "/academic-staff/resit-grades",
    "view_wifi_aps":      "/academic-staff/wifi-aps",
    "view_attendance_config": "/academic-staff/attendance",
    "view_schedule_requests": "/academic-staff/requests",
}

_ROLE_PREFIXES = {"LECTURER": "lecturer", "STUDENT": "student"}

# Keywords that indicate spell correction is unnecessary (navigation / greeting shortcuts)
_SPELL_SKIP_PATTERNS = {
    "xin chào", "chào", "hi", "hello", "bye", "cảm ơn", "tạm biệt",
    "trang ", "mở ", "vào trang", "đi đến", "danh sách ", "mở trang",
}

# Regex: alphanumeric codes like PRF192, SE18B01, ACC101, GV001, Spring26
_CODE_RE = re.compile(r'\b[A-Z]{2,}[0-9]{2,}[A-Z0-9]*\b')


def _should_skip_spell(message: str) -> bool:
    """Return True if message is definitely a navigation/greeting or contains entity codes — skip LLM spell check."""
    msg_lower = message.lower().strip()
    if len(msg_lower) < 4:
        return True
    # Contains an alphanumeric entity code (course code, class code, student/lecturer code)
    if _CODE_RE.search(message):
        return True
    for pat in _SPELL_SKIP_PATTERNS:
        if msg_lower.startswith(pat) or pat in msg_lower:
            return True
    return False


def _resolve_redirect(tool_name: str, redirect_from_intent: Optional[str], user_role: str, entities: Optional[Dict] = None) -> Optional[str]:
    path = redirect_from_intent or _ROUTE_MAP.get(tool_name)
    if not path:
        return None

    # Role-specific overrides
    role_lower = user_role.lower()
    if tool_name == "view_profile":
        if user_role == "ADMIN":
            return "/admin/profile"
        return f"/academic-staff/profile" if user_role == "ACADEMIC_STAFF" else f"/{role_lower}/profile"

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
        if tool_name in ("view_students", "view_lecturers"):
            return path
        path = path.replace("/academic-staff/", f"/{prefix}/")
    return path


def _make_step(stage: int, name: str, status: str, detail: str = "") -> Dict[str, Any]:
    step = {"stage": stage, "name": name, "status": status}
    if detail:
        step["detail"] = detail
    return step


_BACKEND_ACTION_TOOLS = {
    "create_notification", "send_email", "create_user", "update_user", "delete_user",
    "create_major", "update_major", "create_course", "update_course",
    "create_specialization", "create_room", "create_semester",
    "create_sub_specialization", "create_class",
    "add_student_to_class", "remove_student_from_class",
}


# ── ChatbotService ─────────────────────────────────────────────────────────────
class ChatbotService:
    """
    Public API consumed by the FastAPI/Flask route handler.
    All parameters are plain Python types for easy serialization.
    """

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

        # ── Stage 0: Spell Correction ────────────────────────────────────
        steps.append(_make_step(0, "Spell Correction", "Analyzing…"))
        spell_model = routing_model or "llama-3.1-8b-instant"

        if _should_skip_spell(message):
            corrected_message = message
            steps[-1]["status"] = "Skipped (navigation/greeting)"
        else:
            corrected_message = spell_checker.correct(message, spell_model)
            if corrected_message != message:
                steps[-1]["status"] = "Corrected"
                steps[-1]["detail"] = f"'{message}' → '{corrected_message}'"
            else:
                steps[-1]["status"] = "No correction needed"

        # ── Stage 1: Hard Router ─────────────────────────────────────────
        hard_result: Optional[IntentResult] = hard_router.route(corrected_message, user_role)

        if hard_result and hard_result.intent == "direct_response":
            steps.append(_make_step(1, "Hard Router", "Direct match"))
            return self._build_response(hard_result.answer, steps, None, None)

        if hard_result:
            steps.append(_make_step(1, "Hard Router", f"Pattern matched: {hard_result.tool_name}"))
            intent_data = self._intent_result_to_dict(hard_result)
        else:
            steps.append(_make_step(1, "Hard Router", "No match → LLM"))
            intent_data = None

        # ── Stage 2: Light Router (LLM) ──────────────────────────────────
        if intent_data is None:
            active_routing_model = routing_model or "llama-3.1-8b-instant"
            steps.append(_make_step(2, "Light Router", f"Routing via {active_routing_model}…"))
            intent_data = light_router.route(corrected_message, user_role, user_code, history, active_routing_model)
            steps[-1]["status"] = f"Intent: {intent_data.get('intent')} / Tool: {intent_data.get('toolName')}"
        else:
            steps.append(_make_step(2, "Light Router", "Skipped (Hard Router matched)"))

        # ── Permission re-check (belt & suspenders) ───────────────────────
        tool_name = intent_data.get("toolName") or ""
        if tool_name and not tool_name.startswith("view_"):
            allowed, reason = check_permission(user_role, tool_name)
            if not allowed:
                intent_data = {"intent": "permission_denied", "entities": {"reason": reason}, "toolName": None}

        # ── Stage 3: Tool Executor ───────────────────────────────────────
        tool_result = None
        intent      = (intent_data.get("intent") or "").strip().lower()
        tool_name   = (intent_data.get("toolName") or "").strip()

        needs_tool = bool(tool_name or intent_data.get("dynamicSql"))
        is_backend_action = (intent == "action" or tool_name in _BACKEND_ACTION_TOOLS)

        if is_backend_action and not (tool_name or intent_data.get("action")):
            is_backend_action = False  # Safety for ambiguous intents

        if is_backend_action:
            logger.info(f"[ChatbotService] Backend action detected: {tool_name}")
            steps.append(_make_step(3, "Tool Executor", f"Backend action: {tool_name}"))
            intent_data["intent"] = "action"
            intent = "action"

            action = intent_data.get("action")
            if not action or not isinstance(action, dict):
                logger.warning(f"[ChatbotService] Action object missing for {tool_name}, reconstructing...")
                action = {"type": tool_name.upper(), "params": intent_data.get("entities", {})}
                intent_data["action"] = action
            else:
                if tool_name in _BACKEND_ACTION_TOOLS:
                    action["type"] = tool_name.upper()
                if "params" not in action or not action["params"]:
                    action["params"] = intent_data.get("entities", {})

            logger.info(f"[ChatbotService] Final action payload: {action}")
        elif needs_tool and intent not in ("permission_denied", "direct_response"):
            steps.append(_make_step(3, "Tool Executor", f"Running {tool_name or 'dynamic_sql'}…"))
            tool_result = tool_executor.execute(intent_data, user_id, user_role)
            count = len(tool_result) if isinstance(tool_result, list) else "-"
            steps[-1]["status"] = f"Done — {count} rows"
        else:
            steps.append(_make_step(3, "Tool Executor", "Skipped"))

        # ── Stage 4: Answer Generator ────────────────────────────────────
        steps.append(_make_step(4, "Answer Generator", f"Generating via {answer_model or 'default model'}…"))
        today_str = datetime.now().strftime("%Y-%m-%d")
        answer = answer_generator.generate(
            corrected_message, intent_data, tool_result, history, answer_model, today=today_str
        )
        steps[-1]["status"] = "Done"

        redirect = _resolve_redirect(
            tool_name,
            intent_data.get("redirectPath"),
            user_role,
            intent_data.get("entities"),
        )
        return self._build_response(answer, steps, redirect, intent_data.get("action"))

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
        """
        Streaming version of chat(). Yields intermediate state as JSON,
        followed by text chunks for the answer.
        """
        steps: List[Dict[str, Any]] = []

        # Stage 0: Spell Correction
        steps.append(_make_step(0, "Spell Correction", "Analyzing…"))
        yield {"type": "step", "step": steps[-1]}
        spell_model = routing_model or "llama-3.1-8b-instant"

        if _should_skip_spell(message):
            corrected_message = message
            steps[-1]["status"] = "Skipped (navigation/greeting)"
        else:
            corrected_message = spell_checker.correct(message, spell_model)
            if corrected_message != message:
                steps[-1]["status"] = "Corrected"
                steps[-1]["detail"] = f"'{message}' → '{corrected_message}'"
            else:
                steps[-1]["status"] = "No correction needed"
        yield {"type": "step", "step": steps[-1]}

        # Stage 1: Hard Router
        hard_result: Optional[IntentResult] = hard_router.route(corrected_message, user_role)
        if hard_result and hard_result.intent == "direct_response":
            steps.append(_make_step(1, "Hard Router", "Direct match"))
            yield {"type": "step", "step": steps[-1]}
            yield {"type": "answer", "chunk": hard_result.answer}
            return

        if hard_result:
            steps.append(_make_step(1, "Hard Router", f"Pattern matched: {hard_result.tool_name}"))
            intent_data = self._intent_result_to_dict(hard_result)
        else:
            steps.append(_make_step(1, "Hard Router", "No match → LLM"))
            intent_data = None
        yield {"type": "step", "step": steps[-1]}

        # Stage 2: Light Router (LLM)
        if intent_data is None:
            active_routing_model = routing_model or "llama-3.1-8b-instant"
            steps.append(_make_step(2, "Light Router", f"Routing via {active_routing_model}…"))
            yield {"type": "step", "step": steps[-1]}
            intent_data = light_router.route(corrected_message, user_role, user_code, history, active_routing_model)
            steps[-1]["status"] = f"Intent: {intent_data.get('intent')} / Tool: {intent_data.get('toolName')}"
        else:
            steps.append(_make_step(2, "Light Router", "Skipped (Hard Router matched)"))
        yield {"type": "step", "step": steps[-1]}

        # Stage 3: Tool Executor
        tool_result = None
        intent      = (intent_data.get("intent") or "").strip().lower()
        tool_name   = (intent_data.get("toolName") or "").strip()
        needs_tool  = bool(tool_name or intent_data.get("dynamicSql"))

        if intent == "action" or tool_name in _BACKEND_ACTION_TOOLS:
            steps.append(_make_step(3, "Tool Executor", f"Backend action: {tool_name}"))
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
            yield {"type": "action", "action": action}
        elif needs_tool and intent not in ("permission_denied", "direct_response"):
            steps.append(_make_step(3, "Tool Executor", f"Running {tool_name or 'dynamic_sql'}…"))
            yield {"type": "step", "step": steps[-1]}
            tool_result = tool_executor.execute(intent_data, user_id, user_role)
            count = len(tool_result) if isinstance(tool_result, list) else "-"
            steps[-1]["status"] = f"Done — {count} rows"
            yield {"type": "step", "step": steps[-1]}
        else:
            steps.append(_make_step(3, "Tool Executor", "Skipped"))
            yield {"type": "step", "step": steps[-1]}

        # Stage 4: Answer Generator (Streaming)
        steps.append(_make_step(4, "Answer Generator", f"Generating via {answer_model or 'default model'}…"))
        yield {"type": "step", "step": steps[-1]}
        
        # Send redirect if exists
        redirect = _resolve_redirect(tool_name, intent_data.get("redirectPath"), user_role, intent_data.get("entities"))
        if redirect:
            yield {"type": "redirect", "path": redirect}

        today_str = datetime.now().strftime("%Y-%m-%d")
        for chunk in answer_generator.generate_stream(
            corrected_message, intent_data, tool_result, history, answer_model, today=today_str
        ):
            yield {"type": "answer", "chunk": chunk}

        steps[-1]["status"] = "Done"
        yield {"type": "step", "step": steps[-1]}

    # ── Excel flow ────────────────────────────────────────────────────────────
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

        # Step 1: parse file
        steps.append(_make_step(1, "Excel Analysis", "Parsing…"))
        excel_summary = self._parse_excel(file_content, filename)
        steps[-1]["status"] = f"Done — {len(excel_summary)} chars"

        # Step 2: synthetic message
        synthetic_message = (
            f"Tôi đã tải lên file '{filename}'. Dữ liệu:\n\n{excel_summary}\n\n"
            "Hãy phân tích và trả lời các câu hỏi về dữ liệu này."
        )
        active_routing_model = routing_model or "llama-3.1-8b-instant"
        intent_data = light_router.route(synthetic_message, user_role, user_code, history, active_routing_model)
        steps.append(_make_step(2, "Intent", f"Intent: {intent_data.get('intent')}"))

        # Step 3: generate answer
        answer = answer_generator.generate(
            synthetic_message, intent_data, {"excel_summary": excel_summary}, history, answer_model
        )
        steps.append(_make_step(3, "Answer Generator", "Done"))

        return {
            "answer": answer,
            "thinkingSteps": steps,
            "excelSummary": excel_summary,
            "action": intent_data.get("action"),
            "redirectPath": _resolve_redirect(
                intent_data.get("toolName") or "",
                intent_data.get("redirectPath"),
                user_role,
                intent_data.get("entities"),
            ),
        }

    # ── Private helpers ───────────────────────────────────────────────────────
    @staticmethod
    def _parse_excel(content: bytes, filename: str) -> str:
        try:
            df = pd.read_excel(io.BytesIO(content))
            rows, cols = df.shape
            full = df.to_string(index=False)
            if len(full) > 100_000:
                logger.warning(f"Excel '{filename}' truncated ({len(full)} chars)")
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

    @staticmethod
    def _intent_result_to_dict(ir: IntentResult) -> Dict[str, Any]:
        return {
            "intent": ir.intent,
            "toolName": ir.tool_name,
            "entities": ir.entities,
            "action": ir.action,
            "redirectPath": ir.redirect_path,
            "dynamicSql": None,
        }

    @staticmethod
    def _build_response(
        answer: str,
        steps: List[Dict],
        redirect: Optional[str],
        action: Optional[Dict],
    ) -> Dict[str, Any]:
        return {
            "answer": answer,
            "thinkingSteps": steps,
            "redirectPath": redirect,
            "action": action,
        }


# Module-level singleton
chatbot_service = ChatbotService()