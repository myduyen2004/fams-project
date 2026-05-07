/*
 * Migration to add updated_at column to semester_configs table
 * This column is needed to track configuration changes and warn users about outdated timetables
 */

-- Add updated_at column if it doesn't exist (using TIMESTAMP to match LocalDateTime)
ALTER TABLE semester_configs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Initialize updated_at with created_at for existing records
-- This sets the baseline so that existing configs are not considered "changed" relative to existing timetables
UPDATE semester_configs SET updated_at = created_at;

-- Safety fallback: if created_at is null for some reason, use current time
UPDATE semester_configs
SET
    updated_at = CURRENT_TIMESTAMP
WHERE
    updated_at IS NULL;

-- Set default value for future inserts and add NOT NULL constraint
ALTER TABLE semester_configs
ALTER COLUMN updated_at
SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE semester_configs ALTER COLUMN updated_at SET NOT NULL;