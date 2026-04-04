-- Phase 1: Split manual news and automatic notifications
-- Date: 2026-03-20

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'news'
    ) THEN
        ALTER TABLE notifications RENAME TO news;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notification_attachments'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'news_attachments'
    ) THEN
        ALTER TABLE notification_attachments RENAME TO news_attachments;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'news_attachments' AND column_name = 'notification_id'
    ) THEN
        ALTER TABLE news_attachments RENAME COLUMN notification_id TO news_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'news_attachments'
          AND constraint_name = 'notification_attachments_notification_id_fkey'
    ) THEN
        ALTER TABLE news_attachments DROP CONSTRAINT notification_attachments_notification_id_fkey;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'news_attachments'
    ) THEN
        ALTER TABLE news_attachments
            ADD CONSTRAINT news_attachments_news_id_fkey
            FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'news' AND column_name = 'target_course_id'
    ) THEN
        ALTER TABLE news DROP COLUMN target_course_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'news' AND column_name = 'target_roles'
    ) THEN
        ALTER TABLE news DROP COLUMN target_roles;
    END IF;
END $$;

ALTER TABLE news ADD COLUMN IF NOT EXISTS target_url VARCHAR(255);
ALTER TABLE news ADD COLUMN IF NOT EXISTS thumbnail_image VARCHAR(500);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_notification_target_class' AND n.nspname = 'public'
    ) THEN
        ALTER INDEX idx_notification_target_class RENAME TO idx_news_target_class;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_news_type ON news(type);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_sent_at ON news(sent_at);
CREATE INDEX IF NOT EXISTS idx_news_target_type ON news(target_type);
CREATE INDEX IF NOT EXISTS idx_news_sender ON news(sender_id);

DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    target_url VARCHAR(255),
    target_type VARCHAR(20) NOT NULL DEFAULT 'USER',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_target_type ON notifications(target_type);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
