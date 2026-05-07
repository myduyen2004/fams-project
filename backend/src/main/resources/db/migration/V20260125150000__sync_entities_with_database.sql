-- ===========================================================
-- SYNCHRONIZE ENTITIES WITH DATABASE
-- Comprehensive alignment of fields and tables
-- Created: 2026-01-25 15:00:00
-- ===========================================================

-- 1. Sync 'courses' table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS number_of_slots INTEGER DEFAULT 20;

-- 2. Sync 'class_sections' table
ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS number_of_slots INTEGER DEFAULT 20;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS current_enrollment INTEGER DEFAULT 0;

-- Fix ClassSection Primary Key (Align with JPA entity @Id String className)
-- 1. Drop old foreign keys that point to id
ALTER TABLE enrollments
DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;
-- Wait, this is for user_id.
-- Check actual constraint names for references to class_sections(id)

-- Note: We use DO blocks to safely handle constraints
DO $$
BEGIN
    -- 2. Change PK of class_sections
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_sections' AND column_name = 'id') THEN
        -- Check if it is the PK
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_sections_pkey') THEN
            ALTER TABLE class_sections DROP CONSTRAINT class_sections_pkey CASCADE;
        END IF;
        ALTER TABLE class_sections ADD PRIMARY KEY (class_name);
        ALTER TABLE class_sections DROP COLUMN id;
    END IF;
END $$;

-- 3. Sync 'timetable_slots' table
ALTER TABLE timetable_slots
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SCHEDULED';

ALTER TABLE timetable_slots
ADD COLUMN IF NOT EXISTS note VARCHAR(500);

-- Handle className string reference (matching TimetableSlot.java)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'class_name') THEN
        ALTER TABLE timetable_slots ADD COLUMN class_name VARCHAR(50);
    END IF;
END $$;

-- Drop old numeric ID reference if it exists to avoid confusion
-- (Entity now uses class_name as the join column)
ALTER TABLE timetable_slots DROP COLUMN IF EXISTS class_section_id;

-- Ensure foreign key for class_name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_timetable_slot_class') THEN
        ALTER TABLE timetable_slots
        ADD CONSTRAINT fk_timetable_slot_class
        FOREIGN KEY (class_name) REFERENCES class_sections (class_name) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Sync 'attendance_sessions' table
ALTER TABLE attendance_sessions
ADD COLUMN IF NOT EXISTS qr_code_data VARCHAR(500);

ALTER TABLE attendance_sessions
ADD COLUMN IF NOT EXISTS qr_expires_at TIMESTAMP;

-- 5. Create 'notification_attachments' table (for @ElementCollection)
CREATE TABLE IF NOT EXISTS notification_attachments (
    notification_id BIGINT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    url TEXT NOT NULL
);

-- 6. Indices (Matching entity definitions)
CREATE INDEX IF NOT EXISTS idx_course_number_of_slots ON courses (number_of_slots);

CREATE INDEX IF NOT EXISTS idx_class_section_status ON class_sections (status);

CREATE INDEX IF NOT EXISTS idx_timetable_slot_status ON timetable_slots (status);