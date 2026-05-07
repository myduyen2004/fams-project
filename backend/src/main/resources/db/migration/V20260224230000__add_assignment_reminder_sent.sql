-- Add reminder_sent column to assignments table
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;
