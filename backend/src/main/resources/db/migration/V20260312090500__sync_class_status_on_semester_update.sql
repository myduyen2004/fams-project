-- V20260312090500__sync_class_status_on_semester_update.sql

-- 1. Create a function to synchronize class section status based on semester status
CREATE OR REPLACE FUNCTION sync_class_section_status_from_semester()
RETURNS TRIGGER AS $$
DECLARE
    target_class_status VARCHAR(50);
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'COMPLETED' THEN
            target_class_status := 'FINISHED';
        ELSIF NEW.status = 'ONGOING' THEN
            target_class_status := 'ONGOING';
        ELSE
            target_class_status := 'UPCOMING';
        END IF;

        UPDATE class_sections 
        SET status = target_class_status 
        WHERE semester_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if any (for idempotency)
DROP TRIGGER IF EXISTS trg_sync_class_section_status ON semesters;

-- 3. Create trigger on semesters table
CREATE TRIGGER trg_sync_class_section_status
AFTER UPDATE OF status ON semesters
FOR EACH ROW
EXECUTE FUNCTION sync_class_section_status_from_semester();

-- 4. One-time data correction for existing inconsistent records
UPDATE class_sections 
SET status = 'ONGOING' 
WHERE semester_id IN (SELECT id FROM semesters WHERE status = 'ONGOING')
AND status != 'ONGOING';

UPDATE class_sections 
SET status = 'UPCOMING' 
WHERE semester_id IN (SELECT id FROM semesters WHERE status = 'UPCOMING')
AND status != 'UPCOMING';

UPDATE class_sections 
SET status = 'FINISHED' 
WHERE semester_id IN (SELECT id FROM semesters WHERE status = 'COMPLETED')
AND status != 'FINISHED';
