"""
router/permissions.py
RBAC – Role-based access control cho chatbot FAMS.

Nguyên tắc phân quyền (sau khi loại bỏ UC bảo mật):
  • ADMIN          → Quản trị user, thông báo, xem dữ liệu tổng quan
  • ACADEMIC_STAFF → Toàn quyền đào tạo, KHÔNG quản lý tài khoản
  • LECTURER       → Quản lý lớp mình dạy, điểm danh, điểm số, lịch dạy
  • STUDENT        → Chỉ xem thông tin cá nhân và học thuật công khai

UC đã loại khỏi chatbot (quá bảo mật / cần UI riêng):
  UC-01/02 Auth, UC-05/06 Password, UC-07 Import Users,
  UC-16/17 System/Access Logs, UC-58/59/60 WiFi/Attendance Config,
  UC-61/63/64 QR/Face Scan, UC-75 Calendar Sync, UC-82/83 Chat
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Set, Tuple


class Role(str, Enum):
    ADMIN          = "ADMIN"
    ACADEMIC_STAFF = "ACADEMIC_STAFF"
    LECTURER       = "LECTURER"
    STUDENT        = "STUDENT"


@dataclass(frozen=True)
class PermissionPolicy:
    allow_all: bool = False
    allow: Set[str] = field(default_factory=set)
    deny:  Set[str] = field(default_factory=set)

    def can_use(self, tool: str) -> bool:
        if tool in self.deny:
            return False
        if self.allow_all:
            return True
        return tool in self.allow


# ── ADMIN tools ──────────────────────────────────────────────────────────────
# Admin chỉ quản trị user + thông báo + xem dữ liệu tổng quan
_ADMIN_ALLOW: Set[str] = {
    # Profile
    "view_profile", "update_profile",
    # User management (UC-08~12)
    "view_users", "view_inactive_users",
    "get_user_by_code", "search_user_by_name", "count_users_by_role",
    "create_user", "update_user", "delete_user", "activate_user",
    # Notifications (UC-14~15)
    "view_notifications", "list_notifications",
    "get_my_notifications", "count_unread_notifications",
    "create_notification", "send_email",
    # Academic view
    "view_students", "view_lecturers", "view_majors", "view_courses",
    "view_rooms", "view_semesters", "view_classes", "view_schedule",
    "view_grades", "view_specializations",
    # Excel & Dynamic
    "excel_query", "export_excel", "dynamic_sql",
}

# ── ACADEMIC STAFF tools ─────────────────────────────────────────────────────
# Toàn quyền đào tạo, KHÔNG có user management và KHÔNG có thông tin cá nhân
_ACADEMIC_STAFF_DENY: Set[str] = {
    # User management → chỉ Admin
    "view_users", "view_inactive_users", "count_users_by_role",
    "create_user", "update_user", "delete_user", "activate_user",
    # Personal schedule/grades → không có vai trò giảng dạy
    "get_own_schedule", "get_own_grades",
    "get_my_attendance_status", "get_attendance_report_by_student",
    "get_detail_course_grade",
    # Personal lecturer tools
    "get_my_schedule_requests", "create_schedule_request",
    "view_teaching_classes",
    "update_attendance_manually",
    # ✅ FIX #10: REMOVED get_grade_report_by_class from deny list
    # ACADEMIC_STAFF CAN xem bảng điểm tất cả lớp
    "import_component_grades",
    # ✅ REMOVED: get_other_lecturer_schedule, get_other_student_schedule
    # → ACADEMIC_STAFF CAN view other lecturer/student schedules
}

# ── LECTURER whitelist ────────────────────────────────────────────────────────
_LECTURER_ALLOW: Set[str] = {
    # Profile (UC-03~04)
    "view_profile", "update_profile",
    # Schedule - lớp mình dạy (UC-70~72)
    "get_own_schedule", "view_schedule",
    "view_teaching_classes", "get_class_info",
    "get_class_schedule",
    # ✅ REMOVED: get_other_lecturer_schedule, get_other_student_schedule
    # → Chỉ ADMIN + ACADEMIC_STAFF mới xem được lịch của người khác
    # Schedule requests (UC-55~57)
    "view_schedule_requests",
    "get_my_schedule_requests",
    "get_schedule_request_detail",
    "create_schedule_request",
    # Attendance - lớp mình dạy (UC-62, 65, 68~69)
    "get_attendance_by_slot",
    "get_attendance_stats_by_class",
    "get_attendance_rate_by_course",
    "update_attendance_manually",
    "export_attendance_stats",
    # Grades - lớp mình dạy (UC-76~77)
    "view_grades",
    "get_grade_report_by_class",
    "get_grade_components_by_course",
    "import_component_grades",
    # Student info - read only (UC-20~21)
    "get_students_by_class",
    "get_enrollments_by_class",  # ✅ FIX: Allow lecturers to see student roster
    "get_student_by_code",
    "search_user_by_name",
    "get_students_at_risk",
    # Academic info - read only
    "get_courses_by_name",
    "list_semesters",
    "get_active_semester",
    "get_classes_by_semester",
    # Notifications (UC-15)
    "get_my_notifications",
    "count_unread_notifications",
    "create_notification",           # Tạo thông báo cho lớp
    "send_email",
    # Excel
    "excel_query",
    "export_excel",
}

# ── STUDENT whitelist ─────────────────────────────────────────────────────────
_STUDENT_ALLOW: Set[str] = {
    # Profile (UC-03~04)
    "view_profile", "update_profile",
    # Schedule (UC-73~74)
    "get_own_schedule", "view_schedule",
    "get_class_schedule",
    # Attendance (UC-66~67)
    "get_my_attendance_status",
    "get_attendance_report_by_student",
    # Grades (UC-80~81)
    "view_grades",
    "get_own_grades",
    "get_detail_course_grade",
    # Academic info - public read only (UC-39)
    "get_courses_by_name",
    "get_grade_components_by_course",
    "list_majors",
    "get_specializations_by_major",
    "get_sub_specializations",
    "get_courses_by_spec",
    "get_courses_by_sub_spec",
    "list_semesters",
    "get_active_semester",
    # Notifications (UC-15)
    "get_my_notifications",
    "count_unread_notifications",
    # Excel
    "excel_query",
}


# ── Policy Registry ──────────────────────────────────────────────────────────
POLICIES: dict[Role, PermissionPolicy] = {
    Role.ADMIN: PermissionPolicy(
        allow_all=False,
        allow=_ADMIN_ALLOW,
    ),
    Role.ACADEMIC_STAFF: PermissionPolicy(
        allow_all=True,
        deny=_ACADEMIC_STAFF_DENY,
    ),
    Role.LECTURER: PermissionPolicy(
        allow_all=False,
        allow=_LECTURER_ALLOW,
    ),
    Role.STUDENT: PermissionPolicy(
        allow_all=False,
        allow=_STUDENT_ALLOW,
    ),
}

_ROLE_LABELS: dict[str, str] = {
    "ADMIN":          "Quản trị viên",
    "ACADEMIC_STAFF": "Nhân viên đào tạo",
    "LECTURER":       "Giảng viên",
    "STUDENT":        "Sinh viên",
}


def check_permission(role: str, tool: str) -> Tuple[bool, str]:
    """Returns (allowed, reason). reason='' khi allowed=True."""
    try:
        policy = POLICIES[Role(role)]
    except (KeyError, ValueError):
        return False, f"Vai trò '{role}' không được nhận dạng trong hệ thống."

    if policy.can_use(tool):
        return True, ""

    label = _ROLE_LABELS.get(role, role)
    return False, f"{label} không có quyền thực hiện thao tác '{tool}'."