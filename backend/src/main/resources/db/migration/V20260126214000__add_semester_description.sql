-- ===========================================================
-- FIX SEMESTER PAGE ERROR (ADD MISSING COLUMN)
-- Created: 2026-01-26 21:40:00
-- ===========================================================

ALTER TABLE semesters ADD COLUMN IF NOT EXISTS description TEXT;