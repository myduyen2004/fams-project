import time
from typing import Dict, List, Set, Tuple
from loguru import logger # type: ignore
from app.services.chat.db.pool import db_pool
from app.services.chat.router.core_tool_inventory import allowed_roles_for_tool, is_kept_tool

_REMOVED_CHATBOT_TOOLS: Set[str] = {
    "delete_user",
    "delete_class",
    "delete_course",
    "delete_major",
    "delete_room",
    "delete_semester",
    "delete_specialization",
    "delete_sub_specialization",
}

class ToolsLoader:
    def __init__(self):
        self.templates: Dict[str, str] = {}
        self.backend_actions: Set[str] = set()
        self.navigate_only: Set[str] = set()
        self.active_tools: Set[str] = set()
        self.inactive_tools: Set[str] = set()
        self.tool_status: Dict[str, bool] = {}
        
        # New attributes for dynamic LLM routing
        self.all_tools_formatted: Dict[str, str] = {}
        self.role_tools: Dict[str, Set[str]] = {
            "ADMIN": set(),
            "ACADEMIC_STAFF": set(),
            "LECTURER": set(),
            "STUDENT": set()
        }
        self._last_reload_ts: float = 0.0
        self._on_reload_listeners = []

    def on_reload(self, listener):
        """Đăng ký callback gọi khi reload xong."""
        self._on_reload_listeners.append(listener)
        return listener

    def reload(self):
        """Tải lại tất cả tool từ database."""
        try:
            with db_pool.get_cursor() as cur:
                cur.execute("SELECT name, type, sql_template, description, allowed_roles, required_fields, is_active FROM ai_tools")
                rows = cur.fetchall()
                
                new_templates = {}
                new_backend_actions = set()
                new_navigate_only = set()
                new_active_tools = set()
                new_inactive_tools = set()
                new_tool_status = {}
                
                new_all_tools_formatted = {}
                new_role_tools = {
                    "ADMIN": set(),
                    "ACADEMIC_STAFF": set(),
                    "LECTURER": set(),
                    "STUDENT": set()
                }

                for row in rows:
                    name = row["name"]
                    t_type = row["type"]
                    sql = row["sql_template"]
                    desc = row["description"] or ""
                    roles = row["allowed_roles"]
                    req_fields = row["required_fields"]
                    is_active = bool(row["is_active"])

                    if name in _REMOVED_CHATBOT_TOOLS:
                        new_tool_status[name] = False
                        new_inactive_tools.add(name)
                        continue

                    if not is_kept_tool(name):
                        new_tool_status[name] = False
                        new_inactive_tools.add(name)
                        continue

                    new_tool_status[name] = is_active
                    if is_active:
                        new_active_tools.add(name)
                    else:
                        new_inactive_tools.add(name)
                        continue

                    if t_type == "SQL_TEMPLATE" and not sql:
                        logger.warning(f"[ToolsLoader] Skip SQL tool without template: {name}")
                        continue

                    if t_type == "SQL_TEMPLATE":
                        new_templates[name] = sql
                    elif t_type == "BACKEND_ACTION":
                        new_backend_actions.add(name)
                    elif t_type == "NAVIGATE_ONLY":
                        new_navigate_only.add(name)
                        
                    # Format for LLM prompt
                    prefix = ""
                    if t_type == "BACKEND_ACTION":
                        prefix = "[ACTION] "
                    elif t_type == "NAVIGATE_ONLY":
                        prefix = "[NAV] "
                    else:
                        prefix = "[DATA] "
                        
                    entities_str = ""
                    if req_fields:
                        fields = [f.strip() for f in req_fields.split(',')]
                        entities_str = f" entities:{{{','.join(fields)}}}"
                        
                    new_all_tools_formatted[name] = f"{prefix}{desc}{entities_str}"
                    
                    core_roles = set(allowed_roles_for_tool(name))
                    db_roles = {r.strip() for r in (roles or "").split(',') if r.strip()}
                    role_list = sorted(core_roles | db_roles)
                    
                    for r in role_list:
                        if r in new_role_tools:
                            new_role_tools[r].add(name)

                self.templates.clear()
                self.templates.update(new_templates)

                self.backend_actions.clear()
                self.backend_actions.update(new_backend_actions)

                self.navigate_only.clear()
                self.navigate_only.update(new_navigate_only)

                self.active_tools.clear()
                self.active_tools.update(new_active_tools)

                self.inactive_tools.clear()
                self.inactive_tools.update(new_inactive_tools)

                self.tool_status.clear()
                self.tool_status.update(new_tool_status)

                self.all_tools_formatted.clear()
                self.all_tools_formatted.update(new_all_tools_formatted)

                for role in list(self.role_tools.keys()):
                    self.role_tools[role].clear()
                for role, tools in new_role_tools.items():
                    self.role_tools.setdefault(role, set()).update(tools)

                self._last_reload_ts = time.time()
                
                logger.info(f"[ToolsLoader] Loaded {len(rows)} tools from database "
                            f"(SQL: {len(self.templates)}, Backend: {len(self.backend_actions)}, Nav: {len(self.navigate_only)}, "
                            f"Active: {len(self.active_tools)}, Inactive: {len(self.inactive_tools)})")
                
                # Notify listeners
                for listener in self._on_reload_listeners:
                    try:
                        listener()
                    except Exception as le:
                        logger.error(f"[ToolsLoader] Listener failed: {le}")
        except Exception as e:
            logger.error(f"[ToolsLoader] Failed to load tools from database: {e}")

    def maybe_reload(self, min_interval_seconds: float = 2.0) -> None:
        now = time.time()
        if now - self._last_reload_ts >= min_interval_seconds:
            self.reload()

# Singleton
tools_loader = ToolsLoader()
