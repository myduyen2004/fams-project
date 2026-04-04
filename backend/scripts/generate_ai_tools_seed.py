#!/usr/bin/env python3
"""Generate ai_tools seed SQL from the Python chatbot codebase.

This script keeps the seed aligned with the real tool surface that the chatbot
should expose, while excluding internal SQL helper templates.
"""

from __future__ import annotations

import ast
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Set


ROOT = Path(__file__).resolve().parents[2]
AI_SERVICE_ROOT = ROOT / "ai-service"
OUTPUT_PATH = ROOT / "backend/src/main/resources/db/migration/V20260317110000__seed_ai_tools_from_python.sql"

sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.services.chat.db.queries import TEMPLATES  # type: ignore
from app.services.chat.router.permissions import POLICIES, Role  # type: ignore


QUERIES_PATH = AI_SERVICE_ROOT / "app/services/chat/db/queries.py"
HARD_ROUTER_PATH = AI_SERVICE_ROOT / "app/services/chat/router/hard_router.py"
CHATBOT_SERVICE_PATH = AI_SERVICE_ROOT / "app/services/chat/services/chatbot_service.py"


EXCLUDED_INTERNAL_TOOLS: Set[str] = {
    "dynamic_sql",
    "get_my_courses",
    "get_my_grades",
    "get_my_schedule",
    "get_my_schedule_targeted",
    "get_lecturer_schedule_by_search",
    "get_student_schedule_by_search",
    "get_major_id_by_name",
    "get_specialization_id_by_name",
}

FALLBACK_BACKEND_ACTION_TOOLS: Set[str] = {
    "create_notification",
    "send_email",
    "create_user",
    "update_user",
    "delete_user",
    "import_component_grades",
    "export_attendance_stats",
    "export_excel",
}

ROLE_ORDER = ["ADMIN", "ACADEMIC_STAFF", "LECTURER", "STUDENT"]

SELF_SERVICE_TOOLS: Set[str] = {
    "count_unread_notifications",
    "get_active_semester",
    "get_abnormal_attendance",
    "get_all_rooms_today",
    "get_attendance_report_by_student",
    "get_gpa_attendance_correlation",
    "get_gpa_stats_by_major",
    "get_my_attendance_status",
    "get_my_notifications",
    "get_my_schedule_requests",
    "get_open_sessions_now",
    "get_own_grades",
    "get_own_schedule",
    "get_rescheduled_slots",
    "get_rooms_busy_now",
    "get_semester_countdown",
    "get_slot_time_info",
    "get_system_broadcast_stats",
    "get_system_dashboard",
    "get_top_students",
    "list_courses",
    "list_lecturers",
    "list_majors",
    "list_notifications",
    "list_semesters",
    "view_alerts",
    "view_assignments",
    "view_attendance_config",
    "view_classes",
    "view_courses",
    "view_dashboard",
    "view_exam_grades",
    "view_grades",
    "view_inactive_users",
    "view_lecturers",
    "view_logs",
    "view_majors",
    "view_messages",
    "view_notifications",
    "view_profile",
    "view_resit_grades",
    "view_results",
    "view_rooms",
    "view_schedule",
    "view_schedule_requests",
    "view_semesters",
    "view_specializations",
    "view_students",
    "view_sub_specializations",
    "view_teaching_classes",
    "view_timetable",
    "view_users",
    "view_wifi_aps",
}

