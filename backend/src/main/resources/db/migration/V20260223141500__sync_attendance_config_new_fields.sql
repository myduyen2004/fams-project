-- ===========================================================
-- SYNC ATTENDANCE CONFIG NEW FIELDS
-- Created: 2026-02-23 14:15:00
-- ===========================================================

DO $$ 
BEGIN
    -- 1. Table: attendance_configs - Add new columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'manual_enabled') THEN
        ALTER TABLE attendance_configs ADD COLUMN manual_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'open_before_minutes') THEN
        ALTER TABLE attendance_configs ADD COLUMN open_before_minutes INTEGER NOT NULL DEFAULT 15;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'close_after_minutes') THEN
        ALTER TABLE attendance_configs ADD COLUMN close_after_minutes INTEGER NOT NULL DEFAULT 15;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'liveness_enabled') THEN
        ALTER TABLE attendance_configs ADD COLUMN liveness_enabled BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'max_attempts') THEN
        ALTER TABLE attendance_configs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'force_campus_wifi') THEN
        ALTER TABLE attendance_configs ADD COLUMN force_campus_wifi BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'min_matched_aps') THEN
        ALTER TABLE attendance_configs ADD COLUMN min_matched_aps INTEGER NOT NULL DEFAULT 1;
    END IF;

    -- 2. Drop obsolete columns (moved to dedicated sections or replaced)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'qr_enabled') THEN
        ALTER TABLE attendance_configs DROP COLUMN qr_enabled;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'qr_expire_seconds') THEN
        ALTER TABLE attendance_configs DROP COLUMN qr_expire_seconds;
    END IF;

END $$;