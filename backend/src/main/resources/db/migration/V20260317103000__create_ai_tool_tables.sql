-- Create AI tool management tables for chatbot admin

CREATE TABLE IF NOT EXISTS ai_tools (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    sql_template TEXT,
    accuracy_percentage DOUBLE PRECISION,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_roles TEXT DEFAULT 'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
    required_fields TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_tools_name UNIQUE (name),
    CONSTRAINT chk_ai_tools_type CHECK (type IN ('SQL_TEMPLATE', 'BACKEND_ACTION', 'NAVIGATE_ONLY'))
);

CREATE TABLE IF NOT EXISTS ai_tool_tests (
    id BIGSERIAL PRIMARY KEY,
    tool_id BIGINT NOT NULL,
    is_passed BOOLEAN NOT NULL DEFAULT FALSE,
    test_query TEXT,
    test_result_summary TEXT,
    logs TEXT,
    execution_time_ms BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_tool_tests_tool
        FOREIGN KEY (tool_id) REFERENCES ai_tools (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_tools_is_active
    ON ai_tools (is_active);

CREATE INDEX IF NOT EXISTS idx_ai_tool_tests_tool_id
    ON ai_tool_tests (tool_id);

CREATE INDEX IF NOT EXISTS idx_ai_tool_tests_tool_created_at_desc
    ON ai_tool_tests (tool_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_ai_tools_updated_at ON ai_tools;

CREATE TRIGGER trg_ai_tools_updated_at
BEFORE UPDATE ON ai_tools
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
