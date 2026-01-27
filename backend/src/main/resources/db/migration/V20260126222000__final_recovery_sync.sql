-- ===========================================================
-- EMERGENCY SYSTEM RECOVERY (FINAL SYNC)
-- Created: 2026-01-26 22:20:00
-- ===========================================================

DO $$ 
BEGIN
    -- 1. Table: timetable_slots (MAJOR FIX)
    -- Add missing columns for modern TimetableSlot entity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'date') THEN
        ALTER TABLE timetable_slots ADD COLUMN date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'slot_type_id') THEN
        ALTER TABLE timetable_slots ADD COLUMN slot_type_id BIGINT REFERENCES slot_types (id);
    END IF;

    -- Cleanup legacy columns if they still exist (already tried in global_sync but being safe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'start_time') THEN
        ALTER TABLE timetable_slots DROP COLUMN start_time;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'end_time') THEN
        ALTER TABLE timetable_slots DROP COLUMN end_time;
    END IF;

    -- Ensure class_name is the correct reference (legacy might have class_section_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'class_section_id') THEN
        -- If we have data, this is complex, but for now we assume we can drop and use class_name
        ALTER TABLE timetable_slots DROP COLUMN class_section_id;
    END IF;

    -- 2. Table: semesters (Safety)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'semesters' AND column_name = 'description') THEN
        ALTER TABLE semesters ADD COLUMN description TEXT;
    END IF;

    -- 3. Table: courses (Safety)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'description') THEN
        ALTER TABLE courses ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'number_of_slots') THEN
        ALTER TABLE courses ADD COLUMN number_of_slots INTEGER DEFAULT 0;
    END IF;

END $$;