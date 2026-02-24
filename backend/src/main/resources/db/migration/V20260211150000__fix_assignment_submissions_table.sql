-- Fix assignment_submissions table schema
-- The previous migration skipped creating this table because it already existed with the old schema.
-- We drop and recreate it to ensure it has assignment_id coverage.

DROP TABLE IF EXISTS assignment_submissions CASCADE;

CREATE TABLE assignment_submissions (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id),
    student_id BIGINT NOT NULL REFERENCES users(id),
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id),
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_assignment_student UNIQUE (assignment_id, student_id)
);

-- Add timetable_slot_id to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS timetable_slot_id BIGINT REFERENCES timetable_slots(id);
CREATE INDEX IF NOT EXISTS idx_assignment_slot ON assignments(timetable_slot_id);

CREATE INDEX idx_assignment_sub_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_sub_student ON assignment_submissions(student_id);
CREATE INDEX idx_assignment_sub_enrollment ON assignment_submissions(enrollment_id);
CREATE INDEX idx_assignment_sub_status ON assignment_submissions(status);
