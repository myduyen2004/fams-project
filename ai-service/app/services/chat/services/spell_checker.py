"""
services/spell_checker.py
Simple LLM-based spell correction for Vietnamese/English chatbot queries.
"""
from typing import Optional
from loguru import logger
from services.llm_client import llm_client

_SPELL_PROMPT = """
Bạn là công cụ sửa lỗi chính tả và chuẩn hóa câu văn.
NHIỆM VỤ: Chỉ sửa lỗi chính tả, dấu câu, và ngữ pháp.
BẮT BUỘC:
- CHỈ TRẢ VỀ CÂU ĐÃ SỬA. KHÔNG giải thích, KHÔNG thêm tiền tố, KHÔNG dùng dấu ngoặc kép.
- KHÔNG ĐƯỢC trả lời câu hỏi của người dùng.
- GIỮ NGUYÊN các mốc thời gian tương đối như "hôm nay", "ngày mai", "tuần này", "tuần tới", "kỳ này", "kỳ sau".
- TUYỆT ĐỐI KHÔNG thay đổi các mã số (VD: GV115211, SE1704, PRF192, Spring 2026...). Giữ nguyên độ dài và định dạng của mã.

CÂU CẦN SỬA: "{message}"
KẾT QUẢ:
"""

class SpellChecker:
    def correct(self, message: str, model: Optional[str] = None) -> str:
        if not message or len(message.strip()) < 3:
            return message

        prompt = _SPELL_PROMPT.format(message=message)
        try:
            corrected = llm_client.complete(prompt, model).strip()
            
            # Post-processing
            # 1. Handle "KẾT QUẢ:" prefix
            if "KẾT QUẢ:" in corrected:
                corrected = corrected.split("KẾT QUẢ:")[-1].strip()
            
            # 2. Handle "A -> B" or "A -> B" patterns
            if " -> " in corrected:
                corrected = corrected.split(" -> ")[-1].strip()
            
            # 3. Take only the first line if multiple
            corrected = corrected.split("\n")[0].strip()
            
            # 4. Clean quotes
            corrected = corrected.strip('"').strip("'")
            
            if corrected.lower() != message.lower():
                logger.info(f"[SpellChecker] Fixed: '{message}' -> '{corrected}'")
            return corrected
        except Exception as exc:
            logger.error(f"[SpellChecker] Error: {exc}")
            return message

spell_checker = SpellChecker()
