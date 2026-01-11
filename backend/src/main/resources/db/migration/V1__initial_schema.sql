-- ===========================================================
-- FAMS CONSOLIDATED INITIAL SCHEMA (v1.1)
-- This file replaces all previous migrations (V1-V8)
-- Made re-runnable with IF NOT EXISTS and Column repairs
-- ===========================================================

-- ===========================================================
-- 1. UTILS AND EXTENSIONS
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 1 (Utils)';

-- Auto-update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===========================================================
-- 2. USERS AND AUTHENTICATION
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 2 (Users)';

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(150) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE,
    dob DATE,
    phone VARCHAR(20),
    avatar VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- ADMIN, ACADEMIC_STAFF, LECTURER, STUDENT
    status VARCHAR(20) NOT NULL, -- ACTIVE, INACTIVE, LOCKED
    face_data_status VARCHAR(20), -- REGISTERED, NOT_REGISTERED
    is_password_changed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Repair users table columns if it already existed
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_password_changed BOOLEAN DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS face_data_status VARCHAR(20);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS lecturer_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bio TEXT,
    department VARCHAR(100),
    expertise VARCHAR(500)
);

-- ===========================================================
-- 3. ACADEMIC STRUCTURE (MAJORS, SPECIALIZATIONS)
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 3 (Academic)';

CREATE TABLE IF NOT EXISTS majors (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_credits INTEGER DEFAULT 0,
    duration_years INTEGER DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS specializations (
    id BIGSERIAL PRIMARY KEY,
    major_id BIGINT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_credits INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_specializations (
    id BIGSERIAL PRIMARY KEY,
    specialization_id BIGINT NOT NULL REFERENCES specializations (id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    major_id BIGINT REFERENCES majors (id),
    specialization_id BIGINT REFERENCES specializations (id),
    sub_specialization_id BIGINT REFERENCES sub_specializations (id),
    course VARCHAR(20),
    gpa DOUBLE PRECISION
);

-- ===========================================================
-- 4. SEMESTERS AND COURSES
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 4 (Semesters)';

CREATE TABLE IF NOT EXISTS semesters (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    credits INTEGER DEFAULT 3,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_sections (
    id BIGSERIAL PRIMARY KEY,
    class_name VARCHAR(50) UNIQUE NOT NULL,
    course_id BIGINT NOT NULL REFERENCES courses (id),
    lecturer_id BIGINT REFERENCES users (id),
    semester_id BIGINT NOT NULL REFERENCES semesters (id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================
-- 5. MONITORING AND DASHBOARD
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 5 (Dashboard)';

CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL, -- INFO, SUCCESS, WARNING, ERROR
    source VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    level VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, CRITICAL
    type VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    user_id BIGINT REFERENCES users (id),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    location VARCHAR(100),
    status VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    access_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    province VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    login_time TIMESTAMP NOT NULL,
    last_activity_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    user_agent VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    sender_id BIGINT REFERENCES users (id),
    target_type VARCHAR(20) NOT NULL DEFAULT 'ALL',
    target_roles VARCHAR(200),
    target_class_name VARCHAR(50) REFERENCES class_sections (class_name),
    target_course_id BIGINT REFERENCES courses (id),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Repair notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS notification_recipients (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP
);

-- ===========================================================
-- 6. AI CHAT AND ATTENDANCE
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 6 (AI/Attendance)';

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_message_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES ai_chat_sessions (id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- USER, ASSISTANT
    is_error BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_slots (
    id BIGSERIAL PRIMARY KEY,
    class_section_id BIGINT NOT NULL REFERENCES class_sections (id),
    room_id BIGINT,
    day_of_week INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id BIGSERIAL PRIMARY KEY,
    timetable_slot_id BIGINT NOT NULL REFERENCES timetable_slots (id),
    lecturer_id BIGINT NOT NULL REFERENCES users (id),
    opened_at TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    qr_code_data VARCHAR(500),
    qr_expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_attendances (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES attendance_sessions (id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- PRESENT, ABSENT, LATE
    check_in_time TIMESTAMP,
    method VARCHAR(20), -- QR, FACE, MANUAL
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================
-- 7. IMPORT TRACKING
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 7 (Import)';

CREATE TABLE IF NOT EXISTS import_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    entity_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'COMPLETED'
);

CREATE TABLE IF NOT EXISTS import_detail (
    id BIGSERIAL PRIMARY KEY,
    import_history_id BIGINT NOT NULL REFERENCES import_history (id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_data TEXT,
    error_message TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS'
);

-- ===========================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 8 (Triggers)';

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_majors_updated_at ON majors;

CREATE TRIGGER trg_majors_updated_at BEFORE UPDATE ON majors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_specializations_updated_at ON specializations;

CREATE TRIGGER trg_specializations_updated_at BEFORE UPDATE ON specializations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sub_specializations_updated_at ON sub_specializations;

CREATE TRIGGER trg_sub_specializations_updated_at BEFORE UPDATE ON sub_specializations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_semesters_updated_at ON semesters;

CREATE TRIGGER trg_semesters_updated_at BEFORE UPDATE ON semesters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_class_sections_updated_at ON class_sections;

CREATE TRIGGER trg_class_sections_updated_at BEFORE UPDATE ON class_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_chat_sessions_updated_at ON ai_chat_sessions;

CREATE TRIGGER trg_ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_timetable_slots_updated_at ON timetable_slots;

CREATE TRIGGER trg_timetable_slots_updated_at BEFORE UPDATE ON timetable_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================
-- 9. INITIAL SEED DATA
-- ===========================================================
RAISE NOTICE 'Flyway: Starting section 9 (Seed)';

-- Passwords are 'admin123' hashed with BCrypt
INSERT INTO
    users (
        username,
        password,
        email,
        full_name,
        code,
        role,
        status,
        is_password_changed
    )
VALUES (
        'admin',
        '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.TVu4sO/',
        'admin@fams.edu.vn',
        'System Administrator',
        'ADMIN002',
        'ADMIN',
        'ACTIVE',
        true
    )
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Flyway: Migration V1 completed successfully';