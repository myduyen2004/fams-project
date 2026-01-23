-- Migration: Update class_sections table
-- Remove classCode and timetablePublished columns
-- Update status enum values

-- Drop old columns if they exist
ALTER TABLE class_sections DROP COLUMN IF EXISTS class_code;

ALTER TABLE class_sections DROP COLUMN IF EXISTS timetable_published;

-- Drop old index if exists
DROP INDEX IF EXISTS idx_class_section_class_code;

-- Update status values: migrate old values to new ones
UPDATE class_sections
SET
    status = 'UPCOMING'
WHERE
    status IN ('OPEN', 'CLOSED', 'FULL');

UPDATE class_sections
SET
    status = 'ONGOING'
WHERE
    status = 'IN_PROGRESS';

UPDATE class_sections
SET
    status = 'FINISHED'
WHERE
    status IN ('COMPLETED', 'CANCELLED');

-- Add check constraint for new status values
ALTER TABLE class_sections
DROP CONSTRAINT IF EXISTS class_sections_status_check;

ALTER TABLE class_sections
ADD CONSTRAINT class_sections_status_check CHECK (
    status IN (
        'UPCOMING',
        'ONGOING',
        'FINISHED'
    )
);

-- ===========================================================
-- Update enrollments table: Remove enrolledAt column
-- ===========================================================
ALTER TABLE enrollments DROP COLUMN IF EXISTS enrolled_at;