EXPLICIT_REQUIRED_FIELDS: Dict[str, List[str]] = {
    "activate_user": ["code"],
    "add_student_to_class": ["class_name", "student_code"],
    "approve_schedule_request": ["request_id"],
    "assign_course_to_specialization": ["specialization_code", "specialization_name", "course_code", "course_name", "semester"],
    "assign_course_to_sub_specialization": ["sub_specialization_code", "sub_specialization_name", "course_code", "course_name"],
    "count_students_by_major": ["major_name", "major_code"],
    "create_class": ["class_name", "course_code", "lecturer_code", "semester_code"],
    "create_course": ["code", "name", "credits"],
    "create_major": ["code", "name"],
    "create_room": ["name", "capacity"],
    "create_schedule_request": ["original_slot_id", "requested_slot_id", "reason"],
    "create_semester": ["code", "name", "start_date", "end_date"],
    "create_specialization": ["major_code", "spec_code", "spec_name"],
    "create_sub_specialization": ["sub_code", "sub_name", "spec_code"],
    "delete_class": ["class_name"],
    "delete_course": ["code", "name"],
    "delete_major": ["code", "name"],
    "delete_room": ["room_name"],
    "delete_semester": ["semester_code"],
    "delete_specialization": ["code", "name"],
    "delete_sub_specialization": ["code", "name"],
    "get_attendance_by_session_id": ["session_id"],
    "get_attendance_by_slot": ["class_name", "date"],
    "get_attendance_by_slot_number": ["slot_number", "date"],
    "get_attendance_heatmap": ["class_name"],
    "get_attendance_rate_by_course": ["course_name", "course_code"],
    "get_attendance_stats_by_class": ["class_name"],
    "get_attendance_trends": ["class_name"],
    "get_available_classes_for_student": ["semester_code", "semester_name", "student_code"],
    "get_available_slots_for_room": ["room_name", "date"],
    "get_best_performing_classes": ["semester_code", "semester_name"],
    "get_class_health_check": ["class_name"],
    "get_class_info": ["class_name"],
    "get_class_leaderboard": ["semester_code", "semester_name"],
    "get_class_next_session": ["class_name"],
    "get_class_schedule": ["class_name", "date"],
    "get_classmates": ["student_code"],
    "get_consecutive_absences": ["class_name", "threshold_absences"],
    "get_courses_by_name": ["course_name", "course_code"],
    "get_courses_by_spec": ["specialization_name", "specialization_code", "major_name"],
    "get_courses_by_sub_spec": ["sub_specialization_name", "sub_specialization_code", "specialization_name"],
    "get_detail_course_grade": ["course_name", "course_code"],
    "get_empty_rooms": ["date"],
    "get_enrollments_by_class": ["class_name"],
    "get_full_grade_sheet": ["class_name"],
    "get_grade_components_by_course": ["course_name", "course_code"],
    "get_grade_distribution": ["class_name"],
    "get_grade_histogram": ["class_name"],
    "get_grade_improvement_on_retake": ["course_code", "course_name"],
    "get_grade_report_by_class": ["class_name"],
    "get_grade_report_by_course": ["course_name", "course_code"],
    "get_grade_trend_by_student": ["course_name", "course_code"],
    "get_graduation_eligible_students": ["credit_threshold"],
    "get_high_risk_classes": ["semester_code", "semester_name"],
    "get_lecturer_by_code": ["lecturer_code", "full_name"],
    "get_lecturer_workload": ["lecturer_code", "full_name", "semester_code", "semester_name"],
    "get_lecturer_workload_comparison": ["semester_code", "semester_name"],
    "get_lecturers_by_expertise": ["expertise", "department", "course_name", "course_code"],
    "get_lecturers_by_major": ["major_name", "major_code", "department", "course_name"],
    "get_lecturers_teaching_today": ["date"],
    "get_major_curriculum_tree": ["major_code", "major_name"],
    "get_most_absent_students": ["class_name"],
    "get_notification_history_for_user": ["user_code"],
    "get_other_lecturer_schedule": ["lecturer_code", "full_name", "date"],
    "get_other_student_schedule": ["student_code", "full_name", "date"],
    "get_room_fill_rate_by_weekday": ["room_name"],
    "get_room_info": ["room_name"],
    "get_room_usage_weekly": ["room_name", "date"],
    "get_schedule_request_detail": ["request_id"],
    "get_semester_overview": ["semester_code", "semester_name"],
    "get_sessions_by_class": ["class_name"],
    "get_shared_courses_across_specs": ["course_code", "course_name"],
    "get_slot_detail_by_id": ["slot_id"],
    "get_slots_by_date": ["date"],
    "get_slots_by_slot_number": ["slot_number", "date"],
    "get_slots_by_time_range": ["date", "time_start", "time_end"],
    "get_specializations_by_major": ["major_name", "major_code"],
    "get_student_academic_standing": ["student_code"],
    "get_student_academic_timeline": ["student_code", "full_name"],
    "get_student_attendance_by_class": ["student_code", "class_name"],
    "get_student_by_code": ["student_code", "full_name"],
    "get_student_gpa_comparison": ["student_code", "full_name"],
    "get_student_ranking_in_class": ["class_name"],
    "get_student_vs_class_grade": ["class_name", "student_code"],
    "get_students_at_risk": ["gpa_threshold"],
    "get_students_by_class": ["class_name", "course_code", "course_name"],
    "get_students_by_major": ["major_name", "major_code"],
    "get_suitable_rooms_for_class": ["class_name"],
    "get_sub_specializations": ["specialization_name", "specialization_code", "major_name"],
    "get_teaching_effectiveness": ["semester_code", "semester_name"],
    "get_timetable_conflicts": ["lecturer_code", "date"],
    "get_top_lecturers_by_pass_rate": ["semester_code", "semester_name"],
    "get_user_by_code": ["code"],
    "get_weekly_timetable_grid": ["start_date", "end_date"],
    "reject_schedule_request": ["request_id"],
    "remove_student_from_class": ["class_name", "student_code"],
    "search_user_by_name": ["full_name"],
    "update_attendance_manually": ["status", "student_code", "session_id"],
    "update_class": ["class_name", "lecturer_code", "semester_code"],
    "update_course": ["course_code", "name", "credits", "status"],
    "update_lecturer_info": ["lecturer_code", "expertise", "department"],
    "update_major": ["code", "name", "status"],
    "update_room": ["room_name", "capacity", "status"],
    "update_semester": ["semester_code", "name", "start_date", "end_date", "status"],
    "update_specialization": ["code", "name", "status"],
    "update_student_info": ["student_code", "major_code", "major_name"],
    "update_sub_specialization": ["code", "name"],
}


