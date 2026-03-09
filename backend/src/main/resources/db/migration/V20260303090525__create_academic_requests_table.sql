-- V20260303085438__create_academic_requests_table.sql
-- Create academic_requests table

CREATE TABLE IF NOT EXISTS academic_requests (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    request_title VARCHAR(255) NOT NULL,
    semester_id BIGINT,
    course_id BIGINT,
    class_section_id VARCHAR(50),
    to_class_name VARCHAR(100),
    to_major VARCHAR(100),
    to_specialization VARCHAR(100),
    to_sub_specialization VARCHAR(100),
    reason TEXT,
    note TEXT,
    file_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    start_date DATE,
    due_date DATE,
    approver_id BIGINT,
    approved_at TIMESTAMP NULL,
    approver_note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_academic_request_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_academic_request_semester FOREIGN KEY (semester_id) REFERENCES semesters (id) ON DELETE SET NULL,
    CONSTRAINT fk_academic_request_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL,
    CONSTRAINT fk_academic_request_class_section FOREIGN KEY (class_section_id) REFERENCES class_sections (class_name) ON DELETE SET NULL,
    CONSTRAINT fk_academic_request_approver FOREIGN KEY (approver_id) REFERENCES users (id) ON DELETE SET NULL
);

-- Note: We use conditional index creation (IF NOT EXISTS) due to repeated execution possibilities
CREATE INDEX IF NOT EXISTS idx_academic_request_student ON academic_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_academic_request_type ON academic_requests (request_type);
CREATE INDEX IF NOT EXISTS idx_academic_request_status ON academic_requests (status);
CREATE INDEX IF NOT EXISTS idx_academic_request_semester ON academic_requests (semester_id);
