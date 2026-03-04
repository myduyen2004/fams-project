"""
router/light_router.py
Stage 1 – LLM intent & entity extraction.

Tool registry được đồng bộ với permissions.py:
  • _ALL_TOOLS chứa toàn bộ tool chatbot hỗ trợ
  • _ROLE_TOOLS build danh sách tool được phép theo role để inject vào prompt
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from loguru import logger

from services.llm_client import llm_client

# ── DB Schema ─────────────────────────────────────────────────────────────────
_DB_SCHEMA = """
DATABASE TABLES (FAMS):
- users: id, full_name, code, role (STUDENT|LECTURER|ACADEMIC_STAFF|ADMIN), status (ACTIVE|INACTIVE)
- student_profiles: user_id→users, gpa, major_id→majors, specialization_id, sub_specialization_id
- lecturer_profiles: user_id→users, expertise, department
- academic_staff_profiles: user_id→users, bio, major_id
- majors: id, code, name, status
- specializations: id, code, name, major_id→majors, status
- sub_specializations: id, code, name, specialization_id→specializations
- specialization_courses: specialization_id, course_id, semester
- sub_specialization_courses: sub_specialization_id, course_id
- courses: id, code, name, credits, description, status
- grade_components: id, course_id, name, type, weight
- semesters: id, code, name, start_date, end_date, status
- class_sections: class_name(PK), course_id, lecturer_id, semester_id
- enrollments: id, student_id, class_name
- timetable_slots: id, class_name, date, slot_number, room_id, slot_type_id, status
- slot_types: id, start_time, end_time, semester_id, slot_index
- rooms: id, name, capacity, status
- student_grades: id, enrollment_id, grade_component_id, score, attempt
- attendance_sessions: id, class_name, date, start_time, end_time, lecturer_id, room_id, status
- attendance_records: id, session_id, student_id, status (PRESENT|ABSENT|LATE), method
- schedule_requests: id, requester_id, original_slot_id, target_slot_id, reason, status, created_at
- notifications: id, title, content, type, priority, sender_id, target_type, sent_at, status
- notification_recipients: id, notification_id, recipient_id, is_read, read_at
"""

# ── Tool Registry (toàn bộ chatbot hỗ trợ) ───────────────────────────────────
_ALL_TOOLS: Dict[str, str] = {

    # ── Profile ─────────────────────────────────────────────────────────────
    "view_profile":     "Mở trang thông tin cá nhân của tôi. (UC-03)",
    "update_profile":   "Điều hướng đến trang chỉnh sửa profile. (UC-04)",

    # ── User Management – chỉ ADMIN (UC-08~12) ──────────────────────────────
    "view_users":           "Mở trang quản trị toàn bộ người dùng.",
    "view_inactive_users":  "Xem danh sách tài khoản đang bị vô hiệu hóa.",
    "get_user_by_code":     "Tìm thông tin user theo mã số. Cần: code.",
    "search_user_by_name":  "Tìm kiếm người dùng theo tên. Cần: full_name.",
    "count_users_by_role":  "Thống kê số lượng user theo từng role.",
    "create_user":          "Tạo tài khoản mới (SV/GV/Staff). Cần: full_name, code, email, role, dob (YYYY-MM-DD).",
    "update_user":          "Cập nhật thông tin user. Cần: code và các trường cần sửa.",
    "delete_user":          "Xóa / vô hiệu hóa tài khoản. Cần: code.",
    "activate_user":        "Kích hoạt lại tài khoản bị vô hiệu hóa. Cần: code.",

    # ── Notifications (UC-14~15) ─────────────────────────────────────────────
    "view_notifications":       "Mở trang quản lý thông báo hệ thống. (Navigate)",
    "list_notifications":       "Xem toàn bộ thông báo đã gửi trong hệ thống.",
    "get_my_notifications":     "Xem thông báo được gửi đến tôi.",
    "count_unread_notifications":"Đếm số thông báo chưa đọc.",
    "create_notification":      "Tạo thông báo mới. Cần: title, content, target_type (ALL|STUDENT|LECTURER|USER).",
    "send_email":               "Gửi email trực tiếp. Cần: recipient_email hoặc code, subject, content.",

    # ── Students (UC-19~22) ──────────────────────────────────────────────────
    "view_students":            "Mở trang danh sách sinh viên. (Navigate)",
    "get_student_by_code":      "Tìm sinh viên theo mã số hoặc tên. Cần: code hoặc full_name.",
    "get_students_by_major":    "Danh sách SV theo ngành học. Cần: major_name.",
    "get_students_by_class":    "Danh sách SV trong lớp cụ thể. Cần: class_name.",
    "get_students_without_class": "SV chưa được xếp vào lớp nào.",
    "get_top_students":         "Top 10 sinh viên có GPA cao nhất toàn hệ thống.",
    "count_students_by_major":  "Thống kê số lượng SV theo từng ngành. Cần: major_name.",
    "get_students_at_risk":     "SV có GPA thấp hoặc tỉ lệ vắng cao, có nguy cơ học lại.",
    "update_student_info":      "Cập nhật thông tin sinh viên. Cần: code và trường cần sửa.",

    # ── Lecturers (UC-23~26) ─────────────────────────────────────────────────
    "view_lecturers":           "Mở trang danh sách giảng viên. (Navigate)",
    "get_lecturer_by_code":     "Tìm giảng viên theo mã số hoặc tên. Cần: code hoặc full_name.",
    "get_lecturers_by_major":   "Danh sách GV theo ngành / bộ môn. Cần: major_name.",
    "get_lecturers_by_expertise": "Tìm GV theo lĩnh vực chuyên môn. Cần: expertise.",
    "update_lecturer_info":     "Cập nhật thông tin giảng viên. Cần: code và trường cần sửa.",

    # ── Classrooms (UC-27~28) ────────────────────────────────────────────────
    "view_rooms":           "Mở trang danh sách phòng học.",
    "get_empty_rooms":      "Phòng học đang trống. Có thể kèm: date (YYYY-MM-DD), slot_number (1-6). Mặc định là hôm nay, slot 1.",
    "get_room_info":        "Thông tin chi tiết phòng học (sức chứa, trạng thái). Cần: room_name.",
    "count_rooms_by_status":"Thống kê số phòng theo trạng thái (ACTIVE/INACTIVE).",
    "create_room":          "Tạo phòng học mới. Cần: name, capacity.",
    "update_room":          "Cập nhật thông tin phòng học. Cần: room_name và capacity hoặc status.",
    "delete_room":          "Xóa phòng học. Cần: room_name.",

    # ── Majors (UC-29~31) ────────────────────────────────────────────────────
    "view_majors":      "Mở trang danh sách ngành học. (Navigate)",
    "list_majors":      "Lấy danh sách tất cả ngành học trong chat.",
    "create_major":     "Tạo ngành học mới. Cần: code, name.",
    "update_major":     "Cập nhật ngành học. Cần: code (mã cũ) và name (tên mới) hoặc status.",
    "delete_major":     "Xóa ngành học. Cần: code hoặc name.",

    # ── Specializations (UC-32~37) ───────────────────────────────────────────
    "view_specializations":         "Mở trang chuyên ngành của một ngành cụ thể. Cần: major_name.",
    "get_specializations_by_major": "Danh sách chuyên ngành thuộc ngành học. Cần: major_name.",
    "create_specialization":        "Tạo chuyên ngành mới. Cần: major_code, spec_code, spec_name.",
    "update_specialization":        "Cập nhật chuyên ngành. Cần: spec_code (mã cũ) và spec_name (tên mới) hoặc status.",
    "delete_specialization":        "Xóa chuyên ngành. Cần: spec_code hoặc spec_name.",
    "view_sub_specializations":     "Mở trang chuyên ngành hẹp của một chuyên ngành. Cần: specialization_name.",
    "get_sub_specializations":      "Danh sách chuyên ngành hẹp. Cần: specialization_name.",
    "create_sub_specialization":    "Tạo chuyên ngành hẹp. Cần: specialization_code, sub_code, sub_name.",
    "update_sub_specialization":    "Cập nhật chuyên ngành hẹp.",
    "delete_sub_specialization":    "Xóa chuyên ngành hẹp.",
    "assign_course_to_specialization":     "Gán môn học vào chuyên ngành. Cần: course_code, spec_code, semester.",
    "assign_course_to_sub_specialization": "Gán môn học vào chuyên ngành hẹp. Cần: course_code, sub_spec_code.",
    "get_courses_by_spec":          "Danh sách môn học thuộc chuyên ngành. Cần: specialization_name.",
    "get_courses_by_sub_spec":      "Danh sách môn học thuộc chuyên ngành hẹp. Cần: sub_specialization_name.",

    # ── Courses (UC-38~41) ───────────────────────────────────────────────────
    "view_courses":                 "Mở trang danh sách môn học. (Navigate)",
    "list_courses":                 "Lấy toàn bộ danh sách môn học trong chat.",
    "get_courses_by_name":          "Tìm kiếm môn học theo tên hoặc mã. Cần: course_name hoặc course_code.",
    "get_grade_components_by_course": "Xem cấu trúc điểm môn (Progress/Midterm/Final). Cần: course_name hoặc course_code.",
    "create_course":                "Tạo môn học mới. Cần: code, name, credits.",
    "update_course":                "Cập nhật thông tin môn học. Cần: course_code và name hoặc credits hoặc status.",
    "delete_course":                "Xóa môn học. Cần: course_code.",

    # ── Semesters (UC-42~43) ─────────────────────────────────────────────────
    "view_semesters":   "Mở trang quản lý học kỳ. (Navigate)",
    "list_semesters":   "Thông tin danh sách học kỳ (tên, ngày bắt đầu/kết thúc, trạng thái).",
    "get_active_semester": "Học kỳ đang diễn ra hiện tại.",
    "create_semester":  "Tạo học kỳ mới. Cần: code, name, start_date, end_date (YYYY-MM-DD).",
    "update_semester":  "Cập nhật học kỳ. Cần: semester_code và name, start_date, end_date hoặc status.",
    "delete_semester":  "Xóa học kỳ. Cần: semester_code.",

    # ── Classes & Enrollment (UC-44~47) ──────────────────────────────────────
    "view_classes":             "Mở trang danh sách lớp học.",
    "get_classes_by_semester":  "Danh sách lớp học theo học kỳ. Cần: semester_code hoặc semester_name.",
    "get_class_info":           "Thông tin chi tiết một lớp (GV, môn, SV). Cần: class_name.",
    "create_class":             "Tạo lớp học mới. Cần: class_name, course_code, lecturer_code, semester_code.",
    "update_class":             "Cập nhật lớp học. Cần: class_name.",
    "delete_class":             "Xóa lớp học. Cần: class_name.",
    "get_enrollments_by_class": "Danh sách SV đã enrolled trong lớp. Cần: class_name.",
    "add_student_to_class":     "Thêm SV vào lớp. Cần: student_code, class_name.",
    "remove_student_from_class":"Xóa SV khỏi lớp. Cần: student_code, class_name.",

    # ── Timetable (UC-48~52) ─────────────────────────────────────────────────
    "view_timetable":           "Mở trang thời khóa biểu tổng.",
    "get_class_schedule":       "Xem lịch học/dạy của một Lớp cụ thể (cần tên lớp). Cần: class_name.",
    "get_own_schedule":         "Xem lịch học/dạy cá nhân của TÔI. Có thể lọc theo date (YYYY-MM-DD), class_name.",
    "view_schedule":            "Mở trang xem lịch học/dạy cá nhân.",
    "view_teaching_classes":    "Mở trang danh sách lớp giảng viên đang dạy (chỉ GV).",
    "get_other_lecturer_schedule": "Xem lịch dạy của GV khác. Cần: full_name hoặc code.",
    "get_other_student_schedule":  "Xem lịch học của SV khác. Cần: full_name hoặc code.",
    "get_schedule_conflicts":   "Kiểm tra xung đột lịch dạy/học.",
    "export_timetable":         "Xuất thời khóa biểu ra file Excel. Cần: semester_code.",
    "publish_timetable":        "Kích hoạt hiển thị TKB cho SV và GV. Cần: semester_code.",
    "update_slot_manually":     "Điều hướng chỉnh sửa slot timetable thủ công.",

    # ── Schedule Requests (UC-53~57) ─────────────────────────────────────────
    "view_schedule_requests":       "Mở trang danh sách yêu cầu đổi lịch.",
    "get_schedule_request_list":    "Danh sách tất cả request đổi lịch (Academic Staff xem).",
    "get_schedule_request_detail":  "Chi tiết một yêu cầu đổi lịch. Cần: request_id.",
    "get_my_schedule_requests":     "Lịch sử request đổi lịch của chính tôi (GV).",
    "create_schedule_request":      "Tạo yêu cầu đổi hoặc hoán đổi slot dạy. Cần: original_slot_id, reason.",
    "approve_schedule_request":     "Duyệt yêu cầu đổi lịch. Cần: request_id.",
    "reject_schedule_request":      "Từ chối yêu cầu đổi lịch. Cần: request_id, reason.",

    # ── Attendance (UC-62, 65~69) ────────────────────────────────────────────
    "get_attendance_by_slot":           "Xem danh sách điểm danh của một slot cụ thể. Cần: class_name, date.",
    "get_attendance_stats_by_class":    "Thống kê điểm danh (vắng/có mặt/trễ) theo lớp. Cần: class_name.",
    "get_attendance_rate_by_course":    "Tỉ lệ điểm danh tổng hợp theo môn. Cần: course_code hoặc class_name.",
    "get_abnormal_attendance":          "Xem các bản ghi điểm danh bất thường (quét nhanh, sai vị trí).",
    "update_attendance_manually":       "Chỉnh sửa điểm danh thủ công. Cần: student_code, session_id, status.",
    "export_attendance_stats":          "Xuất thống kê điểm danh ra file Excel. Cần: class_name.",
    "get_my_attendance_status":         "Xem trạng thái điểm danh của tôi trong slot vừa rồi (SV).",
    "get_attendance_report_by_student": "Báo cáo % điểm danh theo từng môn của SV. Cần: student_code (nếu Staff/GV).",
    "get_attendance_trends":            "Phân tích xu hướng vắng mặt của lớp (theo thứ/slot). Cần: class_name.",
    "get_grade_distribution":           "Xem phổ điểm (tỷ lệ giỏi/khá/trung bình) của lớp. Cần: class_name.",
    "get_class_health_check":           "Báo cáo tổng quát tình trạng 'sức khỏe' của lớp (sĩ số, tỷ lệ vắng, điểm TB, SV nguy cơ). Cần: class_name.",
    "get_student_ranking_in_class":     "Xếp hạng sinh viên trong một lớp dựa trên kết quả học tập. Cần: class_name.",

    # ── Grades (UC-76~81) ────────────────────────────────────────────────────
    "view_grades":                  "Mở trang bảng điểm.",
    "get_own_grades":               "Xem điểm tổng kết cá nhân của tôi (SV).",
    "get_detail_course_grade":      "Xem điểm chi tiết từng thành phần của một môn (SV). Cần: course_code.",
    "get_grade_report_by_class":    "Bản điểm toàn lớp (GV xem). Cần: class_name.",
    "get_grade_report_by_course":   "Phân phối điểm theo môn học (Staff xem). Cần: course_code.",
    "get_gpa_stats_by_major":       "Thống kê GPA trung bình theo ngành học.",
    "get_top_students":             "Top 10 SV có GPA cao nhất.",
    "get_students_at_risk":         "SV có GPA thấp hoặc vắng nhiều, nguy cơ học lại (kèm lý do cụ thể).",
    "import_component_grades":      "Điều hướng trang import điểm thành phần (GV). (UC-76)",
    "import_final_grades":          "Điều hướng trang import điểm thi cuối kỳ (Staff). (UC-78)",

    "view_dashboard":           "Mở trang Dashboard (Bảng điều khiển).",
    "view_logs":                "Mở trang Nhật ký hệ thống (System Logs).",
    "view_alerts":              "Mở trang Cảnh báo hệ thống (Alerts).",
    "view_wifi_aps":            "Mở trang Quản lý WiFi/AP.",
    "view_exam_grades":         "Mở trang Quản lý điểm thi.",
    "view_resit_grades":        "Mở trang Quản lý điểm thi lại.",
    "view_assignments":         "Mở trang danh sách Bài tập.",
    "view_messages":            "Mở trang Tin nhắn/Chat.",
    "view_attendance_config":   "Mở trang Cấu hình điểm danh.",
    # ── Excel & AI ────────────────────────────────────────────────────────────
    "excel_query":  "Phân tích / trả lời câu hỏi về file Excel đã tải lên. KHÔNG dùng DB.",
    "export_excel": "Xuất dữ liệu hiện tại ra file Excel để tải về.",
    "dynamic_sql":  "Query tùy biến do LLM sinh ra khi không có tool phù hợp (chỉ SELECT).",
}

# ── Role → Tool mapping (dùng để build prompt) ───────────────────────────────
_ROLE_TOOLS: Dict[str, Set[str]] = {
    "ADMIN": {
        "view_profile", "update_profile",
        "view_users", "view_inactive_users", "get_user_by_code",
        "search_user_by_name", "count_users_by_role",
        "create_user", "update_user", "delete_user", "activate_user",
        "view_notifications", "list_notifications", "get_my_notifications",
        "count_unread_notifications", "create_notification", "send_email",
        "view_dashboard", "view_logs", "view_alerts",
        "excel_query", "export_excel", "dynamic_sql",
    },
    "ACADEMIC_STAFF": {
        # Profile
        "view_profile", "update_profile",
        # Students
        "view_students", "get_student_by_code",
        "search_user_by_name", "get_students_by_major", "get_students_by_class",
        "get_students_without_class", "get_top_students", "count_students_by_major",
        "get_students_at_risk", "update_student_info",
        # Lecturers
        "view_lecturers", "get_lecturer_by_code",
        "get_lecturers_by_major", "get_lecturers_by_expertise", "update_lecturer_info",
        # Rooms
        "view_rooms", "get_empty_rooms", "get_room_info",
        "count_rooms_by_status", "create_room", "update_room", "delete_room",
        # Majors
        "view_majors", "list_majors",
        "create_major", "update_major", "delete_major",
        # Specializations
        "view_specializations", "get_specializations_by_major",
        "create_specialization", "update_specialization", "delete_specialization",
        "view_sub_specializations", "get_sub_specializations",
        "create_sub_specialization", "update_sub_specialization", "delete_sub_specialization",
        "assign_course_to_specialization", "assign_course_to_sub_specialization",
        "get_courses_by_spec", "get_courses_by_sub_spec",
        # Courses
        "view_courses", "list_courses", "get_courses_by_name",
        "get_grade_components_by_course",
        "create_course", "update_course", "delete_course",
        # Semesters
        "view_semesters", "list_semesters", "get_active_semester",
        "create_semester", "update_semester", "delete_semester",
        # Classes
        "view_classes", "get_classes_by_semester", "get_class_info",
        "create_class", "update_class", "delete_class",
        "get_enrollments_by_class", "add_student_to_class", "remove_student_from_class",
        # Timetable
        "view_timetable", "get_class_schedule",
        "get_other_lecturer_schedule", "get_other_student_schedule",
        "get_schedule_conflicts", "export_timetable", "publish_timetable",
        "update_slot_manually",
        # Schedule requests
        "view_schedule_requests", "get_schedule_request_list",
        "get_schedule_request_detail",
        "approve_schedule_request", "reject_schedule_request",
        # Attendance
        "get_attendance_by_slot", "get_attendance_stats_by_class",
        "get_attendance_rate_by_course", "get_abnormal_attendance",
        "export_attendance_stats",
        # Grades
        "view_grades", "get_grade_report_by_course",
        "get_gpa_stats_by_major", "get_top_students", "get_students_at_risk",
        "import_final_grades",
        "view_notifications", "list_notifications", "get_my_notifications",
        "count_unread_notifications", "create_notification", "send_email",
        "view_dashboard", "view_logs", "view_alerts", "view_wifi_aps",
        "view_exam_grades", "view_resit_grades", "view_attendance_config",
        # Excel & AI
        "excel_query", "export_excel", "dynamic_sql",
    },
    "LECTURER": {
        "view_profile", "update_profile",
        # Notification
        "view_notifications", "list_notifications", "get_my_notifications",
        "count_unread_notifications", "create_notification", "send_email",
        # Excel & AI
        "excel_query", "export_excel", "dynamic_sql",
        "get_own_schedule", "view_schedule",
        "view_teaching_classes", "get_class_info", "get_class_schedule",
        "get_other_lecturer_schedule", "get_other_student_schedule",
        "view_schedule_requests", "get_my_schedule_requests",
        "get_schedule_request_detail", "create_schedule_request",
        "get_attendance_by_slot", "get_attendance_stats_by_class",
        "get_attendance_rate_by_course", "update_attendance_manually",
        "export_attendance_stats", "get_attendance_trends", "get_abnormal_attendance",
        "view_grades", "get_grade_report_by_class", "get_grade_distribution",
        "get_class_health_check", "get_student_ranking_in_class",
        "get_grade_components_by_course", "import_component_grades",
        "get_students_by_class", "get_student_by_code",
        "search_user_by_name", "get_students_at_risk",
        "get_courses_by_name", "list_semesters", "get_active_semester",
        "get_classes_by_semester",
        "get_my_notifications", "count_unread_notifications",
        "create_notification", "send_email",
        "view_dashboard", "view_assignments", "view_messages",
        "excel_query", "export_excel",
    },
    "STUDENT": {
        "view_profile", "update_profile",
        "get_own_schedule", "view_schedule", "get_class_schedule",
        "get_my_attendance_status", "get_attendance_report_by_student",
        "view_grades", "get_own_grades", "get_detail_course_grade",
        "get_courses_by_name", "get_grade_components_by_course",
        "list_majors", "get_specializations_by_major",
        "get_sub_specializations", "get_courses_by_spec", "get_courses_by_sub_spec",
        "list_semesters", "get_active_semester",
        "get_my_notifications", "count_unread_notifications",
        "view_dashboard", "view_assignments", "view_messages",
        "excel_query",
    },
}

# ── Role rules injected into prompt ──────────────────────────────────────────
_ROLE_RULES: Dict[str, str] = {
    "ADMIN": (
        "Bạn là ADMIN. Có quyền quản lý tài khoản người dùng và thông báo hệ thống. "
        "KHÔNG có lịch học/dạy cá nhân. "
        "KHÔNG quản lý đào tạo (ngành, môn, lớp) – đó là nhiệm vụ của Academic Staff."
    ),
    "ACADEMIC_STAFF": (
        "Bạn là ACADEMIC STAFF. Toàn quyền quản lý đào tạo (ngành, môn, lớp, TKB, điểm, điểm danh). "
        "KHÔNG có lịch học/dạy cá nhân. "
        "KHÔNG quản lý tài khoản user (create/update/delete user) – đó là nhiệm vụ của Admin."
    ),
    "LECTURER": (
        "Bạn là GIẢNG VIÊN. Bạn là trợ lý toàn năng hỗ trợ quản lý lớp học. "
        "Hãy chủ động phân tích dữ liệu (điểm, điểm danh, xu hướng vắng) để tư vấn. "
        "Bạn có quyền trích xuất danh sách sinh viên nguy cơ/vắng mặt và soạn sẵn email/thông báo. "
        "QUY TẮC THÔNG BÁO: Giảng viên CHỈ được gửi thông báo cho sinh viên trong lớp mình dạy (target_type='USER' kèm mã SV hoặc target_type='STUDENT' kèm class_name). "
        "KHÔNG được gửi thông báo 'ALL'. "
        "Khi trả lời về lịch dạy, hãy tập trung vào đúng ngày/giờ/phòng người dùng hỏi. "
        "KHÔNG được tạo/sửa/xóa ngành, môn, phòng, học kỳ."
    ),
    "STUDENT": (
        "Bạn là SINH VIÊN. Chỉ được xem thông tin cá nhân: lịch học, điểm, điểm danh, thông báo. "
        "Khi sinh viên hỏi 'GPA' hoặc 'điểm trung bình' -> toolName='get_own_grades'. "
        "Khi sinh viên hỏi 'môn học của em/tôi' hoặc 'danh sách môn học kỳ này' -> toolName='get_own_schedule'. "
        "Được xem thông tin học thuật công khai: ngành, chuyên ngành, môn học, học kỳ. "
        "KHÔNG được xem thông tin của SV/GV khác hoặc thực hiện bất kỳ thao tác ghi nào."
    ),
}

# ── Prompt template ───────────────────────────────────────────────────────────
_PROMPT_TEMPLATE = """
Bạn là routing engine của hệ thống FAMS. Phân tích tin nhắn và trả về JSON.

