-- Make file_url and file_name nullable to support submissions without files
-- Increase column lengths to support multiple files joined by ||| delimiter
ALTER TABLE assignment_submissions ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE assignment_submissions ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE assignment_submissions ALTER COLUMN file_url TYPE VARCHAR(2000);
ALTER TABLE assignment_submissions ALTER COLUMN file_name TYPE VARCHAR(1000);
