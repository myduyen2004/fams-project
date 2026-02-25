-- ===========================================================
-- CLEANUP ATTENDANCE CONFIG OBSOLETE FIELDS
-- Created: 2026-02-24 15:12:00
-- ===========================================================

DO $$ 
BEGIN
    -- Drop obsolete columns that are no longer present in the simplified UI
    
    -- 1. General Settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'late_threshold_minutes') THEN
        ALTER TABLE attendance_configs DROP COLUMN late_threshold_minutes;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'open_before_minutes') THEN
        ALTER TABLE attendance_configs DROP COLUMN open_before_minutes;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'close_after_minutes') THEN
        ALTER TABLE attendance_configs DROP COLUMN close_after_minutes;
    END IF;

    -- 2. Face Recognition Advanced Settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'liveness_enabled') THEN
        ALTER TABLE attendance_configs DROP COLUMN liveness_enabled;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'face_match_threshold') THEN
        ALTER TABLE attendance_configs DROP COLUMN face_match_threshold;
    END IF;

    -- 3. WiFi Location Advanced Settings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'force_campus_wifi') THEN
        ALTER TABLE attendance_configs DROP COLUMN force_campus_wifi;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'min_matched_aps') THEN
        ALTER TABLE attendance_configs DROP COLUMN min_matched_aps;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'wifi_rssi_threshold') THEN
        ALTER TABLE attendance_configs DROP COLUMN wifi_rssi_threshold;
    END IF;

END $$;