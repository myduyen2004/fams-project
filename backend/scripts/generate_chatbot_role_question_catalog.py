#!/usr/bin/env python3
from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path
from typing import DefaultDict, Dict, Iterable, List, Sequence, Tuple


ROOT = Path(__file__).resolve().parents[2]
AI_SERVICE_ROOT = ROOT / "ai-service"
OUTPUT_PATH = ROOT / "docs/CHATBOT_ROLE_QUESTION_CATALOG.md"

sys.path.insert(0, str(ROOT / "backend" / "scripts"))
sys.path.insert(0, str(AI_SERVICE_ROOT))

from generate_ai_tools_seed import classify_tool, get_surfaced_tools  # type: ignore
from app.services.chat.router.permissions import POLICIES, Role  # type: ignore
from app.services.chat.router.tool_catalog import (  # type: ignore
    FIELD_META,
    EXPLICIT_REQUIRED_FIELDS,
    get_tool_agent,
    require_all_required_fields,
)


ROLE_ORDER = ["ACADEMIC_STAFF", "LECTURER", "STUDENT", "ADMIN"]
ROLE_LABELS = {
    "ADMIN": "ADMIN",
    "ACADEMIC_STAFF": "ACADEMIC_STAFF",
    "LECTURER": "LECTURER",
    "STUDENT": "STUDENT",
}

TYPE_ORDER = ["SQL_TEMPLATE", "BACKEND_ACTION", "NAVIGATE_ONLY"]
TYPE_LABELS = {
    "SQL_TEMPLATE": "SQL_TEMPLATE",
    "BACKEND_ACTION": "BACKEND_ACTION",
    "NAVIGATE_ONLY": "NAVIGATE_ONLY",
}

AGENT_LABELS = {
    "people": "People",
    "courses": "Courses",
    "schedule": "Schedule",
    "attendance": "Attendance",
    "grades": "Grades",
    "facilities": "Facilities",
    "notifications": "Notifications",
    "admin": "Admin",
}

FIELD_SAMPLES: Dict[str, List[str]] = {
    "code": ["USR001", "GV001"],
    "user_code": ["SE170001", "GV001"],
    "student_code": ["SE170001", "SE180123"],
    "lecturer_code": ["GV001", "GV015"],
    "full_name": ["Lê Xuân Bảo", "Nguyễn Văn An"],
    "class_name": ["SE18B05-PRF192", "PRF192_SE1"],
    "course_code": ["PRF192", "MAD101"],
    "course_name": ["Programming Fundamentals", "Mobile Application Development"],
    "major_code": ["SE", "CNTT"],
    "major_name": ["Công nghệ thông tin", "Kỹ thuật phần mềm"],
    "specialization_code": ["SE", "IA"],
    "specialization_name": ["Kỹ thuật phần mềm", "Trí tuệ nhân tạo"],
    "sub_specialization_code": ["AI", "DA"],
    "sub_specialization_name": ["Trí tuệ nhân tạo", "Khoa học dữ liệu"],
    "spec_code": ["SE", "IA"],
    "spec_name": ["Kỹ thuật phần mềm", "Trí tuệ nhân tạo"],
    "sub_code": ["AI", "DA"],
    "sub_name": ["Trí tuệ nhân tạo", "Khoa học dữ liệu"],
    "semester_code": ["SP26", "FA25"],
    "semester_name": ["Spring 2026", "Fall 2025"],
    "semester": ["Spring 2026", "Fall 2025"],
    "room_name": ["A101", "G201"],
    "date": ["ngày mai", "tuần này"],
    "start_date": ["2026-03-21", "2026-04-01"],
    "end_date": ["2026-03-27", "2026-04-07"],
    "original_date": ["2026-04-03"],
    "requested_date": ["2026-03-21"],
    "slot_number": ["slot 2", "ca 3"],
    "original_slot_number": ["slot 1"],
    "requested_slot_number": ["slot 2"],
    "slot_id": ["slot 101"],
    "session_id": ["session 101"],
    "original_slot_id": ["slot 101"],
    "requested_slot_id": ["slot 202"],
    "request_id": ["request 15"],
    "status": ["PENDING", "ACTIVE"],
    "reason": ["vì trùng lịch giảng dạy", "vì em muốn cải thiện điểm"],
    "content": ["rằng ngày mai nghỉ học", "nội dung nhắc nộp bài đúng hạn"],
    "subject": ["Thông báo nghỉ học ngày mai", "Nhắc nhở nộp bài"],
    "recipient_code": ["SE170001", "GV001"],
    "target_type": ["CLASS", "ROLE"],
    "request_type": ["RETAKE_COURSE", "CHANGE_CLASS"],
    "request_title": ["Đơn đề nghị hỗ trợ học vụ"],
    "to_class_name": ["SE18B06-PRF192"],
    "to_major": ["Kỹ thuật phần mềm"],
    "to_specialization": ["Trí tuệ nhân tạo"],
    "to_sub_specialization": ["Khoa học dữ liệu"],
    "gpa_threshold": ["GPA 2.0", "GPA 2.5"],
    "role": ["STUDENT", "LECTURER"],
    "name": ["Công nghệ thông tin", "Spring 2026"],
    "credits": ["3 tín chỉ"],
    "capacity": ["sức chứa 40"],
    "expertise": ["chuyên môn Java"],
    "department": ["bộ môn CNTT"],
    "time_start": ["07:00"],
    "time_end": ["09:00"],
    "start_time": ["07:00"],
    "end_time": ["09:00"],
    "keyword": ["từ khóa Java"],
}

