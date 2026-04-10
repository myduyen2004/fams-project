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
from typing import Dict, Set, Tuple

from app.services.chat.router.core_tool_inventory import ROLE_CORE_TOOLS


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


_TOOL_ALIASES: Dict[str, str] = {
    "get_student_by_name": "get_student_by_code",
    "get_lecturer_by_name": "get_lecturer_by_code",
    "search_student": "get_student_by_code",
    "search_lecturer": "get_lecturer_by_code",
    "get_my_grades": "get_own_grades",
    "get_my_schedule": "get_own_schedule",
    "get_my_schedule_targeted": "get_own_schedule",
    "fptu_knowledge_lookup": "fpt_tool",
}

_ADMIN_ALLOW: Set[str] = set(ROLE_CORE_TOOLS["ADMIN"])
_ACADEMIC_STAFF_ALLOW: Set[str] = set(ROLE_CORE_TOOLS["ACADEMIC_STAFF"])
_LECTURER_ALLOW: Set[str] = set(ROLE_CORE_TOOLS["LECTURER"])
_STUDENT_ALLOW: Set[str] = set(ROLE_CORE_TOOLS["STUDENT"])


# ── Policy Registry ──────────────────────────────────────────────────────────
POLICIES: dict[Role, PermissionPolicy] = {
    Role.ADMIN: PermissionPolicy(
        allow_all=False,
        allow=_ADMIN_ALLOW,
    ),
    Role.ACADEMIC_STAFF: PermissionPolicy(
        allow_all=False,
        allow=_ACADEMIC_STAFF_ALLOW,
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
    normalized_tool = _TOOL_ALIASES.get(tool, tool)

    try:
        policy = POLICIES[Role(role)]
    except (KeyError, ValueError):
        return False, f"Vai trò '{role}' không được nhận dạng trong hệ thống."

    if policy.can_use(normalized_tool):
        return True, ""

    label = _ROLE_LABELS.get(role, role)
    return False, f"{label} không có quyền thực hiện thao tác '{normalized_tool}'."
