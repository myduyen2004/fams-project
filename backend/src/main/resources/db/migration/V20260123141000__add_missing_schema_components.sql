-- ===========================================================
-- FAMS ADDITIONAL SCHEMA COMPONENTS
-- Created: 2026-01-23 14:10:00
-- ===========================================================

-- 1. JUNCTION TABLES FOR COURSES
CREATE TABLE IF NOT EXISTS specialization_courses (
    id BIGSERIAL PRIMARY KEY,
    specialization_id BIGINT NOT NULL REFERENCES specializations (id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    semester INTEGER DEFAULT 1,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (specialization_id, course_id)
);

CREATE TABLE IF NOT EXISTS sub_specialization_courses (
    id BIGSERIAL PRIMARY KEY,
    sub_specialization_id BIGINT NOT NULL REFERENCES sub_specializations (id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    semester INTEGER DEFAULT 1,
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        sub_specialization_id,
        course_id
    )
);

-- 2. ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL REFERENCES class_sections (class_name),
    studentCode VARCHAR(20) NOT NULL,
    student_id BIGINT NOT NULL REFERENCES users (id),
    status VARCHAR(20) NOT NULL DEFAULT 'ENROLLED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_name, student_id)
);

-- 3. CHAT SYSTEM
CREATE TABLE IF NOT EXISTS chat_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    class_name VARCHAR(50) UNIQUE REFERENCES class_sections (class_name),
    created_by_id BIGINT NOT NULL REFERENCES users (id),
    type VARCHAR(20) NOT NULL DEFAULT 'CLASS',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_group_members (
    id BIGSERIAL PRIMARY KEY,
    chat_group_id BIGINT NOT NULL REFERENCES chat_groups (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    UNIQUE (chat_group_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    chat_group_id BIGINT NOT NULL REFERENCES chat_groups (id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users (id),
    content TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(255),
    reply_to_id BIGINT REFERENCES chat_messages (id),
    is_deleted BOOLEAN DEFAULT FALSE,
    sentAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_message_reads (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (message_id, user_id)
);

-- 4. ATTENDANCE & LOCATION
CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    isPresent BOOLEAN NOT NULL,
    session VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_configs (
    id BIGSERIAL PRIMARY KEY,
    configKey VARCHAR(50) UNIQUE NOT NULL DEFAULT 'SYSTEM_CONFIG',
    qrEnabled BOOLEAN NOT NULL DEFAULT TRUE,
    qrExpireSeconds INTEGER NOT NULL DEFAULT 30,
    faceRecognitionEnabled BOOLEAN NOT NULL DEFAULT TRUE,
    faceMatchThreshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    wifiLocationEnabled BOOLEAN NOT NULL DEFAULT FALSE,
    wifiRssiThreshold INTEGER NOT NULL DEFAULT -70,
    lateThresholdMinutes INTEGER NOT NULL DEFAULT 15,
    absentThresholdMinutes INTEGER NOT NULL DEFAULT 30,
    minAttendancePercentage DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wifi_access_points (
    id BIGSERIAL PRIMARY KEY,
    ssid VARCHAR(100) NOT NULL,
    bssid VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100),
    location VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_wifi_access_points (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms (id),
    wifi_access_point_id BIGINT NOT NULL REFERENCES wifi_access_points (id),
    signalStrength INTEGER,
    isPrimary BOOLEAN NOT NULL DEFAULT FALSE,
    positionNote VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (room_id, wifi_access_point_id)
);

-- 5. GRADES & EVALUATION
CREATE TABLE IF NOT EXISTS grade_components (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    isRequired BOOLEAN NOT NULL DEFAULT TRUE,
    course_id BIGINT NOT NULL REFERENCES courses (id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_grades (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments (id),
    grade_component_id BIGINT NOT NULL REFERENCES grade_components (id),
    score DOUBLE PRECISION NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 1,
    graded_at TIMESTAMP,
    graded_by_id BIGINT REFERENCES users (id),
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. ASSIGNMENTS & REQUESTS
CREATE TABLE IF NOT EXISTS teaching_assignments (
    id BIGSERIAL PRIMARY KEY,
    lecturer_id BIGINT NOT NULL REFERENCES users (id),
    course_id BIGINT NOT NULL REFERENCES courses (id),
    semester_id BIGINT NOT NULL REFERENCES semesters (id),
    maxClasses INTEGER NOT NULL DEFAULT 3,
    assignedClasses INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        lecturer_id,
        course_id,
        semester_id
    )
);

CREATE TABLE IF NOT EXISTS schedule_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users (id),
    class_name VARCHAR(50) NOT NULL REFERENCES class_sections (class_name),
    original_slot_id BIGINT REFERENCES timetable_slots (id),
    requested_slot_id BIGINT REFERENCES timetable_slots (id),
    requested_room_id BIGINT REFERENCES rooms (id),
    type VARCHAR(20) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approver_id BIGINT REFERENCES users (id),
    approved_at TIMESTAMP,
    approverNote VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. IMPORT JOBS
CREATE TABLE IF NOT EXISTS import_jobs (
    id BIGSERIAL PRIMARY KEY,
    jobId VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    filename VARCHAR(255),
    totalRecords INTEGER,
    processedRecords INTEGER DEFAULT 0,
    successCount INTEGER DEFAULT 0,
    failedCount INTEGER DEFAULT 0,
    statusMessage VARCHAR(255),
    errorMessage TEXT,
    createdBy VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP NOT NULL,
    startedAt TIMESTAMP,
    completedAt TIMESTAMP
);

-- 8. UPDATING EXISTING TABLES
ALTER TABLE student_attendances
ADD COLUMN IF NOT EXISTS face_confidence DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS wifi_bssid VARCHAR(17),
ADD COLUMN IF NOT EXISTS wifi_rssi INTEGER,
ADD COLUMN IF NOT EXISTS updated_by_id BIGINT REFERENCES users (id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 9. ADDITIONAL INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollment_class_name ON enrollments (class_name);

CREATE INDEX IF NOT EXISTS idx_enrollment_student_code ON enrollments (studentCode);

CREATE INDEX IF NOT EXISTS idx_enrollment_student ON enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_session ON student_attendances (session_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON student_attendances (student_id);

-- 10. ADDITIONAL TRIGGERS
DROP TRIGGER IF EXISTS trg_specialization_courses_updated_at ON specialization_courses;

CREATE TRIGGER trg_specialization_courses_updated_at BEFORE UPDATE ON specialization_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sub_specialization_courses_updated_at ON sub_specialization_courses;

CREATE TRIGGER trg_sub_specialization_courses_updated_at BEFORE UPDATE ON sub_specialization_courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_enrollments_updated_at ON enrollments;

CREATE TRIGGER trg_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_attendance_configs_updated_at ON attendance_configs;

CREATE TRIGGER trg_attendance_configs_updated_at BEFORE UPDATE ON attendance_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wifi_access_points_updated_at ON wifi_access_points;

CREATE TRIGGER trg_wifi_access_points_updated_at BEFORE UPDATE ON wifi_access_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_room_wifi_access_points_updated_at ON room_wifi_access_points;

CREATE TRIGGER trg_room_wifi_access_points_updated_at BEFORE UPDATE ON room_wifi_access_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_grade_components_updated_at ON grade_components;

CREATE TRIGGER trg_grade_components_updated_at BEFORE UPDATE ON grade_components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_student_grades_updated_at ON student_grades;

CREATE TRIGGER trg_student_grades_updated_at BEFORE UPDATE ON student_grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_teaching_assignments_updated_at ON teaching_assignments;

CREATE TRIGGER trg_teaching_assignments_updated_at BEFORE UPDATE ON teaching_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_schedule_requests_updated_at ON schedule_requests;

CREATE TRIGGER trg_schedule_requests_updated_at BEFORE UPDATE ON schedule_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();