TOOL_OVERRIDES: Dict[str, Dict[str, List[str]]] = {
    "get_student_by_code": {
        "student_code": [
            "Thông tin sinh viên mã SE001011",
            "Tra cứu sinh viên SE001011",
        ],
        "full_name": [
            "Tìm sinh viên Lê Xuân Bảo",
            "Hồ sơ sinh viên Lê Xuân Bảo",
        ],
    },
    "get_students_by_class": {
        "class_name": [
            "Danh sách SV lớp SE18B02-MAD101",
            "Sinh viên nào trong lớp SE18B01-PRF192?",
        ],
        "course_code": [
            "Sinh viên lớp môn PRF192",
            "Danh sách sinh viên học môn MAD101",
        ],
        "course_name": [
            "Danh sách sinh viên học Programming Fundamentals",
        ],
    },
    "count_students_by_major": {
        "major_name": [
            "Đếm sinh viên ngành Công nghệ thông tin",
            "Có bao nhiêu sinh viên ngành Kỹ thuật phần mềm?",
        ],
        "major_code": [
            "Số lượng sinh viên ngành SE",
            "Ngành CNTT có bao nhiêu sinh viên?",
        ],
    },
    "get_empty_rooms": {
        "date+slot_number": [
            "Danh sách phòng học trống slot 2 ngày mai",
            "Phòng nào trống ca 3 hôm nay?",
        ],
    },
    "get_grade_components_by_course": {
        "course_code": [
            "Cấu phần điểm môn PRF192",
            "Cấu phần điểm môn MAD101",
        ],
        "course_name": [
            "Thành phần điểm môn Programming Fundamentals",
        ],
    },
    "get_own_schedule": {
        "__self__": [
            "Thời khóa biểu của tôi tuần này",
            "Lịch học ngày mai của tôi",
        ],
    },
    "get_own_grades": {
        "__self__": [
            "Bảng điểm của tôi",
            "Điểm của tôi trong học kỳ này",
        ],
    },
    "create_schedule_request": {
        "all": [
            "Tạo yêu cầu đổi lịch dạy lớp SE18B05-PRF192 từ ngày 2026-04-03 slot 1 sang ngày 2026-03-21 slot 2 vì tôi bị đau bụng",
            "Đổi lịch từ slot 101 sang 202 vì trùng lịch giảng dạy",
        ],
    },
    "send_email": {
        "content": [
            "Gửi email cho lớp SE18B05-PRF192 rằng ngày mai nghỉ học",
            "Gửi email cho GV001 rằng em xin phép nộp bài trễ",
        ],
    },
    "create_notification": {
        "content": [
            "Tạo thông báo cho lớp SE18B05-PRF192 rằng ngày mai nghỉ học",
            "Gửi thông báo đến sinh viên lớp SE18B05-PRF192 rằng nhớ nộp bài trước 22h",
        ],
    },
    "create_group_chat": {
        "class_name": [
            "Tạo cho tôi nhóm chat lớp SE18B05-PRF192",
            "Mở group chat cho lớp PRF192_SE1",
        ],
    },
    "create_academic_request": {
        "all": [
            "Tạo đơn học lại môn PRF192 vì em muốn cải thiện điểm",
            "Tạo đơn chuyển lớp từ SE18B05-PRF192 sang SE18B06-PRF192 vì trùng lịch",
        ],
    },
    "list_majors": {
        "__self__": [
            "Danh sách ngành học",
            "Trường có những ngành nào?",
        ],
    },
}

