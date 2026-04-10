from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional, Set, Tuple

from app.services.chat.router.core_tool_inventory import ROLE_CORE_TOOLS
from app.services.chat.router.tool_catalog import get_tool_agent


_STOPWORDS = {
    "ai", "anh", "cho", "co", "cua", "của", "cần", "can", "dang", "đang", "duoc", "được",
    "em", "giup", "giúp", "hay", "hãy", "hien", "hiển", "hiển thị", "hoi", "hỏi", "la",
    "là", "minh", "mình", "mot", "một", "muon", "muốn", "nao", "nào", "ngay", "ngày",
    "nha", "oi", "ơi", "roi", "rồi", "them", "thêm", "toi", "tôi", "tra", "trả", "trong", "xem",
}

_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_SEMESTER_RE = re.compile(r"\b(SP|SU|FA|WI)\d{2}\b", re.IGNORECASE)
_STUDENT_RE = re.compile(r"\b(SE|HE|IA)\d{5,6}\b", re.IGNORECASE)
_LECTURER_RE = re.compile(r"\bGV\d{2,6}\b", re.IGNORECASE)
_COURSE_RE = re.compile(r"\b[A-Z]{3,4}\d{3}\b", re.IGNORECASE)
_ROOM_RE = re.compile(r"\b([A-Z]\d{2,3}|LAB\d{2})\b", re.IGNORECASE)
_CLASS_RE = re.compile(r"\b([A-Z]{2,}\d{2,}[A-Z\d]*_[A-Z0-9]+|[A-Z]{2,}\d{2,}[A-Z\d]*-[A-Z]{2,4}\d{3,4})\b", re.IGNORECASE)
_SLOT_RE = re.compile(r"\b(slot|ca|tiết|tiet)\s*(?:số\s*)?(\d+)\b", re.IGNORECASE)


