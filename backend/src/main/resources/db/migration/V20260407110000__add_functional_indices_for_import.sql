-- ===========================================================
-- Add Functional Indices for High Performance Imports
-- Created: 2026-04-07 11:00:00
-- ===========================================================

-- 1. Index for Courses (Case-Insensitive lookup on code)
CREATE INDEX IF NOT EXISTS idx_courses_code_upper_trim ON courses (UPPER(TRIM(code)));

-- 2. Index for Users (Case-Insensitive lookup on student code)
CREATE INDEX IF NOT EXISTS idx_users_code_upper_trim ON users (UPPER(TRIM(code))) WHERE role = 'STUDENT';

-- 3. Index for Users (Case-Insensitive lookup on username/lecturer code)
CREATE INDEX IF NOT EXISTS idx_users_username_upper_trim ON users (UPPER(TRIM(username)));

-- 4. Index for Class Sections (Case-Insensitive lookup on class name)
CREATE INDEX IF NOT EXISTS idx_class_sections_name_upper_trim ON class_sections (UPPER(TRIM(class_name)));