NO_KEY_QUERY_OVERRIDES: Dict[str, List[str]] = {
    "excel_query": [
        "Hỗ trợ tôi truy vấn dữ liệu từ file Excel",
        "Phân tích dữ liệu Excel giúp tôi",
    ],
    "get_open_sessions_now": [
        "Hiện tại đang có session điểm danh nào mở?",
        "Các buổi điểm danh nào đang mở lúc này?",
    ],
    "get_system_dashboard": [
        "Tổng quan dashboard hệ thống hiện tại",
        "Dashboard hệ thống đang như thế nào?",
    ],
    "get_abnormal_attendance": [
        "Có ca điểm danh nào bất thường không?",
        "Những bản ghi điểm danh bất thường là gì?",
    ],
    "get_gpa_attendance_correlation": [
        "Tương quan giữa GPA và điểm danh như thế nào?",
        "GPA có liên quan gì đến chuyên cần không?",
    ],
    "get_all_rooms_today": [
        "Danh sách tất cả phòng học hôm nay",
        "Hôm nay có những phòng nào trong hệ thống?",
    ],
    "get_rooms_busy_now": [
        "Phòng nào đang được sử dụng ngay bây giờ?",
        "Danh sách phòng đang bận hiện tại",
    ],
    "get_grade_trend_by_student": [
        "Xu hướng điểm của sinh viên hiện tại như thế nào?",
        "Điểm của sinh viên đang tăng hay giảm?",
    ],
    "get_overdue_urgent_notifications": [
        "Có thông báo khẩn nào đang quá hạn không?",
        "Danh sách thông báo khẩn quá hạn",
    ],
    "get_system_broadcast_stats": [
        "Thống kê broadcast thông báo hệ thống",
        "Hiệu quả gửi broadcast toàn hệ thống ra sao?",
    ],
    "get_graduation_eligible_students": [
        "Những sinh viên nào đủ điều kiện tốt nghiệp?",
        "Danh sách sinh viên đạt điều kiện ra trường",
    ],
    "get_lecturers_teaching_today": [
        "Hôm nay có những giảng viên nào đang dạy?",
        "Danh sách giảng viên đứng lớp hôm nay",
    ],
    "get_student_academic_timeline": [
        "Lộ trình học tập của sinh viên này",
        "Tiến trình học tập của sinh viên hiện tại",
    ],
    "get_rescheduled_slots": [
        "Các slot nào đã được đổi lịch?",
        "Danh sách buổi học đã reschedule",
    ],
    "get_semester_countdown": [
        "Còn bao nhiêu ngày nữa đến mốc học kỳ?",
        "Đếm ngược học kỳ hiện tại",
    ],
    "get_slot_time_info": [
        "Khung giờ của các slot là gì?",
        "Slot 1 bắt đầu và kết thúc lúc nào?",
    ],
}

NAV_LABEL_OVERRIDES: Dict[str, str] = {
    "alerts": "cảnh báo hệ thống",
    "logs": "nhật ký hệ thống",
    "results": "kết quả học tập",
    "wifi aps": "điểm truy cập wifi",
    "attendance config": "cấu hình điểm danh",
    "majors": "quản lý ngành",
    "specializations": "quản lý chuyên ngành",
    "sub specializations": "quản lý chuyên ngành hẹp",
    "exam grades": "điểm thi",
    "grades": "quản lý điểm",
    "resit grades": "điểm thi lại",
    "profile": "hồ sơ cá nhân",
    "classes": "quản lý lớp",
    "schedule requests": "quản lý yêu cầu đổi lịch",
    "semesters": "quản lý học kỳ",
    "timetable": "thời khóa biểu",
    "teaching classes": "lớp đang giảng dạy",
    "inactive users": "người dùng bị khóa",
}


