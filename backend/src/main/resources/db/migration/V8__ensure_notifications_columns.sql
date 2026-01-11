-- Ensure notifications table has all required columns
-- Specifically addressing missing columns that cause 500 errors during dashboard broadcasting

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Basic content
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'content') THEN
            ALTER TABLE notifications ADD COLUMN content TEXT;
        END IF;

        -- Metadata and Types
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
            ALTER TABLE notifications ADD COLUMN type VARCHAR(20) DEFAULT 'SYSTEM';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
            ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'MEDIUM';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'status') THEN
            ALTER TABLE notifications ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT';
        END IF;

        -- Targeting
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_type') THEN
            ALTER TABLE notifications ADD COLUMN target_type VARCHAR(20) DEFAULT 'ALL';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_roles') THEN
            ALTER TABLE notifications ADD COLUMN target_roles VARCHAR(200);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_class_name') THEN
            ALTER TABLE notifications ADD COLUMN target_class_name VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_course_id') THEN
            ALTER TABLE notifications ADD COLUMN target_course_id BIGINT;
        END IF;

        -- Scheduling
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'scheduled_at') THEN
            ALTER TABLE notifications ADD COLUMN scheduled_at TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sent_at') THEN
            ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMP;
        END IF;
    END IF;
END $$;