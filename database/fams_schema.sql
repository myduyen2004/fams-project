-- =====================================================================
-- FAMS (Flexible Academic Management System) - Database Schema
-- PostgreSQL DDL Script
-- Generated from JPA Entities: 2026-03-26
-- =====================================================================

-- =====================================================================
-- 1. USER MANAGEMENT MODULE
-- =====================================================================

CREATE TABLE users (
    id                             BIGSERIAL PRIMARY KEY,
    code                           VARCHAR(50) UNIQUE,
    username                       VARCHAR(50) UNIQUE,
    password                       VARCHAR(255),
    full_name                      VARCHAR(150) NOT NULL,
    email                          VARCHAR(150) NOT NULL UNIQUE,
    dob                            DATE,
    phone                          VARCHAR(20),
    role                           VARCHAR(50) NOT NULL,       -- ADMIN, ACADEMIC_STAFF, LECTURER, STUDENT
    status                         VARCHAR(20) NOT NULL,       -- ACTIVE, INACTIVE, LOCKED
    face_data_status               VARCHAR(20),                -- REGISTERED, NOT_REGISTERED
    avatar                         VARCHAR(255),
    face_registration_attempts     INT NOT NULL DEFAULT 0,
    face_registration_blocked_until TIMESTAMP,
    is_password_changed            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_full_name ON users (full_name);
CREATE INDEX idx_user_code ON users (code);
CREATE INDEX idx_user_role ON users (role);
CREATE INDEX idx_user_status_role ON users (status, role);

-- Student Profile (1:1 with users)
CREATE TABLE student_profiles (
    user_id              BIGINT PRIMARY KEY REFERENCES users(id),
    course               VARCHAR(20),
    gpa                  DOUBLE PRECISION,
    major_id             BIGINT,
    specialization_id    BIGINT,
    sub_specialization_id BIGINT
);

-- Lecturer Profile (1:1 with users)
CREATE TABLE lecturer_profiles (
    user_id    BIGINT PRIMARY KEY REFERENCES users(id),
    department VARCHAR(100),
    expertise  VARCHAR(100),
    bio        TEXT
);

-- Lecturer Grade OTP (1:1 with users)
CREATE TABLE lecturer_grade_otps (
    user_id      BIGINT PRIMARY KEY REFERENCES users(id),
    otp_hash     VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- User Permissions
CREATE TABLE user_permissions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    permission  VARCHAR(50) NOT NULL,  -- MANAGE_MAJORS, MANAGE_COURSES, MANAGE_USERS, MANAGE_SEMESTERS, VIEW_SYSTEM_LOGS, MANAGE_SCHEDULE, MANAGE_NOTIFICATIONS
    granted_by  BIGINT REFERENCES users(id),
    granted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_permission_user ON user_permissions (user_id);
CREATE UNIQUE INDEX idx_user_permission_unique ON user_permissions (user_id, permission);

-- User Device Tokens (FCM Push Notifications)
CREATE TABLE user_device_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    token      VARCHAR(255) NOT NULL,
    platform   VARCHAR(50),   -- android, ios, web
    device_id  VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_user ON user_device_tokens (user_id);
CREATE INDEX idx_token_value ON user_device_tokens (token);

-- Face Encodings (1:N with users)
CREATE TABLE face_encodings (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id),
    encoding_data     BYTEA NOT NULL,
    registered_at     TIMESTAMP NOT NULL,
    liveness_verified BOOLEAN NOT NULL DEFAULT TRUE,
    face_image        TEXT,  -- LONGTEXT → TEXT in PostgreSQL
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_face_encodings_user_id ON face_encodings (user_id);


-- =====================================================================
-- 2. ACADEMIC STRUCTURE MODULE
-- =====================================================================

-- Majors (Ngành học)
CREATE TABLE majors (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(20) NOT NULL UNIQUE,
    name             VARCHAR(200) NOT NULL,
    description      TEXT,
    program_duration VARCHAR(50),
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_major_code ON majors (code);
CREATE INDEX idx_major_name ON majors (name);

-- Specializations (Chuyên ngành)
CREATE TABLE specializations (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE
    major_id    BIGINT NOT NULL REFERENCES majors(id),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_specialization_code ON specializations (code);
CREATE INDEX idx_specialization_name ON specializations (name);
CREATE INDEX idx_specialization_major ON specializations (major_id);

-- Sub-Specializations (Chuyên ngành hẹp/Combo)
CREATE TABLE sub_specializations (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(20) NOT NULL UNIQUE,
    name               VARCHAR(200) NOT NULL,
    description        TEXT,
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE
    specialization_id  BIGINT NOT NULL REFERENCES specializations(id),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sub_specialization_code ON sub_specializations (code);
CREATE INDEX idx_sub_specialization_name ON sub_specializations (name);
CREATE INDEX idx_sub_specialization_spec ON sub_specializations (specialization_id);

-- Add FK to student_profiles after structure tables exist
ALTER TABLE student_profiles ADD CONSTRAINT fk_student_major FOREIGN KEY (major_id) REFERENCES majors(id);
ALTER TABLE student_profiles ADD CONSTRAINT fk_student_specialization FOREIGN KEY (specialization_id) REFERENCES specializations(id);
ALTER TABLE student_profiles ADD CONSTRAINT fk_student_sub_specialization FOREIGN KEY (sub_specialization_id) REFERENCES sub_specializations(id);

-- Courses (Môn học)
CREATE TABLE courses (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(20) NOT NULL UNIQUE,
    name                  VARCHAR(200) NOT NULL,
    description           TEXT,
    credits               INT NOT NULL,
    number_of_slots       INT NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE
    is_calculated_in_gpa  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_course_code ON courses (code);
CREATE INDEX idx_course_name ON courses (name);

-- Course Prerequisites (Self-join Many-to-Many)
CREATE TABLE course_prerequisites (
    course_id       BIGINT NOT NULL REFERENCES courses(id),
    prerequisite_id BIGINT NOT NULL REFERENCES courses(id),
    PRIMARY KEY (course_id, prerequisite_id)
);

-- Specialization ↔ Course (Junction Table)
CREATE TABLE specialization_courses (
    id                BIGSERIAL PRIMARY KEY,
    specialization_id BIGINT NOT NULL REFERENCES specializations(id),
    course_id         BIGINT NOT NULL REFERENCES courses(id),
    order_index       INT DEFAULT 0,
    semester          INT DEFAULT 1,
    note              VARCHAR(500),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_specialization_course UNIQUE (specialization_id, course_id)
);

CREATE INDEX idx_spec_course_spec ON specialization_courses (specialization_id);
CREATE INDEX idx_spec_course_course ON specialization_courses (course_id);

-- SubSpecialization ↔ Course (Junction Table)
CREATE TABLE sub_specialization_courses (
    id                     BIGSERIAL PRIMARY KEY,
    sub_specialization_id  BIGINT NOT NULL REFERENCES sub_specializations(id),
    course_id              BIGINT NOT NULL REFERENCES courses(id),
    order_index            INT DEFAULT 0,
    semester               INT DEFAULT 1,
    note                   VARCHAR(500),
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_sub_specialization_course UNIQUE (sub_specialization_id, course_id)
);

CREATE INDEX idx_sub_spec_course_sub_spec ON sub_specialization_courses (sub_specialization_id);
CREATE INDEX idx_sub_spec_course_course ON sub_specialization_courses (course_id);

-- Grade Components (Điểm thành phần của môn)
CREATE TABLE grade_components (
    id                     BIGSERIAL PRIMARY KEY,
    name                   VARCHAR(100) NOT NULL,
    description            TEXT,
    type                   VARCHAR(50) NOT NULL,  -- PROGRESS_TEST, ASSIGNMENT, QUIZ, WORKSHOP, PARTICIPATION, MID_TERM, PRACTICAL_EXAM, FINAL_EXAM, PROJECT, PRESENTATION, RESIT, OTHER
    weight                 DOUBLE PRECISION NOT NULL,
    is_resit               BOOLEAN NOT NULL DEFAULT FALSE,
    reference_component_id BIGINT REFERENCES grade_components(id),
    course_id              BIGINT NOT NULL REFERENCES courses(id),
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grade_component_course ON grade_components (course_id);


-- =====================================================================
-- 3. SEMESTER & SCHEDULING MODULE
-- =====================================================================

-- Semesters (Học kỳ)
CREATE TABLE semesters (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',  -- UPCOMING, ONGOING, COMPLETED
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_semester_code ON semesters (code);
CREATE INDEX idx_semester_name ON semesters (name);
CREATE INDEX idx_semester_start_date ON semesters (start_date);
CREATE INDEX idx_semester_end_date ON semesters (end_date);

-- Semester Config (1:1 with Semester)
CREATE TABLE semester_configs (
    id                       BIGSERIAL PRIMARY KEY,
    semester_id              BIGINT NOT NULL UNIQUE REFERENCES semesters(id),
    max_slot_per_day         INT NOT NULL,
    slot_per_subject_per_week INT NOT NULL,
    slot_duration            INT NOT NULL,     -- phút (90, 120)
    is_published             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Semester Weekdays
CREATE TABLE semester_weekdays (
    id          BIGSERIAL PRIMARY KEY,
    semester_id BIGINT NOT NULL REFERENCES semesters(id),
    weekday     INT NOT NULL,  -- 2 = Monday ... 8 = Sunday
    CONSTRAINT uk_semester_weekday UNIQUE (semester_id, weekday)
);

-- Holidays
CREATE TABLE holidays (
    id           BIGSERIAL PRIMARY KEY,
    semester_id  BIGINT REFERENCES semesters(id),  -- NULL = system-wide
    holiday_date DATE NOT NULL,
    description  VARCHAR(255),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE
);

-- Slot Types (Loại slot trong kỳ)
CREATE TABLE slot_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    slot_index  INT NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    description VARCHAR(255),
    semester_id BIGINT NOT NULL REFERENCES semesters(id),
    duration    VARCHAR(20) NOT NULL DEFAULT 'MINUTES_90',  -- MINUTES_90, MINUTES_135
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_semester_slot UNIQUE (semester_id, slot_index)
);

CREATE INDEX idx_slot_type_semester ON slot_types (semester_id);
CREATE INDEX idx_slot_type_name ON slot_types (name);

-- Rooms (Phòng học)
CREATE TABLE rooms (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(20) NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL,
    capacity      INT NOT NULL,
    building      VARCHAR(50),
    description   VARCHAR(500),
    floor         INT,
    grid_row      INT,
    grid_col      INT,
    grid_row_span INT DEFAULT 1,
    grid_col_span INT DEFAULT 1,
    type          VARCHAR(20) NOT NULL DEFAULT 'CLASSROOM',    -- PSEUDO_ROOM, CLASSROOM, COMPUTER_LAB
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',       -- ACTIVE, MAINTENANCE, INACTIVE, AVAILABLE
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_room_code ON rooms (code);
CREATE INDEX idx_room_building ON rooms (building);
CREATE INDEX idx_room_type ON rooms (type);

-- WiFi Access Points
CREATE TABLE wifi_access_points (
    id         BIGSERIAL PRIMARY KEY,
    ssid       VARCHAR(100) NOT NULL,
    bssid      VARCHAR(17) NOT NULL UNIQUE,
    name       VARCHAR(100),
    location   VARCHAR(200),
    status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, INACTIVE
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wifi_ssid ON wifi_access_points (ssid);
CREATE INDEX idx_wifi_bssid ON wifi_access_points (bssid);

-- Room ↔ WiFi Access Point (Junction Table)
CREATE TABLE room_wifi_access_points (
    id                    BIGSERIAL PRIMARY KEY,
    room_id               BIGINT NOT NULL REFERENCES rooms(id),
    wifi_access_point_id  BIGINT NOT NULL REFERENCES wifi_access_points(id),
    signal_strength       INT,
    is_primary            BOOLEAN NOT NULL DEFAULT FALSE,
    position_note         VARCHAR(200),
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_room_wifi UNIQUE (room_id, wifi_access_point_id)
);

CREATE INDEX idx_room_wifi_room ON room_wifi_access_points (room_id);
CREATE INDEX idx_room_wifi_ap ON room_wifi_access_points (wifi_access_point_id);


-- =====================================================================
-- 4. CLASS MANAGEMENT MODULE
-- =====================================================================

-- Class Sections (Lớp học phần)
CREATE TABLE class_sections (
    class_name                VARCHAR(50) PRIMARY KEY,
    course_id                 BIGINT NOT NULL REFERENCES courses(id),
    semester_id               BIGINT NOT NULL REFERENCES semesters(id),
    lecturer_id               BIGINT REFERENCES users(id),
    number_of_slots           INT NOT NULL DEFAULT 20,
    max_students              INT NOT NULL DEFAULT 30,
    current_enrollment        INT NOT NULL DEFAULT 0,
    status                    VARCHAR(20) NOT NULL DEFAULT 'UPCOMING',  -- UPCOMING, ONGOING, FINISHED
    grades_submitted          BOOLEAN NOT NULL DEFAULT FALSE,
    grades_submitted_at       TIMESTAMP,
    grades_submitted_by       BIGINT REFERENCES users(id),
    grades_published          BOOLEAN NOT NULL DEFAULT FALSE,
    grades_published_at       TIMESTAMP,
    grades_published_by       BIGINT REFERENCES users(id),
    resit_grades_published    BOOLEAN NOT NULL DEFAULT FALSE,
    resit_grades_published_at TIMESTAMP,
    resit_grades_published_by BIGINT REFERENCES users(id),
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_class_section_semester ON class_sections (semester_id);
CREATE INDEX idx_class_section_course ON class_sections (course_id);
CREATE INDEX idx_class_section_lecturer ON class_sections (lecturer_id);

-- Teaching Assignments (Phân công giảng dạy)
CREATE TABLE teaching_assignments (
    id               BIGSERIAL PRIMARY KEY,
    lecturer_id      BIGINT NOT NULL REFERENCES users(id),
    course_id        BIGINT NOT NULL REFERENCES courses(id),
    semester_id      BIGINT NOT NULL REFERENCES semesters(id),
    max_classes      INT NOT NULL DEFAULT 3,
    assigned_classes INT NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, COMPLETED, CANCELLED
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_lecturer_course_semester UNIQUE (lecturer_id, course_id, semester_id)
);

CREATE INDEX idx_teaching_assignment_lecturer ON teaching_assignments (lecturer_id);
CREATE INDEX idx_teaching_assignment_course ON teaching_assignments (course_id);
CREATE INDEX idx_teaching_assignment_semester ON teaching_assignments (semester_id);

-- Enrollments (Đăng ký học)
CREATE TABLE enrollments (
    id           BIGSERIAL PRIMARY KEY,
    class_name   VARCHAR(50) NOT NULL REFERENCES class_sections(class_name),
    student_code VARCHAR(20) NOT NULL,
    student_id   BIGINT NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'ENROLLED',  -- ENROLLED, DROPPED, COMPLETED, FAILED
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_class_student UNIQUE (class_name, student_id)
);

CREATE INDEX idx_enrollment_class_name ON enrollments (class_name);
CREATE INDEX idx_enrollment_student_code ON enrollments (student_code);
CREATE INDEX idx_enrollment_student ON enrollments (student_id);
CREATE INDEX idx_enrollment_status ON enrollments (status);

-- Timetable Slots (Slot thời khóa biểu)
CREATE TABLE timetable_slots (
    id           BIGSERIAL PRIMARY KEY,
    class_name   VARCHAR(50) NOT NULL REFERENCES class_sections(class_name),
    room_id      BIGINT NOT NULL REFERENCES rooms(id),
    slot_type_id BIGINT NOT NULL REFERENCES slot_types(id),
    date         DATE NOT NULL,
    day_of_week  INT NOT NULL,
    slot_number  INT NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',  -- SCHEDULED, CANCELLED, RESCHEDULED, COMPLETED
    note         VARCHAR(500),
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timetable_slot_class ON timetable_slots (class_name);
CREATE INDEX idx_timetable_slot_room ON timetable_slots (room_id);
CREATE INDEX idx_timetable_slot_date ON timetable_slots (date);
CREATE INDEX idx_timetable_slot_day ON timetable_slots (day_of_week);

-- Student Grades (Điểm sinh viên)
CREATE TABLE student_grades (
    id                 BIGSERIAL PRIMARY KEY,
    enrollment_id      BIGINT NOT NULL REFERENCES enrollments(id),
    grade_component_id BIGINT NOT NULL REFERENCES grade_components(id),
    score              DOUBLE PRECISION NOT NULL,
    attempt            INT NOT NULL DEFAULT 1,
    graded_at          TIMESTAMP,
    graded_by_id       BIGINT REFERENCES users(id),
    note               VARCHAR(500),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_grade_enrollment ON student_grades (enrollment_id);
CREATE INDEX idx_student_grade_component ON student_grades (grade_component_id);


-- =====================================================================
-- 5. ATTENDANCE MODULE
-- =====================================================================

-- Attendance Config (singleton)
CREATE TABLE attendance_configs (
    id                          BIGSERIAL PRIMARY KEY,
    config_key                  VARCHAR(50) NOT NULL UNIQUE DEFAULT 'SYSTEM_CONFIG',
    manual_enabled              BOOLEAN NOT NULL DEFAULT TRUE,
    absent_threshold_minutes    INT NOT NULL DEFAULT 30,
    min_attendance_percentage   DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    face_recognition_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    max_attempts                INT NOT NULL DEFAULT 5,
    wifi_location_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Sessions (Phiên điểm danh)
CREATE TABLE attendance_sessions (
    id                BIGSERIAL PRIMARY KEY,
    timetable_slot_id BIGINT NOT NULL REFERENCES timetable_slots(id),
    lecturer_id       BIGINT NOT NULL REFERENCES users(id),
    opened_at         TIMESTAMP NOT NULL,
    closed_at         TIMESTAMP,
    status            VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN, CLOSED
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_session_slot ON attendance_sessions (timetable_slot_id);
CREATE INDEX idx_attendance_session_lecturer ON attendance_sessions (lecturer_id);
CREATE INDEX idx_attendance_session_status ON attendance_sessions (status);

-- Student Attendances (Điểm danh chi tiết)
CREATE TABLE student_attendances (
    id                      BIGSERIAL PRIMARY KEY,
    session_id              BIGINT NOT NULL REFERENCES attendance_sessions(id),
    student_id              BIGINT NOT NULL REFERENCES users(id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'ABSENT',   -- PRESENT, ABSENT, EXCUSED
    method                  VARCHAR(20),                             -- QR_CODE, FACE_RECOGNITION, MANUAL
    check_in_time           TIMESTAMP,
    face_confidence         DOUBLE PRECISION,
    wifi_bssid              VARCHAR(17),
    wifi_rssi               INT,
    note                    VARCHAR(500),
    updated_by_id           BIGINT REFERENCES users(id),
    attempt_count           INT DEFAULT 0,
    failure_reason          VARCHAR(500),
    requires_manual_verify  BOOLEAN DEFAULT FALSE,
    manual_verified_by      BIGINT REFERENCES users(id),
    manual_verified_at      TIMESTAMP,
    captured_face_url       VARCHAR(500),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX idx_student_attendance_session ON student_attendances (session_id);
CREATE INDEX idx_student_attendance_student ON student_attendances (student_id);
CREATE INDEX idx_student_attendance_status ON student_attendances (status);

-- Legacy Attendance (simple table)
CREATE TABLE attendance (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    is_present BOOLEAN NOT NULL,
    session    VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================
-- 6. ASSIGNMENT MODULE
-- =====================================================================

-- Assignments (Bài tập)
CREATE TABLE assignments (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    class_name       VARCHAR(50) NOT NULL REFERENCES class_sections(class_name),
    created_by       BIGINT NOT NULL REFERENCES users(id),
    timetable_slot_id BIGINT REFERENCES timetable_slots(id),
    due_date         TIMESTAMP,
    status           VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN, CLOSED
    reference_url    VARCHAR(500),
    reference_name   VARCHAR(255),
    reminder_sent    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignment_class ON assignments (class_name);
CREATE INDEX idx_assignment_created_by ON assignments (created_by);
CREATE INDEX idx_assignment_status ON assignments (status);

-- Assignment Submissions (Nộp bài)
CREATE TABLE assignment_submissions (
    id               BIGSERIAL PRIMARY KEY,
    assignment_id    BIGINT NOT NULL REFERENCES assignments(id),
    student_id       BIGINT NOT NULL REFERENCES users(id),
    enrollment_id    BIGINT NOT NULL REFERENCES enrollments(id),
    file_url         VARCHAR(2000),
    file_name        VARCHAR(1000),
    note             TEXT,
    lecturer_comment TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',  -- SUBMITTED, NOT_SUBMITTED, OVERDUE
    submitted_at     TIMESTAMP NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_assignment_student UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_assignment_sub_assignment ON assignment_submissions (assignment_id);
CREATE INDEX idx_assignment_sub_student ON assignment_submissions (student_id);
CREATE INDEX idx_assignment_sub_enrollment ON assignment_submissions (enrollment_id);
CREATE INDEX idx_assignment_sub_status ON assignment_submissions (status);


-- =====================================================================
-- 7. CHAT / MESSAGING MODULE
-- =====================================================================

-- Chat Groups
CREATE TABLE chat_groups (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    class_name     VARCHAR(50) UNIQUE REFERENCES class_sections(class_name),
    created_by_id  BIGINT NOT NULL REFERENCES users(id),
    type           VARCHAR(20) NOT NULL DEFAULT 'CLASS',  -- CLASS, COURSE, CUSTOM
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_group_class ON chat_groups (class_name);
CREATE INDEX idx_chat_group_type ON chat_groups (type);

-- Chat Group Members
CREATE TABLE chat_group_members (
    id             BIGSERIAL PRIMARY KEY,
    chat_group_id  BIGINT NOT NULL REFERENCES chat_groups(id),
    user_id        BIGINT NOT NULL REFERENCES users(id),
    role           VARCHAR(20) NOT NULL DEFAULT 'MEMBER',  -- ADMIN, MEMBER
    joined_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at        TIMESTAMP,
    CONSTRAINT uk_group_user UNIQUE (chat_group_id, user_id)
);

CREATE INDEX idx_chat_member_group ON chat_group_members (chat_group_id);
CREATE INDEX idx_chat_member_user ON chat_group_members (user_id);

-- Chat Messages
CREATE TABLE chat_messages (
    id              BIGSERIAL PRIMARY KEY,
    chat_group_id   BIGINT NOT NULL REFERENCES chat_groups(id),
    sender_id       BIGINT NOT NULL REFERENCES users(id),
    content         TEXT,
    type            VARCHAR(20) NOT NULL DEFAULT 'TEXT',  -- TEXT, IMAGE, FILE, LINK, SYSTEM
    attachment_url  VARCHAR(500),
    attachment_name VARCHAR(255),
    reply_to_id     BIGINT REFERENCES chat_messages(id),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_message_group ON chat_messages (chat_group_id);
CREATE INDEX idx_chat_message_sender ON chat_messages (sender_id);
CREATE INDEX idx_chat_message_sent_at ON chat_messages (sent_at);

-- Chat Message Reads
CREATE TABLE chat_message_reads (
    id         BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES chat_messages(id),
    user_id    BIGINT NOT NULL REFERENCES users(id),
    read_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX idx_message_read_message ON chat_message_reads (message_id);
CREATE INDEX idx_message_read_user ON chat_message_reads (user_id);

-- Chat Message Reactions
CREATE TABLE chat_message_reactions (
    id         BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES chat_messages(id),
    user_id    BIGINT NOT NULL REFERENCES users(id),
    emoji      VARCHAR(50) NOT NULL,
    reacted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reaction_message ON chat_message_reactions (message_id);
CREATE INDEX idx_message_reaction_user ON chat_message_reactions (user_id);


-- =====================================================================
-- 8. AI CHATBOT MODULE
-- =====================================================================

-- AI Chat Sessions
CREATE TABLE ai_chat_sessions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    title           VARCHAR(200),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, ARCHIVED
    last_message_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_session_user ON ai_chat_sessions (user_id);
CREATE INDEX idx_ai_session_status ON ai_chat_sessions (status);
CREATE INDEX idx_ai_session_created ON ai_chat_sessions (created_at);

-- AI Chat Messages
CREATE TABLE ai_chat_messages (
    id                 BIGSERIAL PRIMARY KEY,
    session_id         BIGINT NOT NULL REFERENCES ai_chat_sessions(id),
    role               VARCHAR(20) NOT NULL,  -- USER, ASSISTANT
    content            TEXT NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    token_count        INT,
    model_version      VARCHAR(50),
    processing_time_ms BIGINT,
    redirect_path      VARCHAR(255)
);

CREATE INDEX idx_ai_message_session ON ai_chat_messages (session_id);
CREATE INDEX idx_ai_message_role ON ai_chat_messages (role);
CREATE INDEX idx_ai_message_sent_at ON ai_chat_messages (created_at);


-- =====================================================================
-- 9. NOTIFICATION & NEWS MODULE
-- =====================================================================

-- Notifications
CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    content     TEXT NOT NULL,
    type        VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',   -- ASSIGNMENT_DEADLINE, NEW_ASSIGNMENT, SUBMISSION, GRADE_PUBLISHED, SCHEDULE_CHANGE, ATTENDANCE_WARNING, SYSTEM, ACADEMIC, CHAT, NEWS
    target_url  VARCHAR(255),
    target_type VARCHAR(20) NOT NULL DEFAULT 'USER',     -- USER, CLASS, ALL, STUDENT, LECTURER, ACADEMIC_STAFF, ADMIN
    sent_at     TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_type ON notifications (type);
CREATE INDEX idx_notification_sent_at ON notifications (sent_at);

-- News
CREATE TABLE news (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(200) NOT NULL,
    content          TEXT NOT NULL,
    type             VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',    -- SYSTEM, ACADEMIC, ATTENDANCE, GRADE, CHAT, SCHEDULE, EVENT, FEATURED, IMPORTANT, OTHER
    priority         VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',    -- LOW, MEDIUM, HIGH, URGENT
    sender_id        BIGINT REFERENCES users(id),
    target_url       VARCHAR(255),
    target_type      VARCHAR(20) NOT NULL DEFAULT 'ALL',       -- ALL, STUDENT, LECTURER, ACADEMIC_STAFF, ADMIN, USER
    target_class_name VARCHAR(100),
    scheduled_at     TIMESTAMP,
    sent_at          TIMESTAMP,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',     -- DRAFT, SCHEDULED, SENT
    thumbnail_image  VARCHAR(500),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_sender ON news (sender_id);
CREATE INDEX idx_news_type ON news (type);
CREATE INDEX idx_news_status ON news (status);
CREATE INDEX idx_news_sent_at ON news (sent_at);

-- News Attachments (ElementCollection)
CREATE TABLE news_attachments (
    news_id BIGINT NOT NULL REFERENCES news(id),
    url     TEXT
);


-- =====================================================================
-- 10. REQUEST MANAGEMENT MODULE
-- =====================================================================

-- Academic Requests (Yêu cầu học thuật)
CREATE TABLE academic_requests (
    id                    BIGSERIAL PRIMARY KEY,
    student_id            BIGINT NOT NULL REFERENCES users(id),
    request_type          VARCHAR(50) NOT NULL,  -- PAUSE_SEMESTER, RETAKE_COURSE, CHANGE_CLASS, OVERLOAD_STUDY, ABSENT_REQUEST, GRADE_APPEAL, CHANGE_MAJOR, CHANGE_SPECIALIZATION, OTHERS
    request_title         VARCHAR(255) NOT NULL,
    semester_id           BIGINT REFERENCES semesters(id),
    course_id             BIGINT REFERENCES courses(id),
    class_section_id      VARCHAR(50) REFERENCES class_sections(class_name),
    to_class_name         VARCHAR(100),
    to_major              VARCHAR(100),
    to_specialization     VARCHAR(100),
    to_sub_specialization VARCHAR(100),
    reason                TEXT,
    note                  TEXT,
    file_url              VARCHAR(500),
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, CANCELLED
    start_date            DATE,
    due_date              DATE,
    approver_id           BIGINT REFERENCES users(id),
    approved_at           TIMESTAMP,
    approver_note         VARCHAR(500),
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_academic_request_student ON academic_requests (student_id);
CREATE INDEX idx_academic_request_type ON academic_requests (request_type);
CREATE INDEX idx_academic_request_status ON academic_requests (status);
CREATE INDEX idx_academic_request_semester ON academic_requests (semester_id);

-- Schedule Requests (Yêu cầu thay đổi lịch)
CREATE TABLE schedule_requests (
    id                    BIGSERIAL PRIMARY KEY,
    requester_id          BIGINT NOT NULL REFERENCES users(id),
    class_name            VARCHAR(50) NOT NULL REFERENCES class_sections(class_name),
    original_slot_id      BIGINT REFERENCES timetable_slots(id),
    requested_slot_id     BIGINT REFERENCES timetable_slots(id),
    requested_room_id     BIGINT REFERENCES rooms(id),
    type                  VARCHAR(20) NOT NULL,  -- RESCHEDULE, CANCEL, SWAP, ROOM_CHANGE
    requested_date        DATE,
    requested_slot_number INT,
    reason                TEXT,
    file                  TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED, REVOKED
    approver_id           BIGINT REFERENCES users(id),
    approved_at           TIMESTAMP,
    approver_note         VARCHAR(500),
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedule_request_requester ON schedule_requests (requester_id);
CREATE INDEX idx_schedule_request_class ON schedule_requests (class_name);
CREATE INDEX idx_schedule_request_status ON schedule_requests (status);


-- =====================================================================
-- 11. SYSTEM & LOGGING MODULE
-- =====================================================================

-- Access Logs
CREATE TABLE access_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    location    VARCHAR(100) NOT NULL,
    status      VARCHAR(50) NOT NULL,
    access_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(255)
);

-- User Sessions
CREATE TABLE user_sessions (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES users(id),
    ip_address         VARCHAR(45),
    province           VARCHAR(100),
    city               VARCHAR(100),
    latitude           NUMERIC(10, 8),
    longitude          NUMERIC(11, 8),
    login_time         TIMESTAMP NOT NULL,
    last_activity_time TIMESTAMP NOT NULL,
    is_active          BOOLEAN DEFAULT TRUE,
    user_agent         VARCHAR(500)
);

-- Alerts (Cảnh báo hệ thống)
CREATE TABLE alerts (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    level       VARCHAR(20) NOT NULL,   -- INFO, WARNING, ERROR, CRITICAL
    type        VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',  -- SYSTEM, ATTENDANCE, SECURITY, GRADE, SCHEDULE
    user_id     BIGINT REFERENCES users(id),
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_user ON alerts (user_id);
CREATE INDEX idx_alert_level ON alerts (level);
CREATE INDEX idx_alert_resolved ON alerts (is_resolved);

-- System Logs
CREATE TABLE system_logs (
    id           BIGSERIAL PRIMARY KEY,
    title        VARCHAR(200) NOT NULL,
    description  TEXT NOT NULL,
    type         VARCHAR(20) NOT NULL,   -- INFO, SUCCESS, WARNING, ERROR
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source       VARCHAR(100),
    ip_address   VARCHAR(50),
    user_agent   TEXT,
    old_value    TEXT,
    new_value    TEXT,
    performer_id BIGINT REFERENCES users(id)
);

-- Import Jobs
CREATE TABLE import_jobs (
    id                BIGSERIAL PRIMARY KEY,
    job_id            VARCHAR(255) NOT NULL UNIQUE,
    type              VARCHAR(20) NOT NULL,   -- EXCEL_ONLY, ZIP_FULL, AVATAR_UPLOAD
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    filename          VARCHAR(255),
    total_records     INT,
    processed_records INT DEFAULT 0,
    success_count     INT DEFAULT 0,
    failed_count      INT DEFAULT 0,
    status_message    VARCHAR(255),
    error_message     TEXT,
    created_by        VARCHAR(255) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at        TIMESTAMP,
    completed_at      TIMESTAMP
);


-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
