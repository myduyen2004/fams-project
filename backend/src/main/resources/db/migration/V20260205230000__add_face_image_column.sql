-- Add face_image column to store the registered face image as base64
-- This allows users to view their registered face in the mobile app

ALTER TABLE face_encodings ADD COLUMN IF NOT EXISTS face_image TEXT;

COMMENT ON COLUMN face_encodings.face_image IS 'Base64 encoded face image captured during registration';