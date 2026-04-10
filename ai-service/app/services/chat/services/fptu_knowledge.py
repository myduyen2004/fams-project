from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set


_KNOWLEDGE_PATH = Path(__file__).resolve().parents[1] / "config" / "fptu-information.json"

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
)

_PHRASE_BRIDGES: Dict[str, Set[str]] = {
    "yeu cau thi": {"he thong thi", "eos", "seb", "huong dan thi", "exam guide"},
    "quy dinh thi": {"he thong thi", "eos", "seb", "huong dan thi", "quy dinh ky luat"},
    "huong dan thi": {"huong dan thi", "exam guide", "eos", "seb"},
    "ho so sinh vien": {"ho so sinh vien", "update profile", "the sinh vien", "giay xac nhan sinh vien"},
    "ky tuc xa": {"ky tuc xa", "dormitory", "ktx"},
    "global program": {"global program", "trao doi quoc te", "study abroad", "visa"},
    "tot nghiep": {"tot nghiep", "chung chi", "capstone", "do an tot nghiep"},
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
    "hoc",
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


@lru_cache(maxsize=1)
def _load_knowledge() -> Dict[str, Any]:
    with _KNOWLEDGE_PATH.open("r", encoding="utf-8") as fp:
        return json.load(fp)


def get_knowledge_path() -> Path:
    return _KNOWLEDGE_PATH


def reload_fptu_knowledge_cache() -> None:
    _load_knowledge.cache_clear()
    _build_documents.cache_clear()
    _knowledge_vocabulary.cache_clear()


@lru_cache(maxsize=1)
def _build_documents() -> List[Dict[str, Any]]:
    knowledge = _load_knowledge()
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

    for pillar_index, pillar in enumerate(knowledge.get("pillars") or [], start=1):
        pillar_title = str(pillar.get("title") or f"Pillar {pillar_index}").strip()
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

    add_doc(["Kết luận"], knowledge.get("conclusion"))
    return documents


@lru_cache(maxsize=1)
def _knowledge_vocabulary() -> Set[str]:
    vocab: Set[str] = set()
    for document in _build_documents():
        vocab.update(document["tokens"])
    return vocab


def is_fptu_knowledge_question(message: str) -> bool:
    normalized = _normalize(message)
    if not normalized:
        return False

    if any(hint in normalized for hint in _DIRECT_HINTS):
        return True

    query_tokens = set(_tokenize(message))
    if not query_tokens:
        return False

    vocabulary = _knowledge_vocabulary()
    overlap = query_tokens & vocabulary
    return len(overlap) >= 2 or any(token in vocabulary for token in query_tokens if len(token) >= 5)


def is_static_fptu_knowledge_question(message: str) -> bool:
    # Với nguồn handbook tĩnh, mọi câu hỏi có câu trả lời trong file đều được xem là
    # truy vấn tri thức chung; phần dữ liệu cá nhân thật vẫn sẽ không match context.
    return is_fptu_knowledge_question(message)


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


def get_relevant_fptu_context(message: str, max_sections: int = 3) -> str:
    if not is_fptu_knowledge_question(message):
        return "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"

    normalized = _normalize(message)
    query_tokens = set(_tokenize(message))
    if not query_tokens and not any(hint in normalized for hint in _DIRECT_HINTS):
        return "[KHÔNG CÓ TRI THỨC FPTU PHÙ HỢP]"

    scored_documents: List[tuple[int, Dict[str, Any]]] = []
    for document in _build_documents():
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
