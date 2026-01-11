-- Rename columns in student_profiles table to match entity definitions
ALTER TABLE student_profiles RENAME COLUMN major TO major_id;

ALTER TABLE student_profiles
RENAME COLUMN specialization TO specialization_id;

ALTER TABLE student_profiles
RENAME COLUMN sub_specialization TO sub_specialization_id;