_TOOL_EXAMPLES: Dict[str, Tuple[str, ...]] = {
    "get_active_semester": ("hoc ky dang hoat dong", "hoc ky hien tai", "active semester"),
    "get_classes_by_semester": ("lop hoc thuoc hoc ky", "cac lop mo trong hoc ky", "danh sach lop hoc ky"),
    "get_class_info": ("thong tin chi tiet lop", "chi tiet lop hoc", "class info"),
    "get_class_schedule": ("lich hoc cua lop", "thoi khoa bieu lop", "class schedule"),
    "get_students_by_class": ("danh sach sinh vien cua lop", "sinh vien trong lop", "students by class"),
    "get_enrollments_by_class": ("danh sach sinh vien cua lop", "sinh vien lop toi day", "enrollments by class"),
    "get_courses_by_name": ("tra cuu thong tin mon", "thong tin mon hoc", "course info"),
    "get_courses_by_spec": ("chuyen nganh co nhung mon nao", "mon hoc cua chuyen nganh", "courses by specialization"),
    "get_courses_by_sub_spec": ("chuyen nganh hep co nhung mon nao", "mon hoc cua chuyen nganh hep", "courses by sub specialization"),
    "get_grade_components_by_course": ("cau phan diem mon", "thanh phan diem mon", "grade components"),
    "get_own_schedule": ("thoi khoa bieu cua toi", "lich hoc cua toi", "lich day cua toi"),
    "get_own_grades": ("bang diem cua toi", "diem cua toi", "gpa cua toi"),
    "get_detail_course_grade": ("chi tiet bang diem mon", "diem mon", "detail course grade"),
    "get_my_notifications": ("thong bao cua toi", "notifications cua toi"),
    "count_unread_notifications": ("thong bao chua doc", "unread notifications"),
    "get_my_attendance_status": ("tinh trang diem danh cua toi", "vang bao nhieu buoi", "attendance status"),
    "get_attendance_report_by_student": ("bao cao diem danh cua ban than", "attendance report"),
    "get_attendance_stats_by_class": ("thong ke diem danh cua lop", "thong ke vang mat lop"),
    "get_attendance_by_slot": ("diem danh cua lop trong ngay", "diem danh theo tung sinh vien", "attendance by slot"),
    "get_attendance_by_slot_number": ("diem danh cua slot trong ngay", "attendance slot number"),
    "get_consecutive_absences": ("vang lien tiep", "consecutive absences"),
    "get_all_rooms_today": ("phong nao dang co the su dung hom nay", "all rooms today", "rooms today"),
    "get_empty_rooms": ("phong nao trong", "empty rooms", "phong trong hom nay"),
    "get_available_slots_for_room": ("phong con trong nhung slot nao", "available slots for room"),
    "get_room_usage_weekly": ("muc do su dung phong", "room usage weekly"),
    "get_slots_by_date": ("ngay nay co nhung slot nao", "slots by date"),
    "get_semester_overview": ("tong quan hoc ky", "semester overview"),
    "get_abnormal_attendance": ("diem danh bat thuong", "abnormal attendance"),
    "get_user_by_code": ("tra cuu thong tin nguoi dung ma", "user by code"),
    "get_student_by_code": ("tra cuu thong tin sinh vien ma", "student by code"),
    "get_other_student_schedule": ("lich hoc cua sinh vien", "student schedule by code"),
    "get_other_lecturer_schedule": ("lich cua giang vien", "lich day giang vien", "lecturer schedule by code"),
    "get_lecturer_workload": ("khoi luong giang day giang vien", "lecturer workload"),
    "get_lecturers_by_expertise": ("giang vien co chuyen mon", "lecturers by expertise"),
    "get_lecturers_by_major": ("giang vien cua nganh", "lecturers by major"),
    "get_specializations_by_major": ("nganh co nhung chuyen nganh nao", "specializations by major"),
    "get_sub_specializations": ("chuyen nganh co nhung chuyen nganh hep nao", "sub specializations"),
    "get_major_id_by_name": ("ma nganh cua", "major id by name"),
    "get_students_by_major": ("danh sach sinh vien nganh", "students by major"),
    "get_students_at_risk": ("sinh vien nguy co hoc vu", "students at risk"),
    "get_student_academic_standing": ("tinh trang hoc tap cua sinh vien", "academic standing"),
    "get_top_students": ("sinh vien co ket qua cao nhat", "top students"),
    "list_notifications": ("toan bo thong bao", "list notifications"),
    "list_majors": ("danh sach nganh hoc", "list majors"),
    "list_semesters": ("danh sach hoc ky", "list semesters"),
    "create_notification": ("tao thong bao moi", "gui thong bao", "create notification"),
    "send_email": ("gui email", "send email"),
    "create_schedule_request": ("tao yeu cau doi lich", "doi lich tu slot sang slot", "schedule request"),
    "update_attendance_manually": ("cap nhat diem danh thu cong", "sua diem danh"),
    "count_users_by_role": ("thong ke so luong nguoi dung theo vai tro", "count users by role"),
    "create_user": ("tao tai khoan nguoi dung", "create user"),
    "update_user": ("cap nhat tai khoan nguoi dung", "update user"),
    "activate_user": ("kich hoat lai tai khoan", "activate user"),
    "excel_query": ("truy van excel", "excel query"),
}


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> Set[str]:
    normalized = _normalize(text)
    return {
        token for token in normalized.split()
        if len(token) >= 2 and token not in _STOPWORDS
    }


def _extract_entities(message: str) -> Dict[str, Any]:
    entities: Dict[str, Any] = {}

    class_match = _CLASS_RE.search(message)
    if class_match:
        entities["class_name"] = class_match.group(1).upper()

    student_match = _STUDENT_RE.search(message)
    if student_match:
        entities["student_code"] = student_match.group(0).upper()
        entities.setdefault("code", student_match.group(0).upper())

    lecturer_match = _LECTURER_RE.search(message)
    if lecturer_match:
        entities["lecturer_code"] = lecturer_match.group(0).upper()
        entities.setdefault("code", lecturer_match.group(0).upper())

    course_match = _COURSE_RE.search(message)
    if course_match:
        entities["course_code"] = course_match.group(0).upper()
        entities.setdefault("course_name", course_match.group(0).upper())

    room_match = _ROOM_RE.search(message)
    if room_match:
        entities["room_name"] = room_match.group(1).upper()

    semester_match = _SEMESTER_RE.search(message)
    if semester_match:
        entities["semester_code"] = semester_match.group(0).upper()

    date_match = _DATE_RE.search(message)
    if date_match:
        entities["date"] = date_match.group(0)
    else:
        lowered = _normalize(message)
        if "hom nay" in lowered or "today" in lowered:
            entities["date"] = "TODAY"
        elif "ngay mai" in lowered or "tomorrow" in lowered:
            entities["date"] = "TOMORROW"
        elif "tuan nay" in lowered or "this week" in lowered:
            entities["date"] = "THIS_WEEK"
        elif "tuan sau" in lowered or "next week" in lowered:
            entities["date"] = "NEXT_WEEK"

    slot_match = _SLOT_RE.search(message)
    if slot_match:
        entities["slot_number"] = slot_match.group(2)

    return entities


