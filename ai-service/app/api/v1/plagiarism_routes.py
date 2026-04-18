import base64
import io
import os
import zipfile
from typing import Any
from urllib.parse import urlparse

import requests
from flask import Blueprint, jsonify, request
from PIL import Image
from pypdf import PdfReader
from docx import Document

plagiarism_bp = Blueprint("plagiarism", __name__, url_prefix="/api/v1/plagiarism")

COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
COHERE_EMBED_MODEL = os.getenv("COHERE_EMBED_MODEL", "embed-multilingual-v3.0")
COHERE_EMBED_DIM = int(os.getenv("COHERE_EMBED_DIM", "1024"))
JINA_API_KEY = os.getenv("JINA_API_KEY", "")
JINA_IMAGE_EMBED_MODEL = os.getenv("JINA_IMAGE_EMBED_MODEL", "jina-clip-v2")
JINA_IMAGE_EMBED_DIM = int(os.getenv("JINA_IMAGE_EMBED_DIM", "1024"))
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_COMMENT_MODEL = os.getenv("GROQ_COMMENT_MODEL", "llama-3.1-8b-instant")


@plagiarism_bp.route("/index-submission", methods=["POST"])
def index_submission() -> Any:
    payload = request.get_json(silent=True) or {}
    file_urls = payload.get("fileUrls") or []
    file_names = payload.get("fileNames") or []
    note = (payload.get("note") or "").strip()

    text_units = []
    image_units = []
    warnings = []

    if note:
        for idx, chunk in enumerate(chunk_text(note)):
            text_units.append({
                "fileName": "submission_note",
                "pageOrChunk": f"note-{idx + 1}",
                "content": chunk,
                "contentPreview": chunk[:180],
            })

    for idx, file_url in enumerate(file_urls):
        file_name = file_names[idx] if idx < len(file_names) else f"file_{idx + 1}"
        try:
            file_bytes, content_type, url_path = download_file(file_url)
            extracted_texts, extracted_images, detected_kind = extract_artifacts(file_name, file_bytes, content_type, url_path)
            for text_item in extracted_texts:
                for c_idx, chunk in enumerate(chunk_text(text_item["content"])):
                    text_units.append({
                        "fileName": file_name,
                        "pageOrChunk": f"{text_item['pageOrChunk']}-chunk-{c_idx + 1}",
                        "content": chunk,
                        "contentPreview": chunk[:180],
                    })
            image_units.extend([
                {
                    "fileName": file_name,
                    "pageOrChunk": image["pageOrChunk"],
                    "bytes": image["bytes"],
                    "contentPreview": image.get("contentPreview", "Embedded image"),
                }
                for image in extracted_images
            ])
            if detected_kind in {"pdf", "docx", "doc", "text"} and not extracted_texts:
                warnings.append(f"{file_name}: Không trích xuất được text từ file {detected_kind}.")
        except Exception as exc:
            warnings.append(f"{file_name}: {exc}")

    text_embedded = embed_text_units(text_units)
    image_embedded = embed_image_units(image_units)

    return jsonify({
        "model": f"cohere:{COHERE_EMBED_MODEL}+jina:{JINA_IMAGE_EMBED_MODEL}",
        "textEmbeddings": text_embedded,
        "imageEmbeddings": image_embedded,
        "warnings": warnings,
    })


@plagiarism_bp.route("/generate-comments", methods=["POST"])
def generate_comments() -> Any:
    payload = request.get_json(silent=True) or {}
    top_matches = payload.get("topMatches") or []

    if not top_matches:
        return jsonify({
            "overallComment": "Chưa phát hiện bài có mức tương đồng nổi bật trong dữ liệu đã index.",
            "matchComments": [],
        })

    prompt = build_comment_prompt(payload)
    comment_text = generate_llm_comment(prompt)
    if not comment_text:
        comment_text = "Sau đây là phân tích sau khi đối chiếu bài tập của sinh viên với các bài tập khác trong cùng môn học."

    match_comments = []
    for match in top_matches:
        percent = match.get("plagiarismPercent", 0)
        text_score = float(match.get("textScore") or 0.0)
        image_score = float(match.get("imageScore") or 0.0)
        signals = match.get("sharedSignals") or []
        signal_text = ", ".join(signals[:2]) if signals else "chưa có tín hiệu nổi bật"
        match_comments.append({
            "submissionId": match.get("submissionId"),
            "comment": (
                f"Mức tương đồng ước tính {percent}%. "
                f"Text score {text_score:.2f}, image score {image_score:.2f}. "
                f"Tín hiệu chính: {signal_text}."
            ),
        })

    return jsonify({
        "overallComment": comment_text.strip(),
        "matchComments": match_comments,
    })


