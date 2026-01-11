-- Ensure dashboard related tables have all required columns for statistics and broadcasting
-- Specifically addressing the 'type' column missing in system_logs and alerts reported in 500 errors

DO $$
BEGIN
    -- Add type column to system_logs if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'system_logs' AND column_name = 'type') THEN
        ALTER TABLE system_logs ADD COLUMN type VARCHAR(20) DEFAULT 'INFO' NOT NULL;
    END IF;

    -- Add type column to alerts if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'alerts' AND column_name = 'type') THEN
        ALTER TABLE alerts ADD COLUMN type VARCHAR(30) DEFAULT 'SYSTEM' NOT NULL;
    END IF;
END $$;