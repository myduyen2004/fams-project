-- Migration: Add missing chat message reactions and user device tokens
-- Created: 2026-03-14 12:00:00

-- 1. Create chat_message_reactions table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    reacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reaction_message ON chat_message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reaction_user ON chat_message_reactions (user_id);

-- 2. Create user_device_tokens table
CREATE TABLE IF NOT EXISTS user_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    device_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_user ON user_device_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_token_value ON user_device_tokens (token);

-- Update trigger for user_device_tokens
DROP TRIGGER IF EXISTS trg_user_device_tokens_updated_at ON user_device_tokens;
CREATE TRIGGER trg_user_device_tokens_updated_at BEFORE UPDATE ON user_device_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
