"""
tools/executor.py
Stage 2 – SQL executor.
Xử lý tất cả tool_name → SQL → kết quả.
Không chứa SQL — tất cả đều từ db/queries.py.

v2.1: Tích hợp normalize_entities() để chuẩn hóa date expressions
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from loguru import logger # type: ignore

from db.pool import db_pool
from db.queries import TEMPLATES, build_params, normalize_entities

# Tools được backend dispatch (không cần SQL ở đây)
_BACKEND_ACTIONS = {
    "create_notification", "send_email",
    "create_user", "update_user", "delete_user",
    "create_major", "update_major",
    "create_course", "update_course",
    "create_specialization",
    "create_room",
    "create_semester",
    # Các tool phụ trợ backend
    "export_timetable", "publish_timetable",
    "export_attendance_stats", "export_excel",
    "import_component_grades", "import_final_grades",
}

# Tools navigate (không cần SQL, chỉ cần redirect)
_NAVIGATE_ONLY = {
    "view_profile", "update_profile",
    "view_students", "view_lecturers",
    "view_majors", "view_courses", "view_rooms", "view_semesters",
    "view_classes", "view_timetable", "view_schedule",
    "view_grades", "view_notifications",
    "view_schedule_requests", "view_teaching_classes",
    "view_attendance_config",
    "view_users",
    "view_dashboard", "view_logs", "view_alerts", "view_wifi_aps",
    "view_exam_grades", "view_resit_grades",
    "view_assignments", "view_messages",
    "view_specializations", "view_sub_specializations",  # ✅ FIX: added
    "view_inactive_users",  # ✅ FIX: added
}

_MUTATION_PREFIXES = ("create_", "update_", "delete_", "approve_", "reject_",
                      "add_", "remove_", "activate_")


def _is_mutation(tool: str) -> bool:
    return any(tool.startswith(p) for p in _MUTATION_PREFIXES)


class ToolExecutor:

    def execute(
        self,
        intent_data: Dict[str, Any],
        user_id: int,
        user_role: str,
        user_code: str = None,  # Thêm param user_code
    ) -> Any:
        tool_name:   str  = intent_data.get("toolName") or ""
        entities:    dict = intent_data.get("entities") or {}
        dynamic_sql: str  = intent_data.get("dynamicSql") or ""

        # ── Merge action.params vào entities (LLM đôi khi đặt date/class_name ở đây) ──
        action = intent_data.get("action")
        if isinstance(action, dict):
            action_params = action.get("params") or {}
            for key, val in action_params.items():
                if val and key not in entities:
                    entities[key] = val
        
        # ══════════════════════════════════════════════════════════════════
        # ✅ NEW: Normalize entities (TODAY→date thực, inject user_code...)
        # ══════════════════════════════════════════════════════════════════
        entities = normalize_entities(entities, user_code=user_code, tool_name=tool_name)
        intent_data["entities"] = entities  # Cập nhật lại intent_data
        logger.info(f"[Executor] execute called: tool={tool_name} entities={entities} user_code={user_code}")
        
        # ══════════════════════════════════════════════════════════════════
        # ✅ NEW: Auto-convert full_name → code khi tool yêu cầu code
        # ══════════════════════════════════════════════════════════════════
        if tool_name == "get_other_lecturer_schedule":
            # Tool này cần lecturer_code hoặc lecturer_name
            if "lecturer_code" not in entities and "full_name" in entities:
                # User nhập tên thay vì mã → search trước để lấy mã
                name = entities["full_name"]
                logger.info(f"[Executor] Auto-convert: lecturer full_name='{name}' → searching for code...")
                
                # Search lecturer by name first
                search_result = self._search_user_by_name_helper(name)
                if search_result and len(search_result) > 0:
                    lecturer_code = search_result[0].get("code")
                    if lecturer_code:
                        entities["lecturer_code"] = lecturer_code
                        logger.info(f"[Executor] Found lecturer code: {lecturer_code}")
                else:
                    logger.warning(f"[Executor] Lecturer '{name}' not found")
                    return []  # Not found
        
        elif tool_name == "get_other_student_schedule":
            if "student_code" not in entities and "full_name" in entities:
                name = entities["full_name"]
                logger.info(f"[Executor] Auto-convert: student full_name='{name}' → searching for code...")
                
                search_result = self._search_user_by_name_helper(name)
                if search_result and len(search_result) > 0:
                    student_code = search_result[0].get("code")
                    if student_code:
                        entities["student_code"] = student_code
                        logger.info(f"[Executor] Found student code: {student_code}")
                else:
                    logger.warning(f"[Executor] Student '{name}' not found")
                    return []
        
        elif tool_name == "get_enrollments_by_class":
            # Nếu nhận full_name thay vì class_name/class_code
            if "class_name" not in entities and "full_name" in entities:
                # Assume full_name is actually a class_name search
                entities["class_name"] = entities.pop("full_name")
                logger.info(f"[Executor] Moved full_name → class_name for get_enrollments_by_class")

        # ── Backend dispatch → skip SQL ──────────────────────────────────
        if tool_name in _BACKEND_ACTIONS:
            logger.info(f"[Executor] backend action '{tool_name}' – skipping SQL")
            return None

        # ── Navigate only → no SQL needed ────────────────────────────────
        if tool_name in _NAVIGATE_ONLY:
            return None

        # ── Smart navigation với DB lookup ───────────────────────────────
        if tool_name == "view_specializations":
            return self._resolve_major_redirect(intent_data, entities)
        if tool_name == "view_sub_specializations":
            return self._resolve_spec_redirect(intent_data, entities)

        # ── Dynamic SQL ───────────────────────────────────────────────────
        if tool_name == "dynamic_sql" and dynamic_sql:
            return self._run_dynamic(dynamic_sql)

        if not tool_name:
            return None

        # ── Template SQL ──────────────────────────────────────────────────
        try:
            resolved_key, params = build_params(tool_name, entities, user_id, user_role)
            logger.info(f"[Executor] resolved_key={resolved_key} params={params}")
        except ValueError as exc:
            logger.warning(f"[Executor] param error '{tool_name}': {exc}")
            # Return dict đặc biệt để chatbot_service hỏi lại user
            return {"__missing_field__": True, "error": str(exc), "tool": tool_name}

        sql = TEMPLATES.get(resolved_key)
        if not sql:
            logger.warning(f"[Executor] no template for '{resolved_key}'")
            return None

        return self._run(sql, params, mutation=_is_mutation(resolved_key), tool=resolved_key)

    # ── Runners ───────────────────────────────────────────────────────────────
    def _run(self, sql: str, params: tuple, *, mutation: bool, tool: str) -> Any:
        try:
            with db_pool.get_cursor() as cur:
                logger.info(f"[Executor] {tool}: {sql.strip()[:80]} params={params}")
                cur.execute(sql, params or None)

                if mutation:
                    if cur.description:
                        row    = cur.fetchone()
                        new_id = list(row.values())[0] if row else "N/A"
                        return f"✅ Thành công! ID mới: {new_id}."
                    return "✅ Thao tác đã được thực hiện thành công."

                rows = cur.fetchall()
                res = [dict(r) for r in rows]
                logger.debug(f"[Executor] result count={len(res)} data={res}")
                return res

        except Exception as exc:
            logger.error(f"[Executor] DB error '{tool}': {exc}")
            return None

    def _run_dynamic(self, sql: str) -> Any:
        clean = sql.strip()
        if not clean.lower().startswith("select"):
            logger.warning(f"[Executor] unsafe dynamic SQL rejected: {clean[:80]}")
            return None
        return self._run(clean, (), mutation=False, tool="dynamic_sql")

    # ── Navigation DB lookups ─────────────────────────────────────────────────
    def _search_user_by_name_helper(self, full_name: str) -> list:
        """Search user by name and return basic info (code, role)."""
        try:
            sql = TEMPLATES.get("search_user_by_name")
            if not sql:
                return []
            
            with db_pool.get_cursor() as cur:
                cur.execute(sql, (f"%{full_name}%",))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        except Exception as exc:
            logger.error(f"[Executor] search_user_by_name error: {exc}")
            return []

    def _resolve_major_redirect(self, intent_data: dict, entities: dict) -> Dict[str, Any]:
        val = (entities.get("major_name") or entities.get("major_code")
               or entities.get("keyword"))
        if not val:
            return {"found": False, "type": "major"}
        sql = TEMPLATES["get_major_id_by_name"]
        try:
            with db_pool.get_cursor() as cur:
                cur.execute(sql, (f"%{val}%", val))
                row = cur.fetchone()
            if row:
                intent_data["redirectPath"] = f"/academic-staff/majors/{row['id']}"
                return {"found": True, "type": "major", "name": row["name"], "id": row["id"]}
        except Exception as exc:
            logger.error(f"[Executor] major lookup error: {exc}")
        return {"found": False, "type": "major", "requested": val}

    def _resolve_spec_redirect(self, intent_data: dict, entities: dict) -> Dict[str, Any]:
        val = (entities.get("specialization_name") or entities.get("specialization_code")
               or entities.get("keyword"))
        if not val:
            return {"found": False, "type": "specialization"}
        sql = TEMPLATES["get_specialization_id_by_name"]
        try:
            with db_pool.get_cursor() as cur:
                cur.execute(sql, (f"%{val}%", val))
                row = cur.fetchone()
            if row:
                intent_data["redirectPath"] = f"/academic-staff/specializations/{row['id']}"
                return {"found": True, "type": "specialization", "name": row["name"], "id": row["id"]}
        except Exception as exc:
            logger.error(f"[Executor] spec lookup error: {exc}")
        return {"found": False, "type": "specialization", "requested": val}


tool_executor = ToolExecutor()