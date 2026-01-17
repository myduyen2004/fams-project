-- Create semester configuration and related tables
CREATE TABLE IF NOT EXISTS semester_configs (
    id BIGSERIAL PRIMARY KEY,
    semester_id BIGINT NOT NULL UNIQUE REFERENCES semesters (id) ON DELETE CASCADE,
    max_slot_per_day INTEGER NOT NULL DEFAULT 4,
    slot_per_subject_per_week INTEGER NOT NULL DEFAULT 2,
    slot_duration INTEGER NOT NULL DEFAULT 90,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slot_types (
    id BIGSERIAL PRIMARY KEY,
    semester_id BIGINT NOT NULL REFERENCES semesters (id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    slot_index INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description VARCHAR(255),
    duration VARCHAR(20) NOT NULL DEFAULT 'MINUTES_90',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (semester_id, slot_index)
);

CREATE TABLE IF NOT EXISTS holidays (
    id BIGSERIAL PRIMARY KEY,
    semester_id BIGINT REFERENCES semesters (id) ON DELETE CASCADE, -- NULL means system-wide
    holiday_date DATE NOT NULL,
    description VARCHAR(255),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS semester_weekdays (
    id BIGSERIAL PRIMARY KEY,
    semester_id BIGINT NOT NULL REFERENCES semesters (id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL, -- 2 = Monday, ..., 8 = Sunday
    UNIQUE (semester_id, weekday)
);

-- Indexes for performance
CREATE INDEX idx_semester_configs_semester ON semester_configs (semester_id);

CREATE INDEX idx_slot_types_semester ON slot_types (semester_id);

CREATE INDEX idx_holidays_semester ON holidays (semester_id);

CREATE INDEX idx_semester_weekdays_semester ON semester_weekdays (semester_id);