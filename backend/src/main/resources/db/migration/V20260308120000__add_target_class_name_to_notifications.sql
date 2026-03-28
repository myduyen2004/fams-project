-- Migration: Add target_class_name column to notifications table
-- Purpose: Support class-specific notifications
-- Date: 2026-03-08

ALTER TABLE notifications ADD COLUMN target_class_name VARCHAR(100);

-- Create index for faster queries when filtering by class
CREATE INDEX idx_notification_target_class ON notifications(target_class_name);