def unique(seq: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    out: List[str] = []
    for item in seq:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def parse_module(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"))


def extract_build_tools_and_required_fields() -> tuple[Set[str], Dict[str, List[str]]]:
    module = parse_module(QUERIES_PATH)
    build_tools: Set[str] = set()
    required_fields: Dict[str, List[str]] = defaultdict(list)

    class ReqCollector(ast.NodeVisitor):
        def __init__(self) -> None:
            self.fields: List[str] = []

        def visit_Call(self, node: ast.Call) -> None:
            if (
                isinstance(node.func, ast.Name)
                and node.func.id == "req"
                and node.args
                and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[0].value, str)
            ):
                self.fields.append(node.args[0].value)
            self.generic_visit(node)

    for node in module.body:
        if not isinstance(node, ast.FunctionDef) or node.name != "build_params":
            continue
        for if_node in ast.walk(node):
            if not isinstance(if_node, ast.If):
                continue
            test = if_node.test
            if not (
                isinstance(test, ast.Compare)
                and isinstance(test.left, ast.Name)
                and test.left.id == "tool_name"
                and test.comparators
            ):
                continue
            comparator = test.comparators[0]
            if not isinstance(comparator, ast.Constant) or not isinstance(comparator.value, str):
                continue
            tool_name = comparator.value
            build_tools.add(tool_name)
            collector = ReqCollector()
            for stmt in if_node.body:
                collector.visit(stmt)
            required_fields[tool_name] = unique(collector.fields)
    return build_tools, required_fields


def extract_set_assignment(module: ast.Module, name: str) -> Set[str]:
    out: Set[str] = set()
    for node in ast.walk(module):
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            if isinstance(target, ast.Name) and target.id == name and isinstance(node.value, ast.Set):
                for elt in node.value.elts:
                    if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                        out.add(elt.value)
    return out


def extract_dict_keys(module: ast.Module, name: str) -> Set[str]:
    out: Set[str] = set()
    for node in ast.walk(module):
        target = None
        value = None
        if isinstance(node, ast.AnnAssign):
            target = node.target
            value = node.value
        elif isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
            value = node.value
        if isinstance(target, ast.Name) and target.id == name and isinstance(value, ast.Dict):
            for key in value.keys:
                if isinstance(key, ast.Constant) and isinstance(key.value, str):
                    out.add(key.value)
    return out


def extract_navigation_tools() -> Set[str]:
    module = parse_module(HARD_ROUTER_PATH)
    out: Set[str] = set()
    for node in ast.walk(module):
        if (
            isinstance(node, ast.AnnAssign)
            and isinstance(node.target, ast.Name)
            and node.target.id == "_NAV_PATTERNS"
            and isinstance(node.value, ast.List)
        ):
            for elt in node.value.elts:
                if (
                    isinstance(elt, ast.Tuple)
                    and elt.elts
                    and isinstance(elt.elts[0], ast.Constant)
                    and isinstance(elt.elts[0].value, str)
                ):
                    out.add(elt.elts[0].value)
    return out


def get_surfaced_tools() -> tuple[Set[str], Dict[str, List[str]], Set[str], Set[str]]:
    build_tools, base_required_fields = extract_build_tools_and_required_fields()
    chatbot_module = parse_module(CHATBOT_SERVICE_PATH)
    route_tools = extract_dict_keys(chatbot_module, "_ROUTE_MAP")
    backend_tools = extract_set_assignment(chatbot_module, "_BACKEND_ACTION_TOOLS") | FALLBACK_BACKEND_ACTION_TOOLS
    nav_tools = extract_navigation_tools()

    permission_tools: Set[str] = set()
    for policy in POLICIES.values():
        permission_tools.update(policy.allow)
        permission_tools.update(policy.deny)

    surfaced_tools = build_tools | route_tools | backend_tools | nav_tools | permission_tools
    surfaced_tools -= EXCLUDED_INTERNAL_TOOLS
    return surfaced_tools, base_required_fields, backend_tools, nav_tools


def classify_tool(tool_name: str, backend_tools: Set[str], nav_tools: Set[str]) -> str:
    if tool_name in backend_tools:
        return "BACKEND_ACTION"
    if tool_name in nav_tools or tool_name.startswith("view_"):
        return "NAVIGATE_ONLY"
    return "SQL_TEMPLATE"


def allowed_roles(tool_name: str) -> str:
    roles: List[str] = []
    for role in ROLE_ORDER:
        if POLICIES[Role(role)].can_use(tool_name):
            roles.append(role)
    return ",".join(roles)


def describe_tool(tool_name: str, tool_type: str) -> str:
    words = tool_name.replace("_", " ")
    if tool_type == "NAVIGATE_ONLY":
        return f"Dieu huong den chuc nang {words}"
    if tool_name.startswith("get_"):
        return f"Truy van du lieu {words}"
    if tool_name.startswith("list_"):
        return f"Liet ke du lieu {words}"
    if tool_name.startswith("count_"):
        return f"Thong ke du lieu {words}"
    if tool_name.startswith("create_"):
        return f"Tao moi {words[7:]}"
    if tool_name.startswith("update_"):
        return f"Cap nhat {words[7:]}"
    if tool_name.startswith("delete_"):
        return f"Xoa {words[7:]}"
    if tool_name.startswith("approve_"):
        return f"Phe duyet {words[8:]}"
    if tool_name.startswith("reject_"):
        return f"Tu choi {words[7:]}"
    if tool_name.startswith("assign_"):
        return f"Gan {words[7:]}"
    if tool_name.startswith("search_"):
        return f"Tim kiem {words[7:]}"
    if tool_name.startswith("export_"):
        return f"Xuat du lieu {words[7:]}"
    return f"Xu ly {words}"


def infer_required_fields(tool_name: str, tool_type: str, base_required_fields: Dict[str, List[str]]) -> List[str]:
    if tool_name in SELF_SERVICE_TOOLS or tool_type == "NAVIGATE_ONLY":
        return []
    if tool_name in EXPLICIT_REQUIRED_FIELDS:
        return EXPLICIT_REQUIRED_FIELDS[tool_name]

    fields = list(base_required_fields.get(tool_name, []))

    if "semester" in tool_name and tool_name not in {"create_semester", "update_semester", "delete_semester"}:
        fields.extend(["semester_code", "semester_name"])
    if "class" in tool_name and tool_name not in {"classmates", "get_classes_by_semester", "create_class", "update_class", "delete_class"}:
        fields.append("class_name")
    if "course" in tool_name and not tool_name.startswith(("create_course", "update_course", "delete_course")):
        fields.extend(["course_name", "course_code"])
    if "room" in tool_name and "room_name" not in fields and tool_name not in {"create_room", "count_rooms_by_status", "get_rooms_busy_now"}:
        fields.append("room_name")
    if "student" in tool_name and "student_code" not in fields and tool_name not in {"get_students_by_major", "get_students_by_class", "get_students_at_risk", "get_students_without_class"}:
        fields.append("student_code")
    if "lecturer" in tool_name and "lecturer_code" not in fields and tool_name not in {"list_lecturers", "get_lecturers_by_major", "get_lecturers_by_expertise", "get_lecturers_teaching_today"}:
        fields.append("lecturer_code")

    return unique(fields)


def sql_quote(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def render_sql() -> str:
    surfaced_tools, base_required_fields, backend_tools, nav_tools = get_surfaced_tools()
    rows: List[str] = []

    for tool_name in sorted(surfaced_tools):
        tool_type = classify_tool(tool_name, backend_tools, nav_tools)
        required_fields = infer_required_fields(tool_name, tool_type, base_required_fields)
        rows.append(
            "    ("
            + ", ".join(
                [
                    sql_quote(tool_name),
                    sql_quote(tool_type),
                    sql_quote(describe_tool(tool_name, tool_type)),
                    sql_quote(TEMPLATES.get(tool_name).strip() if TEMPLATES.get(tool_name) else None),
                    "NULL",
                    "TRUE",
                    sql_quote(allowed_roles(tool_name) or "ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT"),
                    sql_quote(",".join(required_fields) if required_fields else None),
                ]
            )
            + ")"
        )

    sql_lines = [
        "-- Seed AI tools generated from current Python chat code",
        f"-- Total tools: {len(rows)}",
        "",
        "INSERT INTO ai_tools (",
        "    name,",
        "    type,",
        "    description,",
        "    sql_template,",
        "    accuracy_percentage,",
        "    is_active,",
        "    allowed_roles,",
        "    required_fields",
        ") VALUES",
        ",\n".join(rows),
        "ON CONFLICT (name) DO UPDATE SET",
        "    type = EXCLUDED.type,",
        "    description = EXCLUDED.description,",
        "    sql_template = EXCLUDED.sql_template,",
        "    accuracy_percentage = EXCLUDED.accuracy_percentage,",
        "    is_active = EXCLUDED.is_active,",
        "    allowed_roles = EXCLUDED.allowed_roles,",
        "    required_fields = EXCLUDED.required_fields,",
        "    updated_at = CURRENT_TIMESTAMP;",
        "",
    ]
    return "\n".join(sql_lines)


def main() -> int:
    OUTPUT_PATH.write_text(render_sql(), encoding="utf-8")
    print(f"Wrote seed SQL to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
