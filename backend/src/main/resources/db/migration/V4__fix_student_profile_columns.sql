-- Fix V3 migration failure: rename major column if it exists
-- V3 failed because specialization column didn't exist, but major was already renamed

DO $$
BEGIN
    -- Add major_id column if it doesn't exist and major exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'major') THEN
        ALTER TABLE student_profiles RENAME COLUMN major TO major_id;
    END IF;

    -- Add specialization_id column if it doesn't exist and specialization exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'specialization') THEN
        ALTER TABLE student_profiles RENAME COLUMN specialization TO specialization_id;
    END IF;

    -- Add sub_specialization_id column if it doesn't exist and sub_specialization exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'sub_specialization') THEN
        ALTER TABLE student_profiles RENAME COLUMN sub_specialization TO sub_specialization_id;
    END IF;
END $$;