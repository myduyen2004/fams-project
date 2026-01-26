-- ===========================================================
-- UNIFY SCHEMA WITH ENTITIES (FULL SYNC)
-- Created: 2026-01-26 20:30:00
-- ===========================================================

-- 1. Synchronization for 'courses'
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- 2. Synchronization for 'majors'
-- Rename duration_years to program_duration to match Major.java (@Column(name = "program_duration"))
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'majors' AND column_name = 'duration_years') THEN
        ALTER TABLE majors RENAME COLUMN duration_years TO program_duration;
    END IF;
END $$;

-- Ensure program_duration is VARCHAR(50) (matching String in Java)
ALTER TABLE majors ALTER COLUMN program_duration TYPE VARCHAR(50);

-- Remove redundant total_credits (Entity doesn't have this field)
ALTER TABLE majors DROP COLUMN IF EXISTS total_credits;

-- 3. Synchronization for 'specializations'
-- Remove redundant total_credits (Entity uses @Formula, not a persistent column)
ALTER TABLE specializations DROP COLUMN IF EXISTS total_credits;

-- 4. Synchronization for 'student_profiles' (Fix potential naming issues)
ALTER TABLE student_profiles ALTER COLUMN gpa TYPE DOUBLE PRECISION;