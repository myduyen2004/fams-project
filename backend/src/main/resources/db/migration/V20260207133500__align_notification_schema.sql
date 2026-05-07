-- Database Migration: Add target_url to notifications table
-- Created: 2026-02-07 13:48:00

-- 1. Table: notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS target_url VARCHAR(255);