-- ===========================================================
-- FIX TIMETABLE_SLOTS CONSTRAINT VIOLATION
-- Created: 2026-01-25 14:10:00
-- ===========================================================

-- 1. Make class_section_id nullable
-- The current Java entity (TimetableSlot.java) uses class_name as the join column.
-- The legacy class_section_id column is no longer populated by the application,
-- but it has a NOT NULL constraint from the initial baseline.

ALTER TABLE timetable_slots
ALTER COLUMN class_section_id
DROP NOT NULL;

-- 2. Optional: Ensure class_name is marked as NOT NULL if not already
-- (It was already NOT NULL in my previous check, but good to ensure)
ALTER TABLE timetable_slots ALTER COLUMN class_name SET NOT NULL;