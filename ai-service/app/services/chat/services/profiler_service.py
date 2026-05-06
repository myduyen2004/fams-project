import json
import re
from loguru import logger
from app.services.chat.services.llm_client import llm_client
from app.services.chat.db.pool import db_pool

_PROFILER_SYSTEM_PROMPT = """
Bạn là chuyên gia phân tích hồ sơ AI. Nhiệm vụ: Trích xuất thông tin từ tin nhắn người dùng để cá nhân hóa chatbot.
Cấu trúc JSON trả về:
1. interests: list[str] (VD: ["Lập trình", "Học bổng"])
2. communication_style: str (VD: "Trang trọng", "Ngắn gọn")
3. emotional_state: str (VD: "Lo lắng", "Hào hứng")
4. preferred_tools: list[str] (Các chức năng người dùng hay dùng)
5. summary: str (Tóm tắt ngắn gọn về người này: "Sinh viên năm 3 quan tâm AI")

QUAN TRỌNG:
- Chỉ trả về JSON. Không giải thích.
- Nếu không có thông tin mới cho một trường, hãy giữ nguyên giá trị cũ từ 'Hồ sơ hiện tại'.
- Nếu hoàn toàn không có gì mới, trả về null.
"""

def _clean_json(text: str) -> str:
    """Loại bỏ Markdown code blocks và khoảng trắng thừa."""
    text = re.sub(r"```json\s*(.*?)\s*```", r"\1", text, flags=re.S)
    text = re.sub(r"```\s*(.*?)\s*```", r"\1", text, flags=re.S)
    return text.strip()

def extract_and_update_profile(user_id: int, user_message: str):
    try:
        # 1. Lấy profile hiện tại
        current_profile = {}
        with db_pool.get_cursor() as cur:
            cur.execute("SELECT interests, communication_style, emotional_state, preferred_tools, summary FROM user_ai_profiles WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if row:
                current_profile = {
                    "interests": json.loads(row["interests"]) if row["interests"] else [],
                    "communication_style": row["communication_style"] or "",
                    "emotional_state": row["emotional_state"] or "",
                    "preferred_tools": json.loads(row["preferred_tools"]) if row["preferred_tools"] else [],
                    "summary": row["summary"] or ""
                }

        # 2. Phân tích
        analysis_prompt = f"Hồ sơ hiện tại: {json.dumps(current_profile, ensure_ascii=False)}\nTin nhắn mới: {user_message}"
        response = llm_client.complete(
            prompt=f"{_PROFILER_SYSTEM_PROMPT}\n\n{analysis_prompt}",
            model="llama-3.1-8b-instant"
        )

        cleaned_resp = _clean_json(response)
        if not cleaned_resp or "null" in cleaned_resp.lower():
            return

        data = json.loads(cleaned_resp)
        if not isinstance(data, dict):
            return

        # 3. Merging logic: Ưu tiên dữ liệu mới, nhưng không để trống nếu đã có cũ
        interests = data.get("interests") if data.get("interests") else current_profile.get("interests", [])
        style = data.get("communication_style") or current_profile.get("communication_style", "")
        emotion = data.get("emotional_state") or current_profile.get("emotional_state", "")
        tools = data.get("preferred_tools") if data.get("preferred_tools") else current_profile.get("preferred_tools", [])
        summary = data.get("summary") or current_profile.get("summary", "")

        # 4. Update DB
        with db_pool.get_cursor() as cur:
            cur.execute("""
                INSERT INTO user_ai_profiles 
                (user_id, interests, communication_style, emotional_state, preferred_tools, summary, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    interests = EXCLUDED.interests,
                    communication_style = EXCLUDED.communication_style,
                    emotional_state = EXCLUDED.emotional_state,
                    preferred_tools = EXCLUDED.preferred_tools,
                    summary = EXCLUDED.summary,
                    last_updated = CURRENT_TIMESTAMP
            """, (
                user_id, 
                json.dumps(interests, ensure_ascii=False), 
                style, 
                emotion, 
                json.dumps(tools, ensure_ascii=False), 
                summary
            ))
        
        logger.info(f"Updated AI Profile for user {user_id}")

    except Exception as e:
        logger.error(f"Profiler error for user {user_id}: {e}")

def get_user_profile(user_id: int) -> dict:
    try:
        with db_pool.get_cursor() as cur:
            cur.execute("SELECT * FROM user_ai_profiles WHERE user_id = %s", (user_id,))
            return cur.fetchone()
    except Exception as e:
        logger.error(f"Error fetching profile for {user_id}: {e}")
        return None
