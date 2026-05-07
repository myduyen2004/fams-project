-- ===========================================================
-- SEED ROOMS FOR BUILDING GAMMA (Clean Migration)
-- 60 Rooms total: Floors 2, 3, 4 (20 rooms each)
-- Created: 2026-01-25 14:00:00
-- ===========================================================

-- 1. Ensure building Gamma rooms are handled safely (Idempotency)
-- We skip DELETE to avoid foreign key violations with timetable_slots

-- 2. SEED DATA
DO $$
DECLARE
    f INTEGER;
    r INTEGER;
BEGIN
    FOR f IN 2..4 LOOP
        FOR r IN 1..20 LOOP
            INSERT INTO rooms (code, name, capacity, building, floor, type, status)
            VALUES (
                (f * 100 + r)::text,  -- code (201..220, 301..320, 401..420)
                (f * 100 + r)::text,  -- name
                30,                  -- capacity
                'Gamma',             -- building
                f,                   -- floor
                'LECTURE',           -- type
                'ACTIVE'             -- status
            )
            ON CONFLICT (name) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;