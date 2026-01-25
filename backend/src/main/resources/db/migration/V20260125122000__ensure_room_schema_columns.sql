-- ===========================================================
-- ENSURE ROOM SCHEMA COLUMNS (code, type)
-- Created: 2026-01-25 13:50:00
-- ===========================================================

-- 1. Add 'code' column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'code') THEN
        ALTER TABLE rooms ADD COLUMN code VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- 2. Add 'type' column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'type') THEN
        ALTER TABLE rooms ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'LECTURE';
    END IF;
END $$;