-- Add plagiarism summary fields to assignment_submissions table
ALTER TABLE assignment_submissions
    ADD COLUMN IF NOT EXISTS plagiarism_percent INTEGER,
    ADD COLUMN IF NOT EXISTS plagiarism_status VARCHAR(20) DEFAULT 'NOT_CHECKED';

-- Create an index for quick filtering of suspected submissions
CREATE INDEX IF NOT EXISTS idx_assignment_sub_plagiarism_percent ON assignment_submissions(plagiarism_percent);
CREATE INDEX IF NOT EXISTS idx_assignment_sub_plagiarism_status ON assignment_submissions(plagiarism_status);