VAI TRÒ: {role} | MÃ SỐ: {code}
QUY TẮC VAI TRÒ: {role_rules}

LỊCH SỬ HỘI THOẠI:
{history}

─────────────────────────────────────────
DANH SÁCH TOOL ĐƯỢC PHÉP (role={role}):
{tools}

DB SCHEMA:
{schema}
─────────────────────────────────────────

HƯỚNG DẪN QUAN TRỌNG:
1. PHÂN QUYỀN: Nếu người dùng yêu cầu tool KHÔNG có trong danh sách trên
   → intent="permission_denied", entities.reason = lý do cụ thể.

2. FILE EXCEL: Nếu người dùng đề cập "file", "excel", "bản vừa tải", "dữ liệu đã tải"
   → toolName="excel_query", KHÔNG dùng DB, KHÔNG sinh dynamicSql.

3. LỊCH CÁ NHÂN:
   - Khi có từ "tôi", "em", "mình" (ví dụ: "lịch của tôi", "tôi dạy gì") -> BẮT BUỘC chọn toolName="get_own_schedule".
   - "Lịch của [tên/mã]" (không phải của tôi) -> toolName="get_other_lecturer_schedule" hoặc "get_other_student_schedule"
   - CHỈ dùng "get_class_schedule" khi người dùng hỏi về một lớp cụ thể mà KHÔNG nhắc đến "tôi/em/mình". Nếu nghi ngờ, hãy chọn get_own_schedule.

