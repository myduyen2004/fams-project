-- ===========================================================
-- DELETE ADMIN USER FOR RE-INITIALIZATION
-- Created: 2026-01-27 09:02:00
-- ===========================================================

-- 1. Delete existing admin user to trigger DataInitializer.java on next startup
-- We delete by both username and the common default emails to ensure a clean slate.
DELETE FROM users
WHERE
    username = 'admin'
    OR email = 'admin@fams.edu.vn'
    OR email = 'admin@fams.com';

-- 2. Optional: Log the deletion (if you have system logs)
-- INSERT INTO system_logs (title, description, type, source)
-- VALUES ('Admin Reset', 'Deleted admin user to trigger re-initialization', 'SYSTEM', 'Flyway');