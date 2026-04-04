-- ============================================================
-- Migration: Create user_device_tokens table
-- Purpose:   Store FCM device tokens for push notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS user_device_tokens (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255)    NOT NULL,
    platform    VARCHAR(50),        -- 'android', 'ios', 'web'
    device_id   VARCHAR(100),
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_token_user  ON user_device_tokens (user_id);

-- Index for fast lookup / dedup by token value
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_value ON user_device_tokens (token);
