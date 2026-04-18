CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS assignment_submission_vector_index (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL UNIQUE REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    indexed_at TIMESTAMP,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asvi_course_id ON assignment_submission_vector_index(course_id);
CREATE INDEX IF NOT EXISTS idx_asvi_status ON assignment_submission_vector_index(status);

CREATE TABLE IF NOT EXISTS assignment_text_embeddings (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    page_or_chunk VARCHAR(120),
    content_preview TEXT,
    embedding vector NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ate_course_id ON assignment_text_embeddings(course_id);
CREATE INDEX IF NOT EXISTS idx_ate_submission_id ON assignment_text_embeddings(submission_id);

CREATE TABLE IF NOT EXISTS assignment_image_embeddings (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    assignment_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    page_or_chunk VARCHAR(120),
    content_preview TEXT,
    embedding vector NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aie_course_id ON assignment_image_embeddings(course_id);
CREATE INDEX IF NOT EXISTS idx_aie_submission_id ON assignment_image_embeddings(submission_id);

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_ate_embedding_hnsw
            ON assignment_text_embeddings
            USING hnsw (embedding vector_cosine_ops);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping HNSW index creation for assignment_text_embeddings: %', SQLERRM;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        CREATE INDEX IF NOT EXISTS idx_aie_embedding_hnsw
            ON assignment_image_embeddings
            USING hnsw (embedding vector_cosine_ops);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping HNSW index creation for assignment_image_embeddings: %', SQLERRM;
    END;
END $$;

