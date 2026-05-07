ALTER TABLE system_logs ADD COLUMN ip_address VARCHAR(50);
ALTER TABLE system_logs ADD COLUMN user_agent TEXT;
ALTER TABLE system_logs ADD COLUMN old_value TEXT;
ALTER TABLE system_logs ADD COLUMN new_value TEXT;
