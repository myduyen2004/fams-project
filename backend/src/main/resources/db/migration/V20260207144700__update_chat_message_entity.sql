-- Update ChatMessage entity to support LINK type
-- Created: 2026-02-07 14:47:00

-- Ensure the type column can hold 'LINK' (it is VARCHAR(20), so it fits)
-- This migration documents the support for the new message type 'LINK'
-- and ensures the schema is aligned with the entity definition.

-- Update existing 'TEXT' messages that look like links to 'LINK' type
UPDATE chat_messages
SET
    type = 'LINK'
WHERE
    content LIKE 'http%'
    AND type = 'TEXT';

SELECT 1;