def allowed_roles(tool_name: str) -> List[str]:
    return [role for role in ROLE_ORDER if POLICIES[Role(role)].can_use(tool_name)]


def normalize_field_group(fields: Sequence[str], strict: bool) -> List[Tuple[str, List[str]]]:
    if not fields:
        return [("Không cần key", [])]
    if strict:
        return [("Theo tất cả trường bắt buộc", list(fields))]
    groups: List[Tuple[str, List[str]]] = []
    seen: set[str] = set()
    for field in fields:
        if field not in seen:
            seen.add(field)
            groups.append((f"Theo `{field}`", [field]))
    return groups


def field_label(field: str) -> str:
    return FIELD_META.get(field, {}).get("label", field.replace("_", " ").title())


def field_value(field: str, variant: int = 0) -> str:
    values = FIELD_SAMPLES.get(field)
    if values:
        return values[min(variant, len(values) - 1)]
    return field


def join_field_values(fields: Sequence[str], variant: int = 0) -> str:
    values = [field_value(field, variant) for field in fields]
    return ", ".join(values)


def readable_words(tool_name: str) -> str:
    return tool_name.replace("_", " ")


def navigate_examples(tool_name: str) -> List[str]:
    custom = {
        "view_users": ["Mở trang quản lý người dùng", "Đi tới màn hình người dùng"],
        "view_students": ["Mở trang quản lý sinh viên", "Đi tới màn hình sinh viên"],
        "view_lecturers": ["Mở trang quản lý giảng viên", "Đi tới màn hình giảng viên"],
        "view_courses": ["Mở trang quản lý môn học", "Chuyển đến trang môn học"],
        "view_rooms": ["Mở trang quản lý phòng học", "Đi tới màn hình phòng học"],
        "view_schedule": ["Mở màn hình thời khóa biểu", "Đi tới trang lịch học"],
        "view_dashboard": ["Mở dashboard", "Đi tới bảng điều khiển"],
        "view_messages": ["Mở trang tin nhắn", "Đi tới màn hình chat"],
        "view_notifications": ["Mở trang thông báo", "Đi tới màn hình thông báo"],
        "view_assignments": ["Mở trang bài tập", "Đi tới màn hình bài tập"],
    }
    if tool_name in custom:
        return custom[tool_name]
    raw_label = readable_words(tool_name[5:] if tool_name.startswith("view_") else tool_name)
    label = NAV_LABEL_OVERRIDES.get(raw_label, raw_label)
    return [
        f"Mở trang {label}",
        f"Đi tới màn hình {label}",
    ]


def action_examples(tool_name: str, fields: Sequence[str]) -> List[str]:
    if tool_name in TOOL_OVERRIDES:
        override = TOOL_OVERRIDES[tool_name]
        if "all" in override:
            return override["all"]
        if fields:
            joined_key = "+".join(fields)
            if joined_key in override:
                return override[joined_key]
            if fields[0] in override:
                return override[fields[0]]

    if tool_name.startswith("create_"):
        if tool_name == "create_user":
            return [
                "Tạo người dùng mã GV020, tên Nguyễn Văn B, email gv020@fams.edu.vn, role LECTURER",
                "Tạo tài khoản SE180999 cho Trần Minh Khoa, email se180999@fams.edu.vn, role STUDENT",
            ]
        if tool_name == "create_class":
            return [
                "Tạo lớp SE18B05-PRF192 cho môn PRF192, giảng viên GV001, học kỳ SP26",
            ]
        if tool_name == "create_room":
            return [
                "Tạo phòng A312 sức chứa 30",
            ]
        if tool_name == "create_course":
            return [
                "Tạo môn PRF192 tên Programming Fundamentals, 3 tín chỉ",
            ]
        if tool_name == "create_major":
            return [
                "Tạo ngành SE tên Kỹ thuật phần mềm",
            ]
    if tool_name.startswith("update_"):
        values = join_field_values(fields, 0)
        return [f"Cập nhật {readable_words(tool_name[7:])} với {values}"]
    if tool_name.startswith("delete_"):
        values = join_field_values(fields, 0)
        return [f"Xóa {readable_words(tool_name[7:])} với {values}"]
    if tool_name.startswith("approve_"):
        return [f"Phê duyệt {join_field_values(fields, 0)}"]
    if tool_name.startswith("reject_"):
        return [f"Từ chối {join_field_values(fields, 0)}"]
    if tool_name.startswith("assign_"):
        return [f"Gán {join_field_values(fields, 0)}"]
    if tool_name.startswith("add_"):
        return [f"Thêm {join_field_values(fields, 0)}"]
    if tool_name.startswith("remove_"):
        return [f"Xóa {join_field_values(fields, 0)}"]
    if tool_name.startswith("activate_"):
        return [f"Kích hoạt {join_field_values(fields, 0)}"]
    if tool_name.startswith("import_"):
        return [f"Thực hiện {readable_words(tool_name)} cho dữ liệu tương ứng"]
    if tool_name.startswith("export_"):
        return [f"Xuất {readable_words(tool_name[7:])}"]
    values = join_field_values(fields, 0)
    return [f"Thực hiện {readable_words(tool_name)} với {values}"]


