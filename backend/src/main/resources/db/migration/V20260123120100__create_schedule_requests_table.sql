-- Migration: Create schedule_requests table with file column
-- Consolidated script to ensure correct execution order

CREATE TABLE IF NOT EXISTS schedule_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users (id),
    class_name VARCHAR(50) NOT NULL REFERENCES class_sections (class_name),
    original_slot_id BIGINT REFERENCES timetable_slots (id),
    requested_slot_id BIGINT REFERENCES timetable_slots (id),
    requested_room_id BIGINT REFERENCES rooms (id),
    type VARCHAR(20) NOT NULL,
    reason TEXT,
    file TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approver_id BIGINT REFERENCES users (id),
    approved_at TIMESTAMP,
    approver_note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedule_request_requester ON schedule_requests (requester_id);

CREATE INDEX IF NOT EXISTS idx_schedule_request_class ON schedule_requests (class_name);

CREATE INDEX IF NOT EXISTS idx_schedule_request_status ON schedule_requests (status);

-- Trigger for updated_at
CREATE TRIGGER trg_schedule_requests_updated_at 
BEFORE UPDATE ON schedule_requests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();