class MLIntentClassifier:
    def classify(
        self,
        message: str,
        user_role: str,
        user_code: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[Dict[str, Any]]:
        del user_code, history

        text = str(message or "").strip()
        if not text:
            return None

        allowed_tools = ROLE_CORE_TOOLS.get(user_role, set())
        if not allowed_tools:
            return None

        message_tokens = _tokenize(text)
        if not message_tokens:
            return None

        best_tool: Optional[str] = None
        best_score = 0.0
        normalized_text = _normalize(text)
        entities = _extract_entities(text)

        for tool_name in allowed_tools:
            examples = _TOOL_EXAMPLES.get(tool_name)
            if not examples:
                continue

            tool_score = 0.0
            for example in examples:
                example_tokens = _tokenize(example)
                if not example_tokens:
                    continue
                overlap = len(message_tokens & example_tokens)
                union = len(message_tokens | example_tokens) or 1
                score = overlap / union
                if example in normalized_text:
                    score += 0.28
                tool_score = max(tool_score, score)

            tool_score += self._entity_boost(tool_name, entities, normalized_text)
            if tool_score > best_score:
                best_score = tool_score
                best_tool = tool_name

        if not best_tool:
            return None

        if best_score >= 0.72:
            confidence = "high"
        elif best_score >= 0.5:
            confidence = "medium"
        else:
            return None

        intent = "action" if best_tool.startswith(("create_", "update_", "send_", "activate_")) else "data_query"
        if best_tool == "create_notification" and "lop toi dang giang day" in normalized_text:
            entities.setdefault("target_type", "CLASS")

        return {
            "intent": intent,
            "toolName": best_tool,
            "entities": entities,
            "confidence": confidence,
            "agent": get_tool_agent(best_tool),
        }

    @staticmethod
    def _entity_boost(tool_name: str, entities: Dict[str, Any], normalized_text: str) -> float:
        score = 0.0
        if tool_name in {"get_classes_by_semester", "get_semester_overview"} and entities.get("semester_code"):
            score += 0.35
        if tool_name in {"get_class_info", "get_class_schedule", "get_students_by_class", "get_enrollments_by_class",
                         "get_attendance_stats_by_class", "get_attendance_by_slot", "get_full_grade_sheet"} and entities.get("class_name"):
            score += 0.35
        if tool_name in {"get_available_slots_for_room", "get_empty_rooms", "get_room_usage_weekly"} and entities.get("room_name"):
            score += 0.3
        if tool_name in {"get_available_slots_for_room", "get_empty_rooms", "get_all_rooms_today", "get_slots_by_date"} and entities.get("date"):
            score += 0.2
        if tool_name == "get_attendance_by_slot_number" and entities.get("slot_number") and entities.get("date"):
            score += 0.35
        if tool_name == "count_unread_notifications" and (
            ("notification" in normalized_text or "thong bao" in normalized_text) and "chua doc" in normalized_text
        ):
            score += 0.32
        if tool_name == "create_schedule_request" and "doi lich" in normalized_text and (
            entities.get("slot_number") or (normalized_text.count("slot") >= 2)
        ):
            score += 0.35
        if tool_name in {"get_user_by_code", "activate_user"} and entities.get("code"):
            score += 0.32
        if tool_name in {"get_student_by_code", "get_student_academic_standing", "get_classmates"} and entities.get("student_code"):
            score += 0.32
        if tool_name in {"get_other_lecturer_schedule", "get_lecturer_workload"} and entities.get("lecturer_code"):
            score += 0.32
        if tool_name in {"get_courses_by_name", "get_grade_components_by_course", "get_detail_course_grade"} and (
            entities.get("course_code") or entities.get("course_name")
        ):
            score += 0.28
        if tool_name == "create_notification" and ("thong bao" in normalized_text or "notification" in normalized_text):
            score += 0.15
        return score


ml_intent_classifier = MLIntentClassifier()
