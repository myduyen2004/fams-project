-- Enhance plagiarism check audit logs with detailed results and comments
ALTER TABLE assignment_plagiarism_checks
    ADD COLUMN IF NOT EXISTS plagiarized_text BOOLEAN,
    ADD COLUMN IF NOT EXISTS plagiarized_image BOOLEAN,
    ADD COLUMN IF NOT EXISTS text_threshold DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS image_threshold DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS overall_comment TEXT,
    ADD COLUMN IF NOT EXISTS match_comment TEXT,
    ADD COLUMN IF NOT EXISTS reason_tags VARCHAR(500),
    ADD COLUMN IF NOT EXISTS index_coverage DOUBLE PRECISION;

-- Backfill flags based on existing scores if applicable (optional, but good for consistency)
UPDATE assignment_plagiarism_checks
SET plagiarized_text = (text_score >= 0.70)
WHERE text_score IS NOT NULL AND plagiarized_text IS NULL;

UPDATE assignment_plagiarism_checks
SET plagiarized_image = (image_score >= 0.95)
WHERE image_score IS NOT NULL AND plagiarized_image IS NULL;
