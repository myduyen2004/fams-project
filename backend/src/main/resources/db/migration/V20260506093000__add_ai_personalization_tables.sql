-- V20260506093000__add_ai_personalization_tables.sql

-- 1. Bảng lưu hồ sơ cá nhân hóa AI (Thông tin "mềm")
CREATE TABLE IF NOT EXISTS user_ai_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    interests TEXT,                 -- JSON string lưu sở thích, mối quan tâm
    communication_style TEXT,        -- Phong cách ngôn ngữ ưu thích
    emotional_state TEXT,           -- Trạng thái tâm lý hoặc bối cảnh gần nhất
    preferred_tools TEXT,           -- JSON string lưu danh sách các tool hay dùng
    summary TEXT,                   -- Bản tóm tắt tổng quát về người dùng cho AI đọc
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng lưu ký ức dài hạn (Vector Memory)
CREATE TABLE IF NOT EXISTS user_ai_memories (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    memory_content TEXT NOT NULL,    -- Nội dung ký ức (đã tóm tắt)
    memory_vector vector(1024),      -- Embedding vector (Cohere embed-multilingual-v3.0)
    relevance_score FLOAT,           -- Điểm quan trọng/ưu tiên
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tìm kiếm vector nhanh hơn
CREATE INDEX IF NOT EXISTS idx_user_ai_memories_user_id ON user_ai_memories(user_id);
-- Sử dụng HNSW nếu có thể, fallback về IVFFlat hoặc bỏ qua nếu DB không hỗ trợ
DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_user_ai_memories_vector_hnsw 
            ON user_ai_memories 
            USING hnsw (memory_vector vector_cosine_ops);
    EXCEPTION WHEN OTHERS THEN
        CREATE INDEX IF NOT EXISTS idx_user_ai_memories_vector_ivfflat
            ON user_ai_memories 
            USING ivfflat (memory_vector vector_cosine_ops) WITH (lists = 100);
    END;
END $$;