def build_comment_prompt(payload: dict[str, Any]) -> str:
    lines = [
        "Bạn là trợ lý học vụ, viết nhận xét ngắn gọn bằng tiếng Việt cho kiểm tra đạo văn.",
        f"- Bài tập: {payload.get('assignmentTitle', '')}",
        f"- Môn: {payload.get('courseCode', '')}",
        f"- Sinh viên: {payload.get('studentName', '')}",
        f"- Plagiarism percent: {payload.get('plagiarismPercent', 0)}",
        f"- Probability: {payload.get('probability', 0)}",
        "- Top matches:",
    ]
    for item in payload.get("topMatches", []):
        lines.append(
            f"  + submission {item.get('submissionId')}: "
            f"percent={item.get('plagiarismPercent')}, "
            f"text={item.get('textScore')}, image={item.get('imageScore')}, "
            f"signals={item.get('sharedSignals')}"
        )
    lines.append("Yêu cầu: 2 câu, trung lập, không kết luận tuyệt đối, nhắc giảng viên cần đối chiếu thủ công.")
    return "\n".join(lines)


def generate_llm_comment(prompt: str) -> str:
    if not GROQ_API_KEY:
        return ""
    try:
        response = requests.post(
            f"{GROQ_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_COMMENT_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 220,
            },
            timeout=30,
        )
        response.raise_for_status()
        body = response.json()
        return body["choices"][0]["message"]["content"]
    except Exception:
        return ""


def download_file(url: str) -> tuple[bytes, str, str]:
    response = requests.get(url, timeout=45)
    response.raise_for_status()
    content_type = (response.headers.get("Content-Type") or "").lower()
    url_path = urlparse(url).path.lower()
    return response.content, content_type, url_path


def extract_artifacts(
    file_name: str,
    file_bytes: bytes,
    content_type: str,
    url_path: str,
) -> tuple[list[dict[str, str]], list[dict[str, Any]], str]:
    lower = (file_name or "").lower()
    text_units: list[dict[str, str]] = []
    image_units: list[dict[str, Any]] = []
    detected_kind = detect_file_kind(lower, content_type, url_path, file_bytes)

    if detected_kind == "pdf":
        text_units.extend(extract_pdf_text(file_bytes))
        image_units.extend(extract_pdf_images(file_bytes))
    elif detected_kind == "docx":
        text_units.extend(extract_docx_text(file_bytes))
        image_units.extend(extract_docx_images(file_bytes))
    elif detected_kind == "doc":
        text_units.extend(extract_doc_text_best_effort(file_bytes))
    elif detected_kind == "image":
        image_units.append({"pageOrChunk": "image-1", "bytes": file_bytes, "contentPreview": "Uploaded image"})
    elif detected_kind == "text":
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore").strip()
            if decoded:
                text_units.append({"pageOrChunk": "text-1", "content": decoded})
        except Exception:
            pass
    else:
        # Unknown format: try best-effort text decode.
        try:
            decoded = file_bytes.decode("utf-8", errors="ignore").strip()
            if decoded:
                text_units.append({"pageOrChunk": "text-1", "content": decoded})
        except Exception:
            pass

    return text_units, image_units, detected_kind


def detect_file_kind(file_name: str, content_type: str, url_path: str, file_bytes: bytes) -> str:
    path_hint = f"{file_name} {url_path}"
    if ".pdf" in path_hint or content_type == "application/pdf" or file_bytes.startswith(b"%PDF"):
        return "pdf"
    if ".docx" in path_hint or content_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
    } and is_docx_bytes(file_bytes):
        return "docx"
    if ".doc" in path_hint or content_type in {
        "application/msword",
        "application/vnd.ms-word",
    }:
        return "doc"
    if any(ext in path_hint for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]) or content_type.startswith("image/"):
        return "image"
    if any(ext in path_hint for ext in [".txt", ".md", ".csv", ".json"]) or content_type.startswith("text/"):
        return "text"
    if is_docx_bytes(file_bytes):
        return "docx"
    return "unknown"


def is_docx_bytes(file_bytes: bytes) -> bool:
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
            names = zf.namelist()
            return "[Content_Types].xml" in names and any(name.startswith("word/") for name in names)
    except Exception:
        return False


def extract_pdf_text(file_bytes: bytes) -> list[dict[str, str]]:
    reader = PdfReader(io.BytesIO(file_bytes))
    units = []
    for index, page in enumerate(reader.pages):
        content = (page.extract_text() or "").strip()
        if content:
            units.append({"pageOrChunk": f"page-{index + 1}", "content": content})
    return units


