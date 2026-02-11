-- Migration: Add face registration retry limit fields to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS face_registration_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS face_registration_blocked_until TIMESTAMP DEFAULT NULL;