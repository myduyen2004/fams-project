#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, Iterable, List, Sequence


ROOT = Path(__file__).resolve().parents[2]
AI_SERVICE_ROOT = ROOT / "ai-service"
OUTPUT_PATH = ROOT / "docs/AI_TOOL_TEST_QUESTIONS.md"

sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.services.chat.db.queries import TEMPLATES  # type: ignore
from app.services.chat.router.permissions import POLICIES, Role  # type: ignore
from app.services.chat.router.tool_catalog import (  # type: ignore
    EXPLICIT_REQUIRED_FIELDS,
    SELF_SERVICE_TOOLS,
    get_tool_agent,
    require_all_required_fields,
)


ROLE_ORDER = ["ADMIN", "ACADEMIC_STAFF", "LECTURER", "STUDENT"]
ROLE_LABELS = {
    "ADMIN": "Admin",
    "ACADEMIC_STAFF": "Nhân viên đào tạo",
    "LECTURER": "Giảng viên",
    "STUDENT": "Sinh viên",
}

FIELD_SAMPLES: Dict[str, Dict[str, str]] = {
    "code": {"good": "USR001", "bad": "??", "phrase": "mã USR001"},
    "user_code": {"good": "SE170001", "bad": "???", "phrase": "mã người dùng SE170001"},
    "student_code": {"good": "SE170001", "bad": "sv abc", "phrase": "mã sinh viên SE170001"},
    "lecturer_code": {"good": "GV001", "bad": "gv abc", "phrase": "mã giảng viên GV001"},
    "full_name": {"good": "Nguyen Van A", "bad": "", "phrase": "họ tên Nguyen Van A"},
    "class_name": {"good": "PRF192_SE1", "bad": "lop 1", "phrase": "mã lớp PRF192_SE1"},
    "course_code": {"good": "PRF192", "bad": "oop", "phrase": "mã môn PRF192"},
    "course_name": {"good": "Programming Fundamentals", "bad": "", "phrase": "tên môn Programming Fundamentals"},
    "major_code": {"good": "SE", "bad": "se nganh", "phrase": "mã ngành SE"},
    "major_name": {"good": "Cong nghe thong tin", "bad": "", "phrase": "ngành Công nghệ thông tin"},
    "specialization_code": {"good": "SE", "bad": "spec 1", "phrase": "mã chuyên ngành SE"},
    "specialization_name": {"good": "Ky thuat phan mem", "bad": "", "phrase": "chuyên ngành Kỹ thuật phần mềm"},
    "sub_specialization_code": {"good": "AI", "bad": "sub 1", "phrase": "mã chuyên ngành hẹp AI"},
    "sub_specialization_name": {"good": "Tri tue nhan tao", "bad": "", "phrase": "chuyên ngành hẹp Trí tuệ nhân tạo"},
    "spec_code": {"good": "SE", "bad": "spec 1", "phrase": "mã chuyên ngành SE"},
    "spec_name": {"good": "Ky thuat phan mem", "bad": "", "phrase": "tên chuyên ngành Kỹ thuật phần mềm"},
    "sub_code": {"good": "AI", "bad": "sub 1", "phrase": "mã chuyên ngành hẹp AI"},
    "sub_name": {"good": "Tri tue nhan tao", "bad": "", "phrase": "tên chuyên ngành hẹp Trí tuệ nhân tạo"},
    "semester_code": {"good": "SP26", "bad": "spring 2026", "phrase": "mã học kỳ SP26"},
    "semester_name": {"good": "Spring 2026", "bad": "", "phrase": "tên học kỳ Spring 2026"},
    "semester": {"good": "Spring 2026", "bad": "", "phrase": "học kỳ Spring 2026"},
    "room_name": {"good": "A101", "bad": "phong 1", "phrase": "phòng A101"},
    "date": {"good": "2026-03-20", "bad": "mai nhe", "phrase": "ngày 2026-03-20"},
    "start_date": {"good": "2026-03-20", "bad": "20/03", "phrase": "ngày bắt đầu 2026-03-20"},
    "end_date": {"good": "2026-03-27", "bad": "27/03", "phrase": "ngày kết thúc 2026-03-27"},
    "slot_number": {"good": "2", "bad": "ca hai", "phrase": "slot 2"},
    "slot_id": {"good": "101", "bad": "slot A", "phrase": "mã slot 101"},
    "session_id": {"good": "101", "bad": "session A", "phrase": "mã phiên 101"},
    "original_slot_id": {"good": "101", "bad": "goc A", "phrase": "slot gốc 101"},
    "requested_slot_id": {"good": "202", "bad": "doi B", "phrase": "slot muốn đổi 202"},
    "request_id": {"good": "15", "bad": "req A", "phrase": "mã yêu cầu 15"},
    "status": {"good": "ACTIVE", "bad": "on", "phrase": "trạng thái ACTIVE"},
    "role": {"good": "LECTURER", "bad": "teacher", "phrase": "vai trò LECTURER"},
    "name": {"good": "Khoa hoc moi", "bad": "", "phrase": "tên Khoa học mới"},
    "credits": {"good": "3", "bad": "ba", "phrase": "3 tín chỉ"},
    "capacity": {"good": "40", "bad": "rộng", "phrase": "sức chứa 40"},
    "expertise": {"good": "Java", "bad": "", "phrase": "chuyên môn Java"},
    "department": {"good": "CNTT", "bad": "", "phrase": "bộ môn CNTT"},
    "threshold_absences": {"good": "3", "bad": "ba", "phrase": "ngưỡng vắng 3 buổi"},
    "credit_threshold": {"good": "120", "bad": "mot tram hai muoi", "phrase": "ngưỡng 120 tín chỉ"},
    "gpa_threshold": {"good": "2.5", "bad": "hai cham nam", "phrase": "ngưỡng GPA 2.5"},
    "time_start": {"good": "07:00", "bad": "7 giờ", "phrase": "từ 07:00"},
    "time_end": {"good": "09:00", "bad": "9 giờ", "phrase": "đến 09:00"},
    "start_time": {"good": "07:00", "bad": "7 giờ", "phrase": "bắt đầu 07:00"},
    "end_time": {"good": "09:00", "bad": "9 giờ", "phrase": "kết thúc 09:00"},
    "reason": {"good": "Trung lich giang day", "bad": "", "phrase": "lý do trùng lịch giảng dạy"},
    "keyword": {"good": "Java", "bad": "", "phrase": "từ khóa Java"},
}