def query_examples_by_semantics(tool_name: str, field: str, sample0: str, sample1: str) -> List[str] | None:
    if field == "class_name":
        if "attendance" in tool_name:
            return [f"Điểm danh lớp {sample0} hôm nay", f"Thống kê điểm danh lớp {sample1}"]
        if "grade" in tool_name:
            return [f"Bảng điểm lớp {sample0}", f"Báo cáo điểm lớp {sample1}"]
        if "schedule" in tool_name or "timetable" in tool_name:
            return [f"Thời khóa biểu lớp {sample0} tuần này", f"Lịch lớp {sample1} ngày mai"]
        if "enrollment" in tool_name:
            return [f"Danh sách đăng ký của lớp {sample0}", f"Roster lớp {sample1}"]
        if "student" in tool_name:
            return [f"Sinh viên nào trong lớp {sample0}?", f"Danh sách sinh viên lớp {sample1}"]
        if "room" in tool_name:
            return [f"Phòng phù hợp cho lớp {sample0}", f"Lớp {sample1} nên xếp phòng nào?"]
        return [f"Thông tin lớp {sample0}", f"Chi tiết lớp {sample1}"]

    if field == "student_code":
        if "attendance" in tool_name:
            return [f"Điểm danh của {sample0}", f"Báo cáo điểm danh của {sample1}"]
        if "gpa" in tool_name or "academic" in tool_name or "ranking" in tool_name:
            return [f"Tình trạng học tập của {sample0}", f"Xếp hạng của sinh viên {sample1}"]
        return [f"Thông tin sinh viên {sample0}", f"Tra cứu sinh viên {sample1}"]

    if field == "lecturer_code":
        if "schedule" in tool_name:
            return [f"Lịch giảng dạy của {sample0} tuần này", f"Lịch dạy của {sample1} ngày mai"]
        if "workload" in tool_name:
            return [f"Khối lượng giảng dạy của {sample0}", f"Workload của {sample1}"]
        return [f"Thông tin giảng viên {sample0}", f"Tra cứu giảng viên {sample1}"]

    if field == "course_code":
        if "grade component" in tool_name or "components" in tool_name:
            return [f"Cấu phần điểm môn {sample0}", f"Cấu phần điểm môn {sample1}"]
        if "attendance" in tool_name:
            return [f"Tỷ lệ điểm danh môn {sample0}", f"Thống kê điểm danh môn {sample1}"]
        if "grade" in tool_name:
            return [f"Điểm môn {sample0}", f"Báo cáo điểm môn {sample1}"]
        return [f"Thông tin môn {sample0}", f"Tra cứu môn {sample1}"]

    if field == "course_name":
        if "grade component" in tool_name or "components" in tool_name:
            return [f"Thành phần điểm môn {sample0}", f"Cấu phần điểm môn {sample1}"]
        return [f"Thông tin môn {sample0}", f"Tra cứu môn {sample1}"]

    if field == "major_name":
        if "count" in tool_name:
            return [f"Đếm sinh viên ngành {sample0}", f"Có bao nhiêu sinh viên ngành {sample1}?"]
        if "gpa" in tool_name:
            return [f"Thống kê GPA ngành {sample0}", f"GPA trung bình ngành {sample1}"]
        if "student" in tool_name:
            return [f"Danh sách sinh viên ngành {sample0}", f"Sinh viên ngành {sample1}"]
        return [f"Thông tin ngành {sample0}", f"Dữ liệu ngành {sample1}"]

    if field == "major_code":
        if "count" in tool_name:
            return [f"Số lượng sinh viên ngành {sample0}", f"Ngành {sample1} có bao nhiêu sinh viên?"]
        if "student" in tool_name:
            return [f"Danh sách sinh viên ngành {sample0}", f"Sinh viên thuộc ngành {sample1}"]
        return [f"Thông tin ngành {sample0}", f"Dữ liệu ngành {sample1}"]

    if field == "room_name":
        if "usage" in tool_name:
            return [f"Lịch sử sử dụng phòng {sample0} tuần này", f"Phòng {sample1} được dùng thế nào tuần này?"]
        return [f"Thông tin phòng {sample0}", f"Chi tiết phòng {sample1}"]

    if field == "date":
        if "schedule" in tool_name or "timetable" in tool_name:
            return [f"Lịch tuần này", f"Lịch {sample0}"]
        if "attendance" in tool_name:
            return [f"Điểm danh hôm nay", f"Điểm danh {sample0}"]
        if "room" in tool_name:
            return [f"Phòng trống {sample0}", f"Phòng trống {sample1}"]
        return [f"Dữ liệu {sample0}", f"Dữ liệu {sample1}"]

    if field == "slot_number":
        return [f"Danh sách theo {sample0}", f"Danh sách theo {sample1}"]

    if field == "status":
        return [f"Danh sách trạng thái {sample0}", f"Những bản ghi đang {sample1}"]

    if field == "role":
        return [f"Đếm số người dùng role {sample0}", f"Có bao nhiêu người dùng vai trò {sample1}?"]

    if field == "gpa_threshold":
        return [f"Sinh viên có nguy cơ học vụ dưới {sample0}", f"Danh sách sinh viên GPA dưới {sample1}"]

    if field == "specialization_name":
        return [f"Thông tin chuyên ngành {sample0}", f"Các môn của chuyên ngành {sample1}"]

    if field == "specialization_code":
        return [f"Thông tin chuyên ngành {sample0}", f"Chuyên ngành mã {sample1} có gì?"]

    if field == "sub_specialization_name":
        return [f"Thông tin chuyên ngành hẹp {sample0}", f"Các môn của chuyên ngành hẹp {sample1}"]

    if field == "sub_specialization_code":
        return [f"Thông tin chuyên ngành hẹp {sample0}", f"Chuyên ngành hẹp mã {sample1} có gì?"]

    if field == "expertise":
        return [f"Giảng viên có chuyên môn {sample0}", f"Ai có chuyên môn {sample1}?"]

    if field == "department":
        return [f"Giảng viên bộ môn {sample0}", f"Danh sách giảng viên thuộc {sample1}"]

    if field == "session_id":
        return [f"Điểm danh của session 101", f"Chi tiết session 101"]

    if field == "request_id":
        return [f"Chi tiết yêu cầu đổi lịch số 15", f"Thông tin request 15"]

    if field == "user_code":
        return [f"Lịch sử thông báo của người dùng {sample0}", f"Thông báo đã gửi cho {sample1}"]

    if field == "code":
        return [f"Thông tin người dùng {sample0}", f"Tra cứu tài khoản {sample1}"]

    if field == "semester":
        return [f"Danh sách lớp học kỳ {sample0}", f"Các lớp trong {sample1}"]

    if field == "slot_id":
        return [f"Chi tiết slot 101", f"Thông tin slot 101"]

    if field == "start_time":
        return [f"Tìm slot bắt đầu lúc {sample0}", f"Tìm slot bắt đầu lúc {sample1}"]

    if field == "end_time":
        return [f"Tìm slot kết thúc lúc {sample0}", f"Tìm slot kết thúc lúc {sample1}"]

    if field == "time_start":
        return [f"Tìm dữ liệu từ {sample0}", f"Tìm dữ liệu từ {sample1}"]

    if field == "time_end":
        return [f"Tìm dữ liệu đến {sample0}", f"Tìm dữ liệu đến {sample1}"]

    if field == "start_date":
        return [f"Lịch từ ngày {sample0}", f"Lịch từ ngày {sample1}"]

    if field == "end_date":
        return [f"Lịch đến ngày {sample0}", f"Lịch đến ngày {sample1}"]

    if field == "semester_code":
        if "class" in tool_name:
            return [f"Danh sách lớp học kỳ {sample0}", f"Các lớp trong học kỳ {sample1}"]
        return [f"Tổng quan học kỳ {sample0}", f"Dữ liệu học kỳ {sample1}"]

    if field == "semester_name":
        if "class" in tool_name:
            return [f"Danh sách lớp học kỳ {sample0}", f"Các lớp trong {sample1}"]
        return [f"Tổng quan học kỳ {sample0}", f"Dữ liệu học kỳ {sample1}"]

    return None


