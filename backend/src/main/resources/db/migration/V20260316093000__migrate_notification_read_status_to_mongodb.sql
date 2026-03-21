-- ===========================================================
-- Migration: Notification Read Status → MongoDB
-- Created: 2026-03-16 09:30:00
-- Description:
--   Read status tracking (is_read, read_at) has been moved from
--   MySQL (notification_recipients table) to MongoDB
--   (notification_read_status collection).
--
--   This migration:
--   1. Drops the notification_recipients table (no longer used)
--   2. Adds ACADEMIC_STAFF and ADMIN to the target_type column
-- ===========================================================

-- 1. Drop notification_recipients table
--    Read status is now stored in MongoDB collection: notification_read_status
DROP TABLE IF EXISTS notification_recipients;

-- 2. Update target_type constraint for new target types
--    The target_type column previously only supported: ALL, STUDENT, LECTURER, USER
--    Now also supports: ACADEMIC_STAFF, ADMIN
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'notifications'
        AND constraint_name = 'notifications_target_type_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_target_type_check;
    END IF;

    -- Add updated constraint with new target types
    ALTER TABLE notifications
        ADD CONSTRAINT notifications_target_type_check
        CHECK (target_type IN ('ALL', 'STUDENT', 'LECTURER', 'ACADEMIC_STAFF', 'ADMIN', 'USER'));
EXCEPTION
    WHEN others THEN
        -- Constraint might not exist (column uses VARCHAR without CHECK)
        RAISE NOTICE 'Skipping constraint update: %', SQLERRM;
END $$;
