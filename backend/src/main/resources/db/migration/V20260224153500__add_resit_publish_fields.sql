-- Add resit_grades_published columns for academic staff to publish resit grades to students
ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS resit_grades_published BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS resit_grades_published_at TIMESTAMP;

ALTER TABLE class_sections
ADD COLUMN IF NOT EXISTS resit_grades_published_by BIGINT;

ALTER TABLE class_sections
ADD CONSTRAINT fk_class_sections_resit_grades_published_by FOREIGN KEY (resit_grades_published_by) REFERENCES users (id);