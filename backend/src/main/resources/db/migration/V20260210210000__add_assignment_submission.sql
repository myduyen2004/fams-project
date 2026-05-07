-- Assignment Feature v2: proper assignments table + submissions

-- 1. Create assignments table (giảng viên tạo bài tập)
CREATE TABLE IF NOT EXISTS assignments (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    class_name VARCHAR(50) NOT NULL REFERENCES class_sections(class_name),
    created_by BIGINT NOT NULL REFERENCES users(id),
    due_date TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    reference_url VARCHAR(500),
    reference_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_class ON assignments(class_name);
CREATE INDEX IF NOT EXISTS idx_assignment_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignment_status ON assignments(status);

-- 2. Create assignment_submissions table (sinh viên nộp bài)
CREATE TABLE IF NOT EXISTS assignment_submissions (
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

CREATE INDEX IF NOT EXISTS idx_assignment_sub_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_sub_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_sub_enrollment ON assignment_submissions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_sub_status ON assignment_submissions(status);

-- 3. Remove old assignment columns from timetable_slots (if they exist)
ALTER TABLE timetable_slots DROP COLUMN IF EXISTS assignment_enabled;
ALTER TABLE timetable_slots DROP COLUMN IF EXISTS assignment_due_date;
