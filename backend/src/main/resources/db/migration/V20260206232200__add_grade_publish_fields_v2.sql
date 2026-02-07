-- Add grades_published columns for academic staff to publish grades to students
-- Using individual statements with IF NOT EXISTS for maximum compatibility (v2)
ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS grades_published BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS grades_published_at TIMESTAMP;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS grades_published_by BIGINT;

-- Drop and recreate constraint to ensure it exists correctly without conflict
ALTER TABLE class_sections
DROP CONSTRAINT IF EXISTS fk_class_sections_grades_published_by;

ALTER TABLE class_sections
ADD CONSTRAINT fk_class_sections_grades_published_by FOREIGN KEY (grades_published_by) REFERENCES users (id);