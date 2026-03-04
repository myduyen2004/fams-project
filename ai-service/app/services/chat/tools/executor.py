"""
tools/executor.py
Stage 2 – SQL executor.
Xử lý tất cả tool_name → SQL → kết quả.
Không chứa SQL — tất cả đều từ db/queries.py.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from loguru import logger

from db.pool import db_pool
from db.queries import TEMPLATES, build_params

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
            # Cập nhật lại intent_data để build_params nhận đúng
            intent_data["entities"] = entities

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
        except ValueError as exc:
            logger.warning(f"[Executor] param error '{tool_name}': {exc}")
            return str(exc)

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