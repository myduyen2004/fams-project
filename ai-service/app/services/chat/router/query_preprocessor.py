from __future__ import annotations

import difflib
import re
import unicodedata
from typing import Any, Dict, List, Tuple


_PHRASE_REPLACEMENTS: Tuple[Tuple[re.Pattern[str], str, str], ...] = (
    (
        re.compile(r"\b(?:hoc ky doanh nghiep|học kỳ doanh nghiệp|thuc tap doanh nghiep|thực tập doanh nghiệp)\b", re.IGNORECASE),
        "ojt",
        "Chuẩn hóa OJT",
    ),
    (
        re.compile(r"\b(?:safe exam browser|seb browser|safe browser exam)\b", re.IGNORECASE),
        "seb",
        "Chuẩn hóa SEB",
    ),
    (
        re.compile(r"\b(?:truong dai hoc fpt|trường đại học fpt|fpt university)\b", re.IGNORECASE),
        "fptu",
        "Chuẩn hóa FPTU",
    ),
    (
        re.compile(r"\b(?:hoc phi|tuition fee)\b", re.IGNORECASE),
        "học phí",
        "Chuẩn hóa học phí",
    ),
)

_DOMAIN_TOKENS: Tuple[str, ...] = (
    "active", "attendance", "bao", "bieu", "cao", "campus", "can", "class", "course",
    "diem", "dung", "email", "enrollment", "eos", "excel", "giang", "grade", "hoc",
    "hoat", "hom", "info", "ky", "lab", "lich", "lop", "lms", "mai", "major", "mon",
    "nganh", "ngay", "notification", "notifications", "ojt", "phien", "phong", "report",
    "room", "schedule", "seb", "semester", "session", "sinh", "slot", "specialization",
    "spec", "student", "sub", "thoi", "thong", "today", "tomorrow", "tuan", "usage",
    "vien", "week",
)

_JOINED_DOMAIN_TOKENS: Tuple[str, ...] = (
    "hocky", "diemdanh", "thoikhoabieu", "giangvien", "sinhvien", "thongtin",
    "chuyenganh", "hocphi", "thongbao",
)
_PROTECTED_TOKENS = {
    "ban", "banthan", "biet", "cac", "cho", "co", "cua", "gui", "hay", "hien", "hoi",
    "la", "lam", "ma", "minh", "muon", "nhung", "tai", "tai sao", "the", "toi", "tra",
    "tong", "truoc", "xem", "yeu", "cau",
}

_TOKEN_VOCAB = {token: token for token in _DOMAIN_TOKENS}
_JOINED_VOCAB = {
    "hocky": "hoc ky",
    "diemdanh": "diem danh",
    "thoikhoabieu": "thoi khoa bieu",
    "giangvien": "giang vien",
    "sinhvien": "sinh vien",
    "thongtin": "thong tin",
    "chuyenganh": "chuyen nganh",
    "hocphi": "hoc phi",
    "thongbao": "thong bao",
}
_CODE_LIKE_RE = re.compile(r"^[A-Za-z]{1,6}\d{1,8}[A-Za-z0-9-]*$")
_TOKEN_SPLIT_RE = re.compile(r"(\s+|[^\w]+)", re.UNICODE)


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _is_word_token(token: str) -> bool:
    return bool(token) and any(ch.isalpha() for ch in token)


def _correct_joined_token(token: str) -> Tuple[str, Optional[str]]:
    ascii_token = _strip_accents(token).lower()
    if len(ascii_token) < 6 or not ascii_token.isalpha():
        return token, None
    if ascii_token in _JOINED_VOCAB:
        corrected = _JOINED_VOCAB[ascii_token]
        return (corrected, f"{token}→{corrected}") if corrected != token else (token, None)

    candidates = difflib.get_close_matches(ascii_token, _JOINED_DOMAIN_TOKENS, n=1, cutoff=0.82)
    if not candidates:
        return token, None
    best = candidates[0]
    if best[0] != ascii_token[0]:
        return token, None
    corrected = _JOINED_VOCAB.get(best, best)
    return corrected, f"{token}→{corrected}"


def _correct_single_token(token: str) -> Tuple[str, Optional[str]]:
    ascii_token = _strip_accents(token).lower()
    if (
        len(ascii_token) < 4
        or not ascii_token.isalpha()
        or _CODE_LIKE_RE.fullmatch(token)
        or ascii_token in _PROTECTED_TOKENS
    ):
        return token, None
    if ascii_token in _TOKEN_VOCAB:
        return token, None

    candidates = difflib.get_close_matches(ascii_token, tuple(_TOKEN_VOCAB.keys()), n=1, cutoff=0.84)
    if not candidates:
        return token, None
    best = candidates[0]
    if best[0] != ascii_token[0] or abs(len(best) - len(ascii_token)) > 2:
        return token, None
    corrected = _TOKEN_VOCAB[best]
    return corrected, f"{token}→{corrected}"


def _fuzzy_correct_text(text: str) -> Tuple[str, List[str]]:
    if not text:
        return text, []

    corrections: List[str] = []
    parts = _TOKEN_SPLIT_RE.split(text)
    output: List[str] = []

    for part in parts:
        if not part:
            continue
        if not _is_word_token(part):
            output.append(part)
            continue

        corrected, reason = _correct_joined_token(part)
        if corrected == part:
            corrected, reason = _correct_single_token(part)
        output.append(corrected)
        if reason:
            corrections.append(reason)

    return "".join(output), corrections


class QueryPreprocessor:
    def process(self, message: str) -> Dict[str, Any]:
        original = str(message or "")
        normalized = re.sub(r"\s+", " ", original).strip()
        normalized = normalized.replace("’", "'").replace("“", '"').replace("”", '"')

        corrections: List[str] = []
        corrected = normalized
        for pattern, replacement, reason in _PHRASE_REPLACEMENTS:
            updated = pattern.sub(replacement, corrected)
            if updated != corrected:
                corrections.append(reason)
                corrected = updated

        fuzzy_corrected, fuzzy_corrections = _fuzzy_correct_text(corrected)
        if fuzzy_corrected != corrected:
            corrected = fuzzy_corrected
            for item in fuzzy_corrections[:6]:
                corrections.append(f"Sửa typo: {item}")

        corrected = re.sub(r"\s+", " ", corrected).strip()
        token_count = len(corrected.split()) if corrected else 0

        return {
            "original": original,
            "message": corrected or normalized,
            "tokenCount": token_count,
            "ascii": _strip_accents(corrected or normalized).lower(),
            "corrections": corrections,
            "changed": (corrected or normalized) != original,
        }


query_preprocessor = QueryPreprocessor()
