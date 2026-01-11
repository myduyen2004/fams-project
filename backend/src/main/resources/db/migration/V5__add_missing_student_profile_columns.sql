-- Ensure student_profiles has all required columns

DO $$
BEGIN
    -- Rename major to major_id if major exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'major') THEN
        ALTER TABLE student_profiles RENAME COLUMN major TO major_id;
    END IF;

    -- Add major_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'major_id') THEN
        ALTER TABLE student_profiles ADD COLUMN major_id BIGINT;
    END IF;

    -- Rename specialization to specialization_id if specialization exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'specialization') THEN
        ALTER TABLE student_profiles RENAME COLUMN specialization TO specialization_id;
    END IF;

    -- Add specialization_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'specialization_id') THEN
        ALTER TABLE student_profiles ADD COLUMN specialization_id BIGINT;
    END IF;

    -- Rename sub_specialization to sub_specialization_id if sub_specialization exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'student_profiles' AND column_name = 'sub_specialization') THEN
        ALTER TABLE student_profiles RENAME COLUMN sub_specialization TO sub_specialization_id;
    END IF;

    -- Add sub_specialization_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'sub_specialization_id') THEN
        ALTER TABLE student_profiles ADD COLUMN sub_specialization_id BIGINT;
    END IF;
END $$;