-- Add prerequisite courses support
-- Course A is prerequisite of Course B: if student passes A, they can enroll in B
CREATE TABLE IF NOT EXISTS course_prerequisites (
    course_id BIGINT NOT NULL,
    prerequisite_id BIGINT NOT NULL,
    PRIMARY KEY (course_id, prerequisite_id),
    CONSTRAINT fk_prereq_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT fk_prereq_prerequisite FOREIGN KEY (prerequisite_id) REFERENCES courses (id) ON DELETE CASCADE,
    CONSTRAINT chk_no_self_reference CHECK (course_id != prerequisite_id)
);

CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course ON course_prerequisites (course_id);

CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prereq ON course_prerequisites (prerequisite_id);

-- Remove is_required column from grade_components table (no longer needed)
ALTER TABLE grade_components DROP COLUMN IF EXISTS is_required;

-- Add is_calculated_in_gpa column to courses table
ALTER TABLE courses
ADD COLUMN is_calculated_in_gpa BOOLEAN DEFAULT TRUE NOT NULL;