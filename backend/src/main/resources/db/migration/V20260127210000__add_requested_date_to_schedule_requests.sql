-- Migration: Add requested_date and requested_slot_number columns to schedule_requests table
-- This column stores the date and slot number requested for the schedule change
-- ===========================================================
-- Created: 2026-01-27 21:00:00
-- ===========================================================

ALTER TABLE schedule_requests 
ADD COLUMN IF NOT EXISTS requested_date DATE;

-- Also ensure file column exists (in case previous migration didn't add it)
ALTER TABLE schedule_requests 
ADD COLUMN IF NOT EXISTS file TEXT;

-- Add requested_slot_number column to store slot number directly (1-4)
ALTER TABLE schedule_requests 
ADD COLUMN IF NOT EXISTS requested_slot_number INTEGER;
