from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set


_CONFIG_DIR = Path(__file__).resolve().parents[1] / "config"

# ── File paths cho từng role ───────────────────────────────────────────────────
_KNOWLEDGE_PATH_STUDENT  = _CONFIG_DIR / "fptu-information-Student.json"
_KNOWLEDGE_PATH_LECTURER = _CONFIG_DIR / "fpt-information-Lecturer.json"

# Legacy path (fallback nếu cần backward-compat với admin endpoint)
_KNOWLEDGE_PATH = _KNOWLEDGE_PATH_STUDENT


_DIRECT_HINTS = (
    "fptu",
    "fpt university",
    "truong dai hoc fpt",
    "eos",
    "seb",
    "safe exam browser",
    "ojt",
    "hoc ky doanh nghiep",
    "global program",
    "study abroad",
    "hoc phi",
    "tuition",
    "hoc bong",
    "ky tuc xa",
    "dormitory",
    "vovinam",
    "coursera",
    "edx",
    "lms",
    "fap",
    "ho so sinh vien",
    "update profile",
    "quy dinh thi",
    "quy dinh ky luat",
    "exam guide",
    "capstone",
    "quy dinh thi",
    "huong dan thi",
    "truoc khi thi",
    "trong khi thi",
    "sau khi thi",
    "viec lam",
    "tot nghiep",
    "chung chi",
    "little uk",
    # Lecturer-specific hints
    "giang vien",
    "lecturer",
    "cham diem",
    "diem danh",
    "lich day",
    "phan cong",
    "rubric",
    "hoi thao",
    "nghien cuu",
    "tu van hoc tap",
    "advisor",
    "ne",
    "not eligible",
    "hotline",
    "lien he",
    "so dien thoai",
    "phone",
    "ban tuyen sinh",
    "phong dich vu sinh vien",
    "phong dao tao",
    "phong cong tac sinh vien",
    "thu vien",
    "y te",
    "tam ly",
    "an ninh",
    "bao ve",
    "spring",
    "summer",
    "fall",
    "hoc ky xuan",
    "hoc ky ha",
    "hoc ky thu",
    "hoc ky",
    "ky hoc",
)

_PHRASE_BRIDGES: Dict[str, Set[str]] = {
    "yeu cau thi": {"he thong thi", "eos", "seb", "huong dan thi", "exam guide"},
    "quy dinh thi": {"he thong thi", "eos", "seb", "huong dan thi", "quy dinh ky luat"},
    "huong dan thi": {"huong dan thi", "exam guide", "eos", "seb"},
    "ho so sinh vien": {"ho so sinh vien", "update profile", "the sinh vien", "giay xac nhan sinh vien"},
    "ky tuc xa": {"ky tuc xa", "dormitory", "ktx"},
    "global program": {"global program", "trao doi quoc te", "study abroad", "visa"},
    "tot nghiep": {"tot nghiep", "chung chi", "capstone", "do an tot nghiep"},
    "giang vien": {"giang vien", "lecturer", "cham diem", "lich day", "diem danh"},
    "nghien cuu": {"nghien cuu", "hoi thao", "bai bao", "phat trien chuyen mon"},
}

_TOPIC_HINTS: Dict[str, Set[str]] = {
    "exam": {
        "thi",
        "exam",
        "eos",
        "seb",
        "safe exam browser",
        "huong dan thi",
        "quy dinh thi",
        "yeu cau thi",
        "truoc khi thi",
        "trong khi thi",
        "sau khi thi",
    },
    "ojt": {
        "ojt",
        "hoc ky doanh nghiep",
        "thuc tap",
        "thuc tap doanh nghiep",
        "dieu kien ojt",
        "bao cao ojt",
    },
    "global": {
        "global program",
        "trao doi quoc te",
        "study abroad",
        "exchange",
        "visa",
        "ngoai ngu",
    },
    "tuition": {
        "hoc phi",
        "tai chinh",
        "dong hoc phi",
        "deadline hoc phi",
        "tuition",
    },
    "dormitory": {
        "ky tuc xa",
        "dormitory",
        "ktx",
    },
    "profile": {
        "ho so sinh vien",
        "profile",
        "thong tin sinh vien",
        "cap nhat ho so",
    },
    "discipline": {
        "ky luat",
        "quy dinh",
        "discipline",
        "vi pham",
    },
    "graduation": {
        "tot nghiep",
        "chung chi",
        "capstone",
        "do an tot nghiep",
    },
    "career": {
        "viec lam",
        "career",
        "job",
        "thuc tap",
        "part time",
    },
    "teaching": {
        "giang day",
        "teaching",
        "lich day",
        "cham diem",
        "diem danh",
        "lms",
    },
    "research": {
        "nghien cuu",
        "research",
        "hoi thao",
        "bai bao",
        "xuat ban",
    },
    "contacts": {
        "hotline",
        "lien he",
        "danh ba",
        "so dien thoai",
        "contact",
        "department",
        "phong ban",
        "ban tuyen sinh",
        "dich vu sinh vien",
    },
}

