-- Flyway Baseline Migration
-- This creates a snapshot of the current database schema
-- Run this ONLY ONCE to initialize Flyway on existing database

-- ===========================================================
-- USERS AND AUTHENTICATION
-- ===========================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    dob DATE,
    phone VARCHAR(20),
    avatar TEXT,
    role VARCHAR(20) NOT NULL CHECK (
        role IN (
            'ADMIN',
            'ACADEMIC_STAFF',
            'LECTURER',
            'STUDENT'
        )
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (
        status IN (
            'ACTIVE',
            'INACTIVE',
            'LOCKED'
        )
    ),
    is_password_changed BOOLEAN DEFAULT FALSE,
    face_data_status VARCHAR(20) DEFAULT 'NOT_REGISTERED' CHECK (
        face_data_status IN (
            'NOT_REGISTERED',
            'REGISTERED',
            'FAILED'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lecturer_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bio TEXT,
    department VARCHAR(100),
    expertise VARCHAR(500)
);

-- ===========================================================
-- USER SESSIONS
-- ===========================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    login_time TIMESTAMP NOT NULL,
    last_activity_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    city VARCHAR(100),
    province VARCHAR(100)
);

-- ===========================================================
-- ACADEMIC STRUCTURE
-- ===========================================================

CREATE TABLE IF NOT EXISTS majors (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_credits INTEGER DEFAULT 0,
    duration_years INTEGER DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('ACTIVE', 'INACTIVE')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS specializations (
    id BIGSERIAL PRIMARY KEY,
    major_id BIGINT NOT NULL REFERENCES majors (id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_credits INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN ('ACTIVE', 'INACTIVE')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS semesters (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UPCOMING' CHECK (
        status IN (
            'UPCOMING',
            'ONGOING',
            'COMPLETED'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================
-- INDEXES FOR PERFORMANCE
-- ===========================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_code ON users (code);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions (is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions (last_activity_time);

CREATE INDEX IF NOT EXISTS idx_majors_code ON majors (code);

CREATE INDEX IF NOT EXISTS idx_majors_status ON majors (status);

CREATE INDEX IF NOT EXISTS idx_specializations_major_id ON specializations (major_id);

CREATE INDEX IF NOT EXISTS idx_specializations_code ON specializations (code);

CREATE INDEX IF NOT EXISTS idx_specializations_status ON specializations (status);

CREATE INDEX IF NOT EXISTS idx_semesters_code ON semesters (code);

CREATE INDEX IF NOT EXISTS idx_semesters_status ON semesters (status);

CREATE INDEX IF NOT EXISTS idx_semesters_dates ON semesters (start_date, end_date);

-- ===========================================================
-- CONSTRAINTS AND TRIGGERS
-- ===========================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_majors_updated_at BEFORE UPDATE ON majors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specializations_updated_at BEFORE UPDATE ON specializations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();