def readable_tool_name(tool: str) -> str:
    name = tool.replace("_", " ")
    replacements = {
        "get ": "lấy ",
        "count ": "thống kê ",
        "list ": "danh sách ",
        "create ": "tạo ",
        "update ": "cập nhật ",
        "delete ": "xóa ",
        "assign ": "gán ",
        "add ": "thêm ",
        "remove ": "xóa ",
        "view ": "mở ",
    }
    for old, new in replacements.items():
        if name.startswith(old):
            return new + name[len(old):]
    return name


def tool_surface() -> List[str]:
    all_tools = set(TEMPLATES.keys())
    all_tools.update(EXPLICIT_REQUIRED_FIELDS.keys())
    all_tools.update(SELF_SERVICE_TOOLS)
    for policy in POLICIES.values():
        all_tools.update(policy.allow)
        all_tools.update(policy.deny)
    return sorted(all_tools)


def allowed_roles(tool: str) -> List[str]:
    out: List[str] = []
    for role in ROLE_ORDER:
        if POLICIES[Role(role)].can_use(tool):
            out.append(role)
    return out


def denied_roles(tool: str) -> List[str]:
    return [role for role in ROLE_ORDER if role not in allowed_roles(tool)]


def required_fields(tool: str) -> List[str]:
    return EXPLICIT_REQUIRED_FIELDS.get(tool, [])


def field_phrase(field: str, kind: str = "phrase") -> str:
    sample = FIELD_SAMPLES.get(field, {})
    return sample.get(kind) or f"{field} {sample.get('good', 'demo')}".strip()


def success_question(tool: str, role: str, fields: Sequence[str]) -> str:
    role_prefix = {
        "ADMIN": "Tôi là admin,",
        "ACADEMIC_STAFF": "Tôi là nhân viên đào tạo,",
        "LECTURER": "Tôi là giảng viên,",
        "STUDENT": "Tôi là sinh viên,",
    }.get(role, "Tôi là người dùng,")
    subject = readable_tool_name(tool)
    selected_fields = list(fields[:2])
    if require_all_required_fields(tool):
        selected_fields = list(fields)
    detail = ", ".join(field_phrase(field) for field in selected_fields if field)
    if detail:
        return f"{role_prefix} hãy {subject} với {detail}."
    return f"{role_prefix} hãy {subject}."


def missing_question(tool: str, fields: Sequence[str]) -> str:
    if not fields:
        return f"Hãy {readable_tool_name(tool)}."
    return f"Hãy {readable_tool_name(tool)} nhưng không cung cấp {fields[0]}."


def invalid_question(tool: str, fields: Sequence[str]) -> str:
    if not fields:
        return f"Hãy {readable_tool_name(tool)} với dữ liệu không hợp lệ."
    field = fields[0]
    bad = field_phrase(field, "bad") or "sai định dạng"
    return f"Hãy {readable_tool_name(tool)} với {field} = '{bad}'."


def permission_question(tool: str, denied_role: str, fields: Sequence[str]) -> str:
    return success_question(tool, denied_role, fields)


def write_markdown(tools: Iterable[str]) -> str:
    lines: List[str] = []
    lines.append("# AI Tool Test Questions")
    lines.append("")
    lines.append("Tài liệu này được generate từ tool surface hiện tại của chatbot.")
    lines.append("Mỗi tool có câu hỏi test theo role được phép, case thiếu dữ liệu, case sai định dạng, và case không đủ quyền khi có.")
    lines.append("")

    for tool in tools:
        roles = allowed_roles(tool)
        if not roles:
            continue
        denied = denied_roles(tool)
        fields = required_fields(tool)
        agent = get_tool_agent(tool)

        lines.append(f"## {tool}")
        lines.append("")
        lines.append(f"- Agent: `{agent}`")
        lines.append(f"- Allowed roles: {', '.join(f'`{role}`' for role in roles)}")
        lines.append(f"- Required fields: {', '.join(f'`{field}`' for field in fields) if fields else '`Không có`'}")
        lines.append("")
        lines.append("### Happy Path")
        for role in roles:
            lines.append(f"- `{role}`: {success_question(tool, role, fields)}")

        if fields:
            lines.append("")
            lines.append("### Validation Cases")
            lines.append(f"- Missing field: {missing_question(tool, fields)}")
            lines.append(f"- Invalid field: {invalid_question(tool, fields)}")

        if denied:
            lines.append("")
            lines.append("### Permission Case")
            lines.append(f"- `{denied[0]}`: {permission_question(tool, denied[0], fields)}")

        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    content = write_markdown(tool_surface())
    OUTPUT_PATH.write_text(content, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
