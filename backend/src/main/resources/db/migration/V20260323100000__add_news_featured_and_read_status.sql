-- Add support for FEATURED news type and read-status tracking for unread badge sync

CREATE TABLE IF NOT EXISTS news_read_status (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    news_id BIGINT NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_news_read_status_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_news_read_status_news FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_news ON news_read_status(user_id, news_id);
CREATE INDEX IF NOT EXISTS idx_news_read_status_user ON news_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_news_read_status_news ON news_read_status(news_id);
CREATE INDEX IF NOT EXISTS idx_news_read_status_read_at ON news_read_status(read_at);
