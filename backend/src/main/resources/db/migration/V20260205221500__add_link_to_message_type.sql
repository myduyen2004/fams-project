-- Add LINK to message type enumeration representation
-- Since the type is stored as VARCHAR(20) in the database via @Enumerated(EnumType.STRING),
-- no schema change is strictly required if the column already exists.
-- This migration serves as documentation and a hook for any data cleanup if needed.

-- Example of how we might update existing messages if we had a way to detect links retroactively,
-- but for now, we just ensure the system handles the new type.

-- No structural changes needed for VARCHAR column.
SELECT 1;

UPDATE chat_messages
SET
    type = 'LINK'
WHERE
    content LIKE 'http%'
    AND type = 'TEXT';