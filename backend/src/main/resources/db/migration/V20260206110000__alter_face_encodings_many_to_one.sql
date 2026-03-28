-- ========================================
-- Face Recognition Multi-Angle Support
-- Migration: Change face_encodings.user_id from UNIQUE to non-UNIQUE (One-to-Many)
-- ========================================

-- Drop the unique constraint (usually named face_encodings_user_id_key)
ALTER TABLE face_encodings
DROP CONSTRAINT IF EXISTS face_encodings_user_id_key;

-- If it was created as a unique index instead of a constraint (sometimes happened with implicit index creation)
DROP INDEX IF EXISTS face_encodings_user_id_key;

-- Ensure an index still exists for performance (non-unique)
CREATE INDEX IF NOT EXISTS idx_face_encodings_user_id ON face_encodings (user_id);