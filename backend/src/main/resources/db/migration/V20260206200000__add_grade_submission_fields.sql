-- Add grade submission tracking fields to class_sections table
ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS grades_submitted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grades_submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS grades_submitted_by BIGINT REFERENCES users (id);

-- Create index for faster lookup of submitted classes
CREATE INDEX IF NOT EXISTS idx_class_sections_grades_submitted ON class_sections (grades_submitted)
WHERE
    grades_submitted = TRUE;

COMMENT ON COLUMN class_sections.grades_submitted IS 'Whether grades have been submitted to academic office';

COMMENT ON COLUMN class_sections.grades_submitted_at IS 'Timestamp when grades were submitted';

COMMENT ON COLUMN class_sections.grades_submitted_by IS 'Reference to the user who submitted the grades';