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

from app.services.chat.db.pool import db_pool # type: ignore
from app.services.chat.db.queries import TEMPLATES, build_params, normalize_entities # type: ignore
from app.services.chat.db.tools_loader import tools_loader # type: ignore

_MUTATION_PREFIXES = ("create_", "update_", "delete_", "approve_", "reject_",
                      "add_", "remove_", "activate_")


def _is_mutation(tool: str) -> bool:
    return any(tool.startswith(p) for p in _MUTATION_PREFIXES)


def _get_template(tool_name: str) -> Optional[str]:
    # Prefer code templates so runtime stays in sync with the current Python tool logic.
    # DB templates are kept as fallback for tools that only exist in ai_tools.
    return TEMPLATES.get(tool_name) or tools_loader.templates.get(tool_name)


class ToolExecutor:

    def execute(
        self,
        intent_data: Dict[str, Any],
        user_id: int,
        user_role: str,
        user_code: Optional[str] = None,  # Thêm param user_code
    ) -> Any:
        tool_name:   str  = intent_data.get("toolName") or ""
        entities:    Dict[str, Any] = intent_data.get("entities") or {}
        dynamic_sql: str  = intent_data.get("dynamicSql") or ""

        # ── Merge action.params vào entities (LLM đôi khi đặt date/class_name ở đây) ──
        action = intent_data.get("action")
        if isinstance(action, dict):
            action_params = action.get("params")
            if isinstance(action_params, dict):
                for key, val in action_params.items():
                    key_str = str(key)
                    if val and key_str not in entities: # type: ignore
                        entities[key_str] = val # type: ignore
        
        # ══════════════════════════════════════════════════════════════════
        # ✅ NEW: Normalize entities (TODAY→date thực, inject user_code...)
        # ══════════════════════════════════════════════════════════════════
        entities = normalize_entities(entities, user_code=user_code, tool_name=tool_name)
        intent_data["entities"] = entities  # Cập nhật lại intent_data
        logger.info(f"[Executor] execute called: tool={tool_name} entities={entities} user_code={user_code}")
        page_offset = int(entities.get("__page_offset__") or 0)
        page_size = int(entities.get("__page_size__") or 0)
        
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

        # ── Backend dispatch → skip SQL ──
        if tool_name in tools_loader.backend_actions:
            logger.info(f"[Executor] backend action '{tool_name}' → skipping SQL")
            return None

        # ── Navigate only → no SQL needed ──
        if tool_name in tools_loader.navigate_only:
            return None

        # ── Smart navigation với DB lookup ──
        if tool_name == "view_specializations":
            return self._resolve_major_redirect(intent_data, entities)
        if tool_name == "view_sub_specializations":
            return self._resolve_spec_redirect(intent_data, entities)

        # ── Dynamic SQL ──
        if (tool_name == "dynamic_sql" or tool_name == "excel_query") and dynamic_sql:
            return self._run_dynamic(dynamic_sql)

        if not tool_name:
            return None

        # ── Template SQL ──
        try:
            resolved_key, params = build_params(tool_name, entities, user_id, user_role)
            logger.info(f"[Executor] resolved_key={resolved_key} params={params}")
            
            # Special case for build_params returning dynamic_sql marker
            if resolved_key == "dynamic_sql" and dynamic_sql:
                return self._run_dynamic(dynamic_sql)
                
        except ValueError as exc:
            logger.warning(f"[Executor] param error '{tool_name}': {exc}")
            # Return dict có bit để chatbot_service hỏi lại user
            return {"__missing_field__": True, "error": str(exc), "tool": tool_name}

        sql = _get_template(resolved_key)
        if not sql:
            logger.warning(f"[Executor] no template for '{resolved_key}'")
            return None

        if not _is_mutation(resolved_key) and page_size > 0:
            return self._run_paginated(sql, params, tool=resolved_key, offset=page_offset, limit=page_size)

        return self._run(sql, params, mutation=_is_mutation(resolved_key), tool=resolved_key)

    # ── Runners ───────────────────────────────────────────────────────────────
    def _run(self, sql: str, params: tuple, *, mutation: bool, tool: str) -> Any:
        try:
            with db_pool.get_cursor() as cur:
                sql_preview = str(sql).strip()[:80] # type: ignore
                logger.info(f"[Executor] {tool}: {sql_preview} params={params}")
                cur.execute(sql, params or None)

                if mutation:
                    if cur.description:
                        row    = cur.fetchone()
                        new_id = list(row.values())[0] if row else "N/A"
                        return f"✅ Thành công! ID mới: {new_id}."
                    return "✅ Thao tác đã được thực hiện thành công."

                rows = cur.fetchall()
                res = [dict(r) for r in rows]
                if tool == "count_unread_notifications" and not res:
                    res = [{"unread_count": 0, "latest_notification_at": None}]
                logger.debug(f"[Executor] result count={len(res)} data={res}")
                return res

        except Exception as exc:
            logger.error(f"[Executor] DB error '{tool}': {exc}")
            return None

    def _run_dynamic(self, sql: str) -> Any:
        sql_str = str(sql).strip()
        if not sql_str.lower().startswith("select"):
            preview = sql_str[:80] # type: ignore
            logger.warning(f"[Executor] unsafe dynamic SQL rejected: {preview}")
            return None
        return self._run(sql_str, (), mutation=False, tool="dynamic_sql")

    def _run_paginated(self, sql: str, params: tuple, *, tool: str, offset: int, limit: int) -> Any:
        sql_str = str(sql).strip().rstrip(";")
        count_sql = f"SELECT COUNT(*) AS total FROM ({sql_str}) AS base_count"
        page_sql = f"SELECT * FROM ({sql_str}) AS base_page OFFSET %s LIMIT %s"

        try:
            with db_pool.get_cursor() as cur:
                cur.execute(count_sql, params or None)
                count_row = cur.fetchone() or {}
                total = int(count_row.get("total") or 0)

                page_params = tuple(params or ()) + (offset, limit)
                cur.execute(page_sql, page_params)
                rows = cur.fetchall()
                res = [dict(r) for r in rows]
                logger.info(
                    f"[Executor] paginated {tool}: offset={offset} limit={limit} returned={len(res)} total={total}"
                )
                return {
                    "__paginated_rows__": res,
                    "__total__": total,
                    "__offset__": offset,
                    "__page_size__": limit,
                }
        except Exception as exc:
            logger.error(f"[Executor] paginated DB error '{tool}': {exc}")
            return None

    # ── Navigation DB lookups ─────────────────────────────────────────────────
    def _search_user_by_name_helper(self, full_name: str) -> list:
        """Search user by name and return basic info (code, role)."""
        try:
            sql = _get_template("search_user_by_name")
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
