-- Remove QR code attendance columns from attendance_sessions
ALTER TABLE attendance_sessions
DROP COLUMN IF EXISTS qr_code_data,
DROP COLUMN IF EXISTS qr_expires_at;