def extract_pdf_images(file_bytes: bytes) -> list[dict[str, Any]]:
    reader = PdfReader(io.BytesIO(file_bytes))
    units = []
    for page_idx, page in enumerate(reader.pages):
        try:
            images = list(getattr(page, "images", []))
        except Exception:
            images = []
        for img_idx, image in enumerate(images):
            try:
                image_bytes = image.data
                units.append({
                    "pageOrChunk": f"page-{page_idx + 1}-img-{img_idx + 1}",
                    "bytes": image_bytes,
                    "contentPreview": "PDF embedded image",
                })
            except Exception:
                continue
    return units


def extract_docx_text(file_bytes: bytes) -> list[dict[str, str]]:
    document = Document(io.BytesIO(file_bytes))
    paragraphs = []
    for index, para in enumerate(document.paragraphs):
        content = (para.text or "").strip()
        if content:
            paragraphs.append({"pageOrChunk": f"para-{index + 1}", "content": content})
    return paragraphs


def extract_docx_images(file_bytes: bytes) -> list[dict[str, Any]]:
    units = []
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        media_files = [name for name in zf.namelist() if name.startswith("word/media/")]
        for idx, media_name in enumerate(media_files):
            try:
                image_bytes = zf.read(media_name)
                units.append({
                    "pageOrChunk": f"docx-img-{idx + 1}",
                    "bytes": image_bytes,
                    "contentPreview": media_name.split("/")[-1],
                })
            except Exception:
                continue
    return units


def extract_doc_text_best_effort(file_bytes: bytes) -> list[dict[str, str]]:
    decoded = file_bytes.decode("latin-1", errors="ignore")
    compact = " ".join(decoded.split())
    if not compact:
        return []
    return [{"pageOrChunk": "doc-binary", "content": compact[:8000]}]


def chunk_text(text: str, chunk_size: int = 450, overlap: int = 80) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = max(start + 1, end - overlap)
    return chunks


def embed_text_units(text_units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not text_units:
        return []
    texts = [unit["content"] for unit in text_units]
    vectors = call_cohere_embeddings(texts)
    result = []
    for idx, unit in enumerate(text_units):
        embedding = vectors[idx] if idx < len(vectors) else []
        result.append({
            "fileName": unit["fileName"],
            "pageOrChunk": unit["pageOrChunk"],
            "contentPreview": unit["contentPreview"],
            "embedding": embedding,
        })
    return result


def embed_image_units(image_units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not image_units:
        return []
    image_base64_payload = []
    for unit in image_units:
        image_base64_payload.append(bytes_to_data_url(unit["bytes"]))
    vectors = call_jina_image_embeddings(image_base64_payload)
    result = []
    for idx, unit in enumerate(image_units):
        embedding = vectors[idx] if idx < len(vectors) else []
        result.append({
            "fileName": unit["fileName"],
            "pageOrChunk": unit["pageOrChunk"],
            "contentPreview": unit["contentPreview"],
            "embedding": embedding,
        })
    return result


def call_cohere_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if not COHERE_API_KEY:
        return [[0.0] * COHERE_EMBED_DIM for _ in texts]
    response = requests.post(
        "https://api.cohere.com/v2/embed",
        headers={
            "Authorization": f"Bearer {COHERE_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": COHERE_EMBED_MODEL,
            "input_type": "search_document",
            "embedding_types": ["float"],
            "texts": texts,
        },
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()
    vectors = body.get("embeddings", {}).get("float", [])
    for vector in vectors:
        if len(vector) != COHERE_EMBED_DIM:
            raise ValueError(f"Cohere embedding dimension mismatch, expected {COHERE_EMBED_DIM}, got {len(vector)}")
    return vectors


def call_jina_image_embeddings(images_as_data_url: list[str]) -> list[list[float]]:
    if not images_as_data_url:
        return []
    if not JINA_API_KEY:
        return [[0.0] * JINA_IMAGE_EMBED_DIM for _ in images_as_data_url]
    response = requests.post(
        "https://api.jina.ai/v1/embeddings",
        headers={
            "Authorization": f"Bearer {JINA_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": JINA_IMAGE_EMBED_MODEL,
            "input": [{"image": value} for value in images_as_data_url],
        },
        timeout=60,
    )
    response.raise_for_status()
    body = response.json()
    vectors = [item["embedding"] for item in body.get("data", [])]
    for vector in vectors:
        if len(vector) != JINA_IMAGE_EMBED_DIM:
            raise ValueError(f"Jina embedding dimension mismatch, expected {JINA_IMAGE_EMBED_DIM}, got {len(vector)}")
    return vectors


def bytes_to_data_url(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"
