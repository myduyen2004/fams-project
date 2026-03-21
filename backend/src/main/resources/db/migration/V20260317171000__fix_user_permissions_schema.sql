-- Re-create user_permissions table to match current entity model
DROP TABLE IF EXISTS user_permissions;

CREATE TABLE user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, permission)
);

CREATE INDEX idx_user_permission_user ON user_permissions (user_id);