4. DYNAMIC SQL: Dùng khi không có tool phù hợp và role được phép dùng dynamic_sql.
   Ví dụ: "GPA của SV SE420591" → dynamicSql="SELECT u.full_name, sp.gpa FROM users u JOIN student_profiles sp ON u.id=sp.user_id WHERE u.code='SE420591'"
   - dynamicSql PHẢI bắt đầu bằng SELECT.
   - Dùng unaccent(col) ILIKE unaccent('%val%') khi tìm chuỗi tiếng Việt.

5. NGỮ CẢNH: Nếu người dùng hỏi dựa trên thực thể câu trước ("bạn đó", "lớp này", "GV trên")
   → Lấy thực thể từ LỊCH SỬ HỘI THOẠI.

6. ACTION PARAMS: Với create_notification / send_email, nếu thiếu email
   → điền code của người nhận vào action.params.recipient_code.

7. VIEW vs GET:
   - view_* : Người dùng muốn "mở trang", "đi đến màn hình", "vào mục"
   - get_*  : Người dùng muốn xem DỮ LIỆU ngay trong chat

8. TRÍCH XUẤT MÃ (CODE) BẮT BUỘC:
   - Khi thực hiện action (tạo/sửa/xóa), BẮT BUỘC có mã (mã snake_case: code, major_code, spec_code, course_code, semester_code, student_code, lecturer_code).
   - Nếu trong tin nhắn ĐÃ CÓ mã số (ví dụ: GV115211, SE1701...), phải GIỮ NGUYÊN HOÀN TOÀN mã đó, không được cắt ngắn hay thay đổi.
   - CHỈ tự suy luận mã ngắn gọn nếu trong tin nhắn KHÔNG có mã (ví dụ: "Lập trình Python" -> code="PYTH").
   - Các tham số PHẢI dùng snake_case (ví dụ: `major_code`, không dùng `majorCode`).

