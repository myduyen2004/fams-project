-- Add import tracking tables
-- Track history of all Excel imports for audit purposes

CREATE TABLE import_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    entity_type VARCHAR(50) NOT NULL, -- 'MAJOR', 'SPECIALIZATION', 'LECTURER'
    file_name VARCHAR(255) NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (
        status IN (
            'PROCESSING',
            'COMPLETED',
            'FAILED'
        )
    )
);

CREATE TABLE import_detail (
    id BIGSERIAL PRIMARY KEY,
    import_history_id BIGINT NOT NULL REFERENCES import_history (id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    row_data TEXT,
    error_message TEXT,
    status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (
        status IN (
            'SUCCESS',
            'FAILED',
            'SKIPPED'
        )
    )
);

-- Indexes for performance
CREATE INDEX idx_import_history_user ON import_history (user_id);

CREATE INDEX idx_import_history_date ON import_history (imported_at);

CREATE INDEX idx_import_history_type ON import_history (entity_type);

CREATE INDEX idx_import_detail_history ON import_detail (import_history_id);

-- Comments for documentation
COMMENT ON TABLE import_history IS 'Tracks all Excel import operations';

COMMENT ON TABLE import_detail IS 'Details of each row in an import operation';

COMMENT ON COLUMN import_history.entity_type IS 'Type of entity being imported: MAJOR, SPECIALIZATION, or LECTURER';