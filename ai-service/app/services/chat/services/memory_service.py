"""
memory_service.py  ── v1.0
Dịch vụ lưu trữ và truy vấn ký ức dài hạn sử dụng pgvector.
"""
import os
import requests
from loguru import logger
from app.services.chat.db.pool import db_pool

COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
COHERE_EMBED_MODEL = os.getenv("COHERE_EMBED_MODEL", "embed-multilingual-v3.0")
COHERE_EMBED_DIM = int(os.getenv("COHERE_EMBED_DIM", "1024"))

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Gọi Cohere API để lấy vector."""
    if not texts or not COHERE_API_KEY:
        return [[0.0] * COHERE_EMBED_DIM for _ in texts]
    
    try:
        resp = requests.post(
            "https://api.cohere.ai/v1/embed",
            headers={
                "Authorization": f"Bearer {COHERE_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "texts": texts,
                "model": COHERE_EMBED_MODEL,
                "input_type": "search_document",
                "embedding_types": ["float"],
            },
            timeout=20
        )
        if resp.status_code == 200:
            return resp.json()["embeddings"]["float"]
        else:
            logger.error(f"Cohere error: {resp.status_code} - {resp.text}")
            return [[0.0] * COHERE_EMBED_DIM for _ in texts]
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        return [[0.0] * COHERE_EMBED_DIM for _ in texts]

def save_memory(user_id: int, content: str):
    """Lưu một đoạn ký ức mới (sau khi đã tóm tắt)."""
    try:
        vector = get_embeddings([content])[0]
        with db_pool.get_cursor() as cur:
            cur.execute("""
                INSERT INTO user_ai_memories (user_id, memory_content, memory_vector)
                VALUES (%s, %s, %s)
            """, (user_id, content, vector))
        logger.info(f"Saved new memory for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to save memory for {user_id}: {e}")

def get_relevant_memories(user_id: int, message: str, limit: int = 3) -> str:
    """Tìm kiếm ký ức liên quan nhất đến câu hỏi hiện tại."""
    try:
        # 1. Vector hóa câu hỏi
        query_vector = get_embeddings([message])[0]
        
        # 2. Tìm kiếm Vector Similarity
        with db_pool.get_cursor() as cur:
            cur.execute("""
                SELECT memory_content 
                FROM user_ai_memories 
                WHERE user_id = %s 
                ORDER BY memory_vector <=> %s::vector
                LIMIT %s
            """, (user_id, query_vector, limit))
            rows = cur.fetchall()
            
            if not rows:
                return ""
            
            memories = [r['memory_content'] for r in rows]
            return "\n- " + "\n- ".join(memories)
    except Exception as e:
        logger.error(f"Memory retrieval error for {user_id}: {e}")
        return ""
def process_post_chat(user_id: int, message: str, answer: str):
    """
    Xử lý sau hội thoại:
    1. Cập nhật hồ sơ tâm lý (Profiler)
    2. Tóm tắt và lưu ký ức dài hạn (Memory)
    """
    from app.services.chat.services.profiler_service import extract_and_update_profile
    from app.services.chat.services.llm_client import llm_client

    # 1. Cập nhật hồ sơ hành vi
    try:
        extract_and_update_profile(user_id, message)
    except Exception as e:
        logger.error(f"Profiler background error: {e}")

    # 2. Lưu ký ức nếu tương tác có giá trị
    if len(message) < 10 or "xin chào" in message.lower():
        return

    try:
        summary_prompt = f"Tóm tắt tương tác sau thành 1 câu ngắn gọn để lưu vào bộ nhớ (Ví dụ: Người dùng hỏi về X và AI đã trả lời Y).\nUser: {message}\nAI: {answer}\n\nTóm tắt:"
        summary = llm_client.complete(summary_prompt, model="llama-3.1-8b-instant").strip()
        if summary and len(summary) > 5:
            save_memory(user_id, summary)
    except Exception as e:
        logger.error(f"Memory summary error: {e}")
