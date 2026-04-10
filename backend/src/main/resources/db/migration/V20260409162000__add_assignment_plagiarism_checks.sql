CREATE TABLE IF NOT EXISTS assignment_plagiarism_checks (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    target_submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    compared_submission_id BIGINT REFERENCES assignment_submissions(id) ON DELETE SET NULL,
    checker_lecturer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope VARCHAR(100) NOT NULL,
    model_name VARCHAR(120) NOT NULL,
    strategy VARCHAR(255) NOT NULL,
    text_score DOUBLE PRECISION,
    image_score DOUBLE PRECISION,
    metadata_score DOUBLE PRECISION,
    file_name_score DOUBLE PRECISION,
    probability DOUBLE PRECISION,
    plagiarism_percent INTEGER,
    plagiarized BOOLEAN,
    target_text_length INTEGER,
    compared_text_length INTEGER,
    content_based BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apc_assignment ON assignment_plagiarism_checks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_apc_target_submission ON assignment_plagiarism_checks(target_submission_id);
CREATE INDEX IF NOT EXISTS idx_apc_compared_submission ON assignment_plagiarism_checks(compared_submission_id);
CREATE INDEX IF NOT EXISTS idx_apc_created_at ON assignment_plagiarism_checks(created_at);