_STOPWORDS: Set[str] = {
    "a",
    "an",
    "and",
    "ban",
    "bao",
    "biet",
    "cac",
    "can",
    "cho",
    "co",
    "con",
    "cua",
    "cung",
    "da",
    "day",
    "de",
    "den",
    "duoc",
    "em",
    "gi",
    "giup",
    "hay",
    "hien",
    "hoi",
    "how",
    "information",
    "is",
    "la",
    "lam",
    "link",
    "nay",
    "neu",
    "nhung",
    "nhe",
    "noi",
    "o",
    "or",
    "of",
    "roi",
    "sao",
    "sinh",
    "student",
    "su",
    "tai",
    "the",
    "thi",
    "thong",
    "tin",
    "to",
    "toi",
    "tra",
    "trong",
    "tu",
    "ve",
    "viec",
    "voi",
    "what",
    "where",
    "which",
    "xem",
}


def _normalize(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> List[str]:
    normalized = _normalize(text)
    if not normalized:
        return []
    return [token for token in normalized.split() if len(token) >= 3 and token not in _STOPWORDS]


def _collect_strings(value: Any) -> List[str]:
    parts: List[str] = []
    if value is None:
        return parts
    if isinstance(value, str):
        text = value.strip()
        if text:
            parts.append(text)
        return parts
    if isinstance(value, list):
        for item in value:
            parts.extend(_collect_strings(item))
        return parts
    if isinstance(value, dict):
        for key in (
            "title",
            "subtitle",
            "heading",
            "content",
            "description",
            "summary",
            "tip",
            "warning",
            "note",
            "details",
            "items",
            "headers",
            "rows",
            # New keys for extended knowledge
            "contacts",
            "department",
            "handles",
            "how",
            "name",
            "established",
            "mission",
            "achievements",
            "campuses",
            "total_students",
            "academic_calendar",
            "semesters_per_year",
            "semester_names",
            "clubs",
            "questions",
            "terms",
            "q",
            "a",
            "term",
            "definition",
        ):
            if key in value:
                parts.extend(_collect_strings(value[key]))
        return parts
    return parts


def _join_parts(parts: Iterable[str]) -> str:
    seen: Set[str] = set()
    ordered: List[str] = []
    for raw in parts:
        text = raw.strip()
        if not text:
            continue
        marker = _normalize(text)
        if not marker or marker in seen:
            continue
        seen.add(marker)
        ordered.append(text)
    return "\n".join(ordered)


# ── Loaders riêng cho từng role ───────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_knowledge_student() -> Dict[str, Any]:
    with _KNOWLEDGE_PATH_STUDENT.open("r", encoding="utf-8") as fp:
        return json.load(fp)


@lru_cache(maxsize=1)
def _load_knowledge_lecturer() -> Dict[str, Any]:
    with _KNOWLEDGE_PATH_LECTURER.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def _load_knowledge_for_role(user_role: str) -> Dict[str, Any]:
    """Trả về knowledge dict phù hợp với role."""
    if user_role.upper() == "LECTURER":
        return _load_knowledge_lecturer()
    # STUDENT, ADMIN, ACADEMIC_STAFF → dùng student handbook
    return _load_knowledge_student()


# Legacy loader (backward-compat với main.py admin endpoint)
@lru_cache(maxsize=1)
def _load_knowledge() -> Dict[str, Any]:
    return _load_knowledge_student()


def get_knowledge_path() -> Path:
    """Legacy: trả về path của student file (dùng cho admin GET/PUT endpoint)."""
    return _KNOWLEDGE_PATH_STUDENT


def get_knowledge_path_for_role(user_role: str) -> Path:
    if user_role.upper() == "LECTURER":
        return _KNOWLEDGE_PATH_LECTURER
    return _KNOWLEDGE_PATH_STUDENT


def reload_fptu_knowledge_cache() -> None:
    _load_knowledge.cache_clear()
    _load_knowledge_student.cache_clear()
    _load_knowledge_lecturer.cache_clear()
    _build_documents_student.cache_clear()
    _build_documents_lecturer.cache_clear()
    _knowledge_vocabulary_student.cache_clear()
    _knowledge_vocabulary_lecturer.cache_clear()


# ── Document builders riêng cho từng role ────────────────────────────────────

def _build_documents_from(knowledge: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Build document index từ bất kỳ knowledge dict nào."""
    documents: List[Dict[str, Any]] = []

    def add_doc(path_parts: List[str], payload: Any) -> None:
        title = " / ".join(part for part in path_parts if part)
        content = _join_parts([title, *_collect_strings(payload)])
        normalized = _normalize(content)
        tokens = set(_tokenize(content))
        if not normalized or not tokens:
            return
        documents.append(
            {
                "title": title or "FPTU Information",
                "content": content,
                "normalized": normalized,
                "tokens": tokens,
            }
        )

    add_doc(["Giới thiệu"], knowledge.get("intro"))
    add_doc(["Thông tin chính thức"], knowledge.get("official_school_info"))
    add_doc(["Danh bạ liên hệ"], knowledge.get("quick_contacts"))

    for pillar_index, pillar in enumerate(knowledge.get("pillars") or [], start=1):
        pillar_title = str(pillar.get("name") or pillar.get("title") or f"Pillar {pillar_index}").strip()
        for group in pillar.get("groups") or []:
            group_title = str(group.get("title") or "").strip()
            if not group_title:
                continue

            group_payload = {
                key: value
                for key, value in group.items()
                if key != "subsections"
            }
            add_doc([pillar_title, group_title], group_payload)

            for subsection in group.get("subsections") or []:
                subtitle = str(subsection.get("subtitle") or subsection.get("title") or "").strip()
                if not subtitle:
                    continue
                add_doc([pillar_title, group_title, subtitle], subsection)

    # FAQ
    faq = knowledge.get("faq")
    if faq:
        for q_item in faq.get("questions") or []:
            q_text = str(q_item.get("q") or "").strip()
            a_text = str(q_item.get("a") or "").strip()
            if q_text and a_text:
                add_doc(["FAQ", q_text], {"content": a_text})

    # Glossary
    glossary = knowledge.get("glossary")
    if glossary:
        for term_item in glossary.get("terms") or []:
            term = str(term_item.get("term") or "").strip()
            definition = str(term_item.get("definition") or "").strip()
            if term and definition:
                add_doc(["Thuật ngữ", term], {"content": definition})

    add_doc(["Kết luận"], knowledge.get("conclusion"))
    return documents


@lru_cache(maxsize=1)
def _build_documents_student() -> List[Dict[str, Any]]:
    return _build_documents_from(_load_knowledge_student())


@lru_cache(maxsize=1)
def _build_documents_lecturer() -> List[Dict[str, Any]]:
    return _build_documents_from(_load_knowledge_lecturer())


def _build_documents_for_role(user_role: str) -> List[Dict[str, Any]]:
    if user_role.upper() == "LECTURER":
        return _build_documents_lecturer()
    return _build_documents_student()


# Legacy (backward-compat)
@lru_cache(maxsize=1)
def _build_documents() -> List[Dict[str, Any]]:
    return _build_documents_student()


# ── Vocabulary ─────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _knowledge_vocabulary_student() -> Set[str]:
    vocab: Set[str] = set()
    for document in _build_documents_student():
        vocab.update(document["tokens"])
    return vocab


@lru_cache(maxsize=1)
def _knowledge_vocabulary_lecturer() -> Set[str]:
    vocab: Set[str] = set()
    for document in _build_documents_lecturer():
        vocab.update(document["tokens"])
    return vocab


def _knowledge_vocabulary_for_role(user_role: str) -> Set[str]:
    if user_role.upper() == "LECTURER":
        return _knowledge_vocabulary_lecturer()
    return _knowledge_vocabulary_student()


@lru_cache(maxsize=1)
def _knowledge_vocabulary() -> Set[str]:
    return _knowledge_vocabulary_student()


# ── Public API ─────────────────────────────────────────────────────────────────

def is_fptu_knowledge_question(message: str, user_role: str = "STUDENT") -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False

    if any(hint in normalized for hint in _DIRECT_HINTS):
        return True

    query_tokens = set(_tokenize(message))
    if not query_tokens:
        return False

    vocabulary = _knowledge_vocabulary_for_role(user_role)
    overlap = query_tokens & vocabulary
    return len(overlap) >= 2 or any(token in vocabulary for token in query_tokens if len(token) >= 5)


def is_static_fptu_knowledge_question(message: str, user_role: str = "STUDENT") -> bool:
    return is_fptu_knowledge_question(message, user_role)


def _score_document(normalized_query: str, query_tokens: Set[str], document: Dict[str, Any]) -> int:
    score = 0
    doc_tokens = document["tokens"]
    document_text = document["normalized"]

    overlap = query_tokens & doc_tokens
    score += len(overlap) * 3

    title = _normalize(document["title"])
    for token in query_tokens:
        if token in title:
            score += 4

    for hint in _DIRECT_HINTS:
        if hint in normalized_query and hint in document_text:
            score += 8

    for topic_terms in _TOPIC_HINTS.values():
        if any(term in normalized_query for term in topic_terms) and any(
            term in document_text for term in topic_terms
        ):
            score += 12

    for phrase, bridge_terms in _PHRASE_BRIDGES.items():
        if phrase in normalized_query and any(term in document_text for term in bridge_terms):
            score += 18

    if "quy dinh thi" in normalized_query and any(
        term in document_text for term in {"he thong thi", "huong dan thi", "exam guide", "eos", "seb"}
    ):
        score += 24

    compact_query = normalized_query.replace(" ", "")
    if compact_query and compact_query in document_text.replace(" ", ""):
        score += 12

    for phrase in re.findall(r"[a-z0-9]{4,}(?:\s+[a-z0-9]{4,}){1,4}", normalized_query):
        if phrase in document_text:
            score += min(len(phrase.split()) * 4, 16)

    return score


def get_relevant_fptu_context(message: str, max_sections: int = 3, user_role: str = "STUDENT") -> str:
    """
    Trả về context FPTU phù hợp với câu hỏi và role của người dùng.
    - LECTURER → dùng fpt-information-Lecturer.json
    - STUDENT / ADMIN / ACADEMIC_STAFF → dùng fptu-information-Student.json
    """
    if not is_fptu_knowledge_question(message, user_role):
        return "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"

    normalized = _normalize(message)
    query_tokens = set(_tokenize(message))
    if not query_tokens and not any(hint in normalized for hint in _DIRECT_HINTS):
        return "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"

    documents = _build_documents_for_role(user_role)

    scored_documents: List[tuple[int, Dict[str, Any]]] = []
    for document in documents:
        score = _score_document(normalized, query_tokens, document)
        if score > 0:
            scored_documents.append((score, document))

    if not scored_documents:
        return "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"

    scored_documents.sort(key=lambda item: (-item[0], item[1]["title"]))
    blocks: List[str] = []
    seen_titles: Set[str] = set()
    for score, document in scored_documents:
        title = document["title"]
        if title in seen_titles:
            continue
        seen_titles.add(title)
        blocks.append(f"[{title}] (score={score})\n{document['content']}")
        if len(blocks) >= max_sections:
            break

    return "\n\n".join(blocks) if blocks else "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"
