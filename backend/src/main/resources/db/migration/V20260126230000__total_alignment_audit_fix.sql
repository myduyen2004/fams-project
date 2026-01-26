-- ===========================================================
-- FINAL TOTAL SCHEMA-ENTITY ALIGNMENT
-- Created: 2026-01-26 23:00:00
-- ===========================================================

DO $$ 
BEGIN
    -- 1. Table: room_wifi_access_points
    -- Fix naming mismatch (positionnote -> position_note)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_wifi_access_points' AND column_name = 'positionnote') THEN
        ALTER TABLE room_wifi_access_points RENAME COLUMN positionnote TO position_note;
    END IF;

    -- 2. Table: ai_chat_messages
    -- Add missing analytical columns defined in entity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_chat_messages' AND column_name = 'token_count') THEN
        ALTER TABLE ai_chat_messages ADD COLUMN token_count INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_chat_messages' AND column_name = 'model_version') THEN
        ALTER TABLE ai_chat_messages ADD COLUMN model_version VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_chat_messages' AND column_name = 'processing_time_ms') THEN
        ALTER TABLE ai_chat_messages ADD COLUMN processing_time_ms BIGINT;
    END IF;

    -- 3. Table: semesters (Safety/Redundancy)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'semesters' AND column_name = 'description') THEN
        ALTER TABLE semesters ADD COLUMN description TEXT;
    END IF;

END $$;