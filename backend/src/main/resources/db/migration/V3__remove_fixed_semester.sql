-- Remove fixed_semester column from courses table
-- Semester is now only stored in junction tables (specialization_courses, sub_specialization_courses)

-- Drop index first (if exists)
DROP INDEX IF EXISTS idx_course_fixed_semester ON courses;

-- Remove the column
ALTER TABLE courses DROP COLUMN fixed_semester;