def query_examples(tool_name: str, fields: Sequence[str], role: str, strict: bool) -> List[str]:
    if tool_name in TOOL_OVERRIDES:
        override = TOOL_OVERRIDES[tool_name]
        if "__self__" in override:
            return override["__self__"]
        if strict and "all" in override:
            return override["all"]
        if fields:
            joined_key = "+".join(fields)
            if joined_key in override:
                return override[joined_key]
            if fields[0] in override:
                return override[fields[0]]

    if not fields:
        if tool_name in NO_KEY_QUERY_OVERRIDES:
            return NO_KEY_QUERY_OVERRIDES[tool_name]
        if tool_name in {"get_my_notifications", "count_unread_notifications"}:
            return ["Thông báo của tôi", "Tôi còn bao nhiêu thông báo chưa đọc?"]
        if tool_name in {"get_my_schedule_requests"}:
            return ["Các yêu cầu đổi lịch của tôi", "Danh sách request đổi lịch tôi đã gửi"]
        if tool_name in {"get_attendance_report_by_student"}:
            return ["Báo cáo điểm danh của tôi", "Tổng hợp số buổi vắng của tôi"]
        if tool_name in {"get_my_attendance_status"}:
            return ["Tình trạng điểm danh của tôi", "Chuyên cần của tôi hiện tại thế nào?"]
        if tool_name in {"get_active_semester"}:
            return ["Học kỳ hiện tại là gì?", "Đang là học kỳ nào?"]
        if tool_name in {"list_courses"}:
            return ["Danh sách môn học", "Trường có những môn nào?"]
        if tool_name in {"list_semesters"}:
            return ["Danh sách học kỳ", "Các học kỳ hiện có"]
        return [
            f"Cho tôi {readable_words(tool_name)}",
            f"Xem {readable_words(tool_name)}",
        ]

    if strict:
        if tool_name == "get_empty_rooms":
            return [
                "Danh sách phòng học trống slot 2 ngày mai",
                "Phòng nào trống ca 3 hôm nay?",
            ]
        if tool_name.startswith(("create_", "update_", "delete_", "assign_", "add_", "remove_", "approve_", "reject_", "activate_", "import_", "export_")):
            return action_examples(tool_name, fields)
        values = join_field_values(fields, 0)
        alt_values = join_field_values(fields, 1)
        return [
            f"Cho tôi {readable_words(tool_name)} với {values}",
            f"Tra cứu {readable_words(tool_name)} với {alt_values}",
        ]

    field = fields[0]
    sample0 = field_value(field, 0)
    sample1 = field_value(field, 1)

    semantic_examples = query_examples_by_semantics(tool_name, field, sample0, sample1)
    if semantic_examples:
        return semantic_examples

    field_templates = {
        "student_code": [f"Thông tin sinh viên {sample0}", f"Tra cứu sinh viên {sample1}"],
        "lecturer_code": [f"Thông tin giảng viên {sample0}", f"Lịch giảng dạy của {sample0} tuần này"],
        "full_name": [f"Tìm {sample0}", f"Hồ sơ {sample1}"],
        "course_name": [f"Thông tin môn {sample0}", f"Tra cứu môn {sample1}"],
        "semester_code": [f"Danh sách học kỳ {sample0}", f"Tổng quan học kỳ {sample1}"],
        "semester_name": [f"Danh sách học kỳ {sample0}", f"Tổng quan học kỳ {sample1}"],
    }
    if field in field_templates:
        return field_templates[field]

    return [
        f"Tra cứu {readable_words(tool_name)} theo {field_label(field).lower()} {sample0}",
        f"Xem {readable_words(tool_name)} với {field_label(field).lower()} {sample1}",
    ]


