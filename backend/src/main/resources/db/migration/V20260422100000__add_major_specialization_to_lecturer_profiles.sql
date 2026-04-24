-- Add major_id and specialization_id columns to lecturer_profiles
-- to support teaching major/specialization assignment (like student profiles)

ALTER TABLE lecturer_profiles
    ADD COLUMN IF NOT EXISTS major_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS specialization_id BIGINT NULL;

-- Add FK constraints (nullable: lecturers may not have major/spec assigned yet)
ALTER TABLE lecturer_profiles
    DROP CONSTRAINT IF EXISTS fk_lp_major,
    DROP CONSTRAINT IF EXISTS fk_lp_specialization;

ALTER TABLE lecturer_profiles
    ADD CONSTRAINT fk_lp_major FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_lp_specialization FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE SET NULL;