9. TRÍCH XUẤT NGÀY THÁNG ĐỊNH DẠNG ISO:
   - Mọi ngày tháng cụ thể -> entities.date (YYYY-MM-DD).
   - "Học kỳ Spring 2026" -> entities.semester_name="Spring 2026".
   - Với các cụm từ chỉ khoảng thời gian (tuần này, tuần tới, tháng này), hãy GIỮ NGUYÊN text tiếng Việt (ví dụ: entities.date="tuần này") để hệ thống xử lý range.

10. ACTION MAPPING CHI TIẾT:
   - create_specialization: major_code (mã ngành), spec_code (mã chuyên ngành), spec_name (tên).
   - create_course: code, name, credits (default 3).
   - create_major: code, name.
   - create_class: class_name, course_code, lecturer_code, semester_code.

TIN NHẮN: "{message}"

Trả về JSON THUẦN TÚY (không markdown, không giải thích):
{{"intent":"data_query|action|navigation|general_chat|permission_denied|excel_query","toolName":"string|null","action":{{"type":"string","params":{{}}}}|null,"dynamicSql":"string|null","entities":{{}}}}
"""


class LightRouter:
    """Stage 1 – LLM intent router."""

    def route(
        self,
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        tools_str    = self._build_tool_list(user_role)
        history_str  = self._format_history(history)
        prompt = _PROMPT_TEMPLATE.format(
            role       = user_role,
            code       = user_code,
            role_rules = _ROLE_RULES.get(user_role, ""),
            history    = history_str,
            tools      = tools_str,
            schema     = _DB_SCHEMA,
            message    = message,
        )

        try:
            raw    = llm_client.complete(prompt, model)
            logger.info(f"[LightRouter] raw={raw[:200]}")
            result = self._parse_json(raw)
            result = self._post_process(result, user_role)
            logger.info(f"[LightRouter] result={result}")
            return result
        except Exception as exc:
            logger.error(f"[LightRouter] error: {exc}")
            return {"intent": "general_chat", "toolName": None, "entities": {}}

    # ── Helpers ───────────────────────────────────────────────────────────────
    @staticmethod
    def _build_tool_list(role: str) -> str:
        allowed = _ROLE_TOOLS.get(role, set())
        lines = []
        for name, desc in _ALL_TOOLS.items():
            if name in allowed:
                lines.append(f"- {name}: {desc}")
        return "\n".join(lines)

    @staticmethod
    def _format_history(history: Optional[List[Dict[str, str]]]) -> str:
        if not history:
            return "(không có)"
        parts = []
        for m in history:
            role = "Người dùng" if m.get("role", "").upper() == "USER" else "Trợ lý"
            parts.append(f"{role}: {m['content']}")
        return "\n".join(parts[-10:])  # Giới hạn 10 turn gần nhất

    @staticmethod
    def _parse_json(text: str) -> Dict[str, Any]:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ValueError("No JSON in LLM response")
        return json.loads(m.group())

    @staticmethod
    def _post_process(result: Dict[str, Any], user_role: str) -> Dict[str, Any]:
        """Auto-inject recipient code and force action intent for backend tools."""
        tool_name = (result.get("toolName") or "").strip()
        
        # Tools that must ALWAYS be treated as actions
        backend_action_tools = {
            "create_notification", "send_email", "create_user", "update_user", "delete_user",
            "create_course", "update_course", "create_major", "update_major",
            "create_specialization", "update_specialization", "create_room", "create_semester",
            "create_sub_specialization", "create_class", "add_student_to_class", "remove_student_from_class"
        }
        
        action = result.get("action")
        if tool_name in backend_action_tools:
            result["intent"] = "action"
            logger.info(f"[LightRouter] Forced intent='action' for tool='{tool_name}'")
            
            # Ensure action object exists and has the correct specific type
            if not action or not isinstance(action, dict):
                result["action"] = {
                    "type": tool_name.upper(),
                    "params": result.get("entities", {})
                }
                action = result["action"]
            else:
                action["type"] = tool_name.upper()
                if not action.get("params"):
                    action["params"] = result.get("entities", {})

        if not action:
            return result

        action_type = str(action.get("type", "")).upper()
        if action_type in ("SEND_EMAIL", "CREATE_NOTIFICATION"):
            params   = action.setdefault("params", {})
            entities = result.get("entities", {})
            if not params.get("code") and not params.get("recipient_code"):
                found = (entities.get("student_code")
                         or entities.get("lecturer_code")
                         or entities.get("code")
                         or entities.get("recipient_code"))
                if found:
                    key = "recipient_code" if action_type == "CREATE_NOTIFICATION" else "code"
                    params[key] = found
                    logger.info(f"[LightRouter] auto-inject {key}={found}")
        
        # Security for Lecturers: Restrict notification targets
        if tool_name == "create_notification" and user_role == "LECTURER":
            params = action.get("params", {})
            if params.get("target_type") == "ALL":
                logger.warning("[LightRouter] Lecturer tried to send ALL notification - restricting to STUDENT")
                params["target_type"] = "STUDENT"
                
        return result


light_router = LightRouter()