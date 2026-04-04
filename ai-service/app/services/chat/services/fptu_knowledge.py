from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Tuple


_KNOWLEDGE_PATH = Path(__file__).resolve().parents[1] / "config" / "fptu-information.json"

_SECTION_KEYWORDS: Dict[str, List[str]] = {
    "school_profile": [
        "fptu", "fpt", "truong", "dai hoc", "ten truong", "viet tat", "slogan",
        "su menh", "tam nhin", "triet ly", "hieu truong", "chu tich", "rector", "chairman",
    ],
    "academic_system": [
        "tin chi", "gpa", "thang diem", "hoc ky", "semesters", "grading", "credit",
    ],
    "core_values": [
        "gia tri cot loi", "toan cau", "khoi nghiep", "cong nghe", "pillar",
    ],
    "academic_structure": [
        "nganh", "chuyen nganh", "major", "business", "marketing", "ai", "khoa hoc du lieu",
        "luat", "ngon ngu", "truyen thong",
    ],
    "training_model": [
        "ojt", "hoc ky doanh nghiep", "ngoai ngu thu 2", "study abroad", "vovinam",
        "clb", "clubs", "ai lab", "iot lab", "ic design lab", "embedded lab",
    ],
    "learning_environment": [
        "lms", "fap", "coursera", "edx", "teams", "workspace", "email",
    ],
    "exam_system": [
        "thi", "exam", "eos", "seb", "safe exam browser", "laptop", "progress test",
        "final exam", "practical exam",
    ],
    "study_rules": [
        "chuyen can", "80", "cam thi", "nop tre", "dao van", "hoc lai", "retake",
        "attendance", "assignment", "plagiarism",
    ],
    "disciplinary_actions": [
        "ky luat", "canh cao", "dinh chi", "gian lan", "nhac nho",
    ],
    "student_guidelines": [
        "truoc khi thi", "trong khi thi", "sau khi thi", "the sinh vien", "phuc khao",
    ],
    "campuses": [
        "co so", "campus", "hoa lac", "quan 9", "da nang", "can tho", "quy nhon", "ha noi", "tp hcm",
    ],
    "rankings_and_accreditations": [
        "xep hang", "ranking", "accreditation", "acbsp", "aqas", "aun", "iso",
    ],
    "career_outcomes": [
        "viec lam", "employment", "98", "co hoi quoc te", "doanh nghiep",
    ],
    "admissions": [
        "tuyen sinh", "schoolrank", "ielts", "hoc bong", "tuyen thang",
    ],
    "tuition": [
        "hoc phi", "tuition", "vnđ", "vnd",
    ],
    "important_notes": [
        "luu y", "ghi chu", "tu hoc", "email sinh vien",
    ],
    "highlights": [
        "diem noi bat", "highlight", "moi truong", "cuu sinh vien",
    ],
}

_DIRECT_HINTS = {
    "hieu truong": "school_profile",
    "chu tich": "school_profile",
    "ojt": "training_model",
    "hoc ky doanh nghiep": "training_model",
    "seb": "exam_system",
    "safe exam browser": "exam_system",
    "schoolrank": "admissions",
    "hoc phi": "tuition",
    "fap": "learning_environment",
    "lms": "learning_environment",
}


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


@lru_cache(maxsize=1)
def _load_knowledge() -> Dict[str, Any]:
    with _KNOWLEDGE_PATH.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def is_fptu_knowledge_question(message: str) -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False

    if "fptu" in normalized or "fpt university" in normalized or "truong dai hoc fpt" in normalized:
        return True

    if any(phrase in normalized for phrase in _DIRECT_HINTS):
        return True

    hit_count = 0
    for keywords in _SECTION_KEYWORDS.values():
        if any(keyword in normalized for keyword in keywords):
            hit_count += 1
            if hit_count >= 1:
                return True
    return False


def get_relevant_fptu_context(message: str, max_sections: int = 3) -> str:
    if not is_fptu_knowledge_question(message):
        return "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"

    knowledge = _load_knowledge()
    normalized = _normalize(message)
    scored_sections: List[Tuple[int, str]] = []

    for section, keywords in _SECTION_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in normalized)
        if section in knowledge and score > 0:
            scored_sections.append((score, section))

    for hint, section in _DIRECT_HINTS.items():
        if hint in normalized and section in knowledge:
            scored_sections.append((10, section))

    if not scored_sections:
        scored_sections.append((1, "school_profile"))

    seen = set()
    ordered_sections: List[str] = []
    for _, section in sorted(scored_sections, key=lambda item: (-item[0], item[1])):
        if section not in seen:
            seen.add(section)
            ordered_sections.append(section)
        if len(ordered_sections) >= max_sections:
            break

    blocks = []
    for section in ordered_sections:
        blocks.append(f"[{section}]\n" + json.dumps(knowledge[section], ensure_ascii=False, indent=2))
    return "\n\n".join(blocks) if blocks else "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"