def examples_for_group(tool_name: str, tool_type: str, role: str, fields: Sequence[str], strict: bool) -> List[str]:
    if tool_type == "NAVIGATE_ONLY":
        return navigate_examples(tool_name)
    if tool_type == "BACKEND_ACTION":
        return action_examples(tool_name, fields)
    return query_examples(tool_name, fields, role, strict)


def role_tools() -> Dict[str, Dict[str, List[str]]]:
    surfaced_tools, _, backend_tools, nav_tools = get_surfaced_tools()
    data: Dict[str, Dict[str, List[str]]] = {}
    for role in ROLE_ORDER:
        grouped: DefaultDict[str, List[str]] = defaultdict(list)
        for tool in sorted(surfaced_tools):
            if role in allowed_roles(tool):
                tool_type = classify_tool(tool, backend_tools, nav_tools)
                grouped[tool_type].append(tool)
        data[role] = dict(grouped)
    return data


def write_markdown() -> str:
    surfaced_tools, _, backend_tools, nav_tools = get_surfaced_tools()
    roles_map = role_tools()

    lines: List[str] = []
    lines.append("# Chatbot Role Question Catalog")
    lines.append("")
    lines.append("Tài liệu này được generate từ toàn bộ tool surface hiện tại của chatbot.")
    lines.append(f"Phạm vi hiện tại gồm **{len(surfaced_tools)} tool** đã surfaced cho chat, bao gồm `SQL_TEMPLATE`, `BACKEND_ACTION`, và `NAVIGATE_ONLY`.")
    lines.append("Mỗi role được chia theo loại tool. Với mỗi tool, tài liệu liệt kê các trường hợp hỏi theo từng key hoặc theo toàn bộ trường bắt buộc đối với action/query strict.")
    lines.append("")

    for role in ROLE_ORDER:
        lines.append(f"## {ROLE_LABELS[role]}")
        lines.append("")
        total_role_tools = sum(len(roles_map[role].get(tool_type, [])) for tool_type in TYPE_ORDER)
        lines.append(f"Role này hiện có **{total_role_tools} tool** khả dụng.")
        lines.append("")

        for tool_type in TYPE_ORDER:
            tools = roles_map[role].get(tool_type, [])
            if not tools:
                continue
            lines.append(f"### {TYPE_LABELS[tool_type]}")
            lines.append("")

            agent_groups: DefaultDict[str, List[str]] = defaultdict(list)
            for tool in tools:
                agent_groups[get_tool_agent(tool)].append(tool)

            for agent in sorted(agent_groups, key=lambda name: AGENT_LABELS.get(name, name)):
                lines.append(f"#### {AGENT_LABELS.get(agent, agent)}")
                lines.append("")

                for tool_name in sorted(agent_groups[agent]):
                    fields = EXPLICIT_REQUIRED_FIELDS.get(tool_name, [])
                    strict = require_all_required_fields(tool_name)
                    lines.append(f"##### `{tool_name}`")
                    lines.append(f"- Trường bắt buộc: {', '.join(f'`{field}`' for field in fields) if fields else '`Không cần key`'}")
                    lines.append(f"- Kiểu xử lý: `{tool_type}`")
                    groups = normalize_field_group(fields, strict)
                    for label, group_fields in groups:
                        group_key = "+".join(group_fields)
                        if tool_name in TOOL_OVERRIDES and group_key in TOOL_OVERRIDES[tool_name]:
                            examples = TOOL_OVERRIDES[tool_name][group_key]
                        elif tool_name in TOOL_OVERRIDES and label == "Không cần key" and "__self__" in TOOL_OVERRIDES[tool_name]:
                            examples = TOOL_OVERRIDES[tool_name]["__self__"]
                        else:
                            examples = examples_for_group(tool_name, tool_type, role, group_fields, strict)
                        lines.append(f"- {label}")
                        for example in examples:
                            lines.append(f'  - "{example}"')
                    lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    OUTPUT_PATH.write_text(write_markdown(), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
