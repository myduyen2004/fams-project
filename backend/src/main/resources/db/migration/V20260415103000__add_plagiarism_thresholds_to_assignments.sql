ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS plagiarism_text_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    ADD COLUMN IF NOT EXISTS plagiarism_image_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.95;

UPDATE assignments
SET plagiarism_text_threshold = COALESCE(plagiarism_text_threshold, 0.70),
    plagiarism_image_threshold = COALESCE(plagiarism_image_threshold, 0.95);
