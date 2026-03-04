-- Add resit_grades_published columns for academic staff to publish resit grades to students
ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS resit_grades_published BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS resit_grades_published_at TIMESTAMP;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS resit_grades_published_by BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_class_sections_resit_grades_published_by') THEN
        ALTER TABLE class_sections ADD CONSTRAINT fk_class_sections_resit_grades_published_by FOREIGN KEY (resit_grades_published_by) REFERENCES users (id);
    END IF;
END $$;