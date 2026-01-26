-- Enable pg_trgm extension for fast partial string matching (LIKE %query%)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN Trigram indexes on searchable columns
-- Use GIN (Generalized Inverted Index) for high-performance sub-string lookups
CREATE INDEX IF NOT EXISTS idx_user_full_name_trgm ON users USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_email_trgm ON users USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_code_trgm ON users USING gin (code gin_trgm_ops);