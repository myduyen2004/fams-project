-- ========================================
-- Face Recognition Attendance Feature
-- Migration: Add face_encodings table and update student_attendances
-- ========================================

-- Create face_encodings table to store face vector data
CREATE TABLE IF NOT EXISTS face_encodings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    encoding_data BYTEA NOT NULL, -- 128-dim face vector (serialized numpy array)
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    liveness_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_face_encoding_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_face_encodings_user_id ON face_encodings (user_id);

-- Add new columns to student_attendances for face recognition metadata
ALTER TABLE student_attendances
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(500),
ADD COLUMN IF NOT EXISTS requires_manual_verify BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_verified_by BIGINT,
ADD COLUMN IF NOT EXISTS manual_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS captured_face_url VARCHAR(500);

-- Add foreign key for manual_verified_by
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_attendance_manual_verified_by'
    ) THEN
        ALTER TABLE student_attendances
        ADD CONSTRAINT fk_attendance_manual_verified_by
        FOREIGN KEY (manual_verified_by)
        REFERENCES users(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Index for finding attendances requiring manual verification
CREATE INDEX IF NOT EXISTS idx_student_attendances_manual_verify ON student_attendances (requires_manual_verify)
WHERE
    requires_manual_verify = TRUE;

-- Comments for documentation
COMMENT ON TABLE face_encodings IS 'Stores face recognition encoding vectors for biometric verification';

COMMENT ON COLUMN face_encodings.encoding_data IS '128-dimensional face encoding vector from face_recognition library';

COMMENT ON COLUMN face_encodings.liveness_verified IS 'Whether the face was registered with liveness detection';

COMMENT ON COLUMN student_attendances.attempt_count IS 'Number of face recognition attempts made';

COMMENT ON COLUMN student_attendances.requires_manual_verify IS 'Whether lecturer needs to manually verify this attendance';