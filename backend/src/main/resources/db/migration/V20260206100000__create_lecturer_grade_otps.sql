-- Create lecturer_grade_otps table for storing fixed OTP for grade management
CREATE TABLE IF NOT EXISTS lecturer_grade_otps (
    user_id BIGINT PRIMARY KEY,
    otp_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    CONSTRAINT fk_lecturer_grade_otps_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lecturer_grade_otps_user_id ON lecturer_grade_otps (user_id);

COMMENT ON TABLE lecturer_grade_otps IS 'Stores fixed OTP for lecturers to verify before managing grades';

COMMENT ON COLUMN lecturer_grade_otps.otp_hash IS 'BCrypt hashed 6-digit OTP code';

COMMENT ON COLUMN lecturer_grade_otps.last_used_at IS 'Timestamp of last successful OTP verification';