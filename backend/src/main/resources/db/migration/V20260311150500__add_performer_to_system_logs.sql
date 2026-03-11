ALTER TABLE system_logs ADD COLUMN performer_id BIGINT;
ALTER TABLE system_logs ADD CONSTRAINT fk_system_logs_performer FOREIGN KEY (performer_id) REFERENCES users(id);
