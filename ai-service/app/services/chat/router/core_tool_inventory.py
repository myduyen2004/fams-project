from __future__ import annotations

from typing import Dict, Set


GENERAL_AI_TOOLS: Set[str] = {
    "general_offtopic_chat",
}

FPT_TOOL_NAMES: Set[str] = {
    "fpt_tool",
    "fptu_knowledge_lookup",
}

_ADMIN_VIEW_TOOLS: Set[str] = {
    "view_profile",
    "view_users",
    "view_inactive_users",
    "view_notifications",
    "view_students",
    "view_lecturers",
    "view_majors",
    "view_courses",
    "view_rooms",
    "view_semesters",
    "view_classes",
    "view_schedule",
    "view_grades",
    "view_results",
    "view_specializations",
    "view_sub_specializations",
    "view_dashboard",
    "view_logs",
    "view_alerts",
}

_ACADEMIC_STAFF_VIEW_TOOLS: Set[str] = {
    "view_profile",
    "view_notifications",
    "view_students",
    "view_lecturers",
    "view_majors",
    "view_courses",
    "view_rooms",
    "view_semesters",
    "view_classes",
    "view_schedule",
    "view_grades",
    "view_results",
    "view_specializations",
    "view_sub_specializations",
    "view_dashboard",
    "view_logs",
    "view_alerts",
    "view_exam_grades",
    "view_resit_grades",
    "view_wifi_aps",
    "view_attendance_config",
    "view_schedule_requests",
    "view_timetable",
}

_LECTURER_VIEW_TOOLS: Set[str] = {
    "view_profile",
    "view_schedule",
    "view_messages",
    "view_assignments",
    "view_teaching_classes",
    "view_schedule_requests",
    "view_grades",
}

_STUDENT_VIEW_TOOLS: Set[str] = {
    "view_profile",
    "view_schedule",
    "view_messages",
    "view_assignments",
    "view_grades",
}

ROLE_CORE_TOOLS: Dict[str, Set[str]] = {
    "ADMIN": _ADMIN_VIEW_TOOLS
    | {
        "activate_user",
        "count_users_by_role",
        "create_user",
        "get_user_by_code",
        "update_user",
        "send_email",
        "create_notification",
    }
    | GENERAL_AI_TOOLS,
    "ACADEMIC_STAFF": _ACADEMIC_STAFF_VIEW_TOOLS
    | {
        "get_active_semester",
        "get_abnormal_attendance",
        "get_all_rooms_today",
        "get_attendance_by_slot",
        "get_attendance_by_slot_number",
        "get_attendance_stats_by_class",
        "get_empty_rooms",
        "get_available_slots_for_room",
        "get_class_info",
        "get_class_schedule",
        "get_classes_by_semester",
        "get_classmates",
        "get_consecutive_absences",
        "get_courses_by_name",
        "get_courses_by_spec",
        "get_full_grade_sheet",
        "get_grade_components_by_course",
        "get_lecturer_workload",
        "get_lecturers_by_expertise",
        "get_lecturers_by_major",
        "get_major_id_by_name",
        "get_other_lecturer_schedule",
        "get_other_student_schedule",
        "get_room_usage_weekly",
        "get_semester_overview",
        "get_slots_by_date",
        "get_specializations_by_major",
        "get_student_academic_standing",
        "get_students_at_risk",
        "get_students_by_class",
        "get_students_by_major",
        "get_top_students",
        "get_user_by_code",
        "list_notifications",
        "send_email",
        "create_notification",
    }
    | GENERAL_AI_TOOLS,
    "LECTURER": _LECTURER_VIEW_TOOLS
    | {
        "create_notification",
        "get_active_semester",
        "get_class_info",
        "get_class_schedule",
        "get_courses_by_name",
        "get_courses_by_spec",
        "get_courses_by_sub_spec",
        "create_schedule_request",
        "get_own_schedule",
        "get_specializations_by_major",
        "update_attendance_manually",
        "get_student_by_code",
        "get_students_at_risk",
        "get_enrollments_by_class",
        "get_sub_specializations",
        "list_majors",
        "list_semesters",
    }
    | GENERAL_AI_TOOLS
    | FPT_TOOL_NAMES,
    "STUDENT": _STUDENT_VIEW_TOOLS
    | {
        "count_unread_notifications",
        "excel_query",
        "get_active_semester",
        "get_attendance_report_by_student",
        "get_class_schedule",
        "get_courses_by_name",
        "get_courses_by_spec",
        "get_courses_by_sub_spec",
        "get_detail_course_grade",
        "get_grade_components_by_course",
        "get_my_attendance_status",
        "get_my_notifications",
        "get_own_grades",
        "get_own_schedule",
        "get_specializations_by_major",
        "get_sub_specializations",
        "list_majors",
        "list_semesters",
    }
    | GENERAL_AI_TOOLS
    | FPT_TOOL_NAMES,
}

ALL_CORE_TOOLS: Set[str] = set().union(*ROLE_CORE_TOOLS.values())


def is_kept_tool(tool_name: str) -> bool:
    return tool_name.startswith("view_") or tool_name in ALL_CORE_TOOLS


def allowed_roles_for_tool(tool_name: str) -> Set[str]:
    return {role for role, tools in ROLE_CORE_TOOLS.items() if tool_name in tools}
