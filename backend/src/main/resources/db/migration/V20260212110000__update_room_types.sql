-- Update existing room types to new values
ALTER TABLE rooms ADD COLUMN description VARCHAR(500);

UPDATE rooms SET type = 'CLASSROOM' WHERE type = 'LECTURE';

UPDATE rooms SET type = 'COMPUTER_LAB' WHERE type = 'LAB';

UPDATE rooms
SET
    type = 'CLASSROOM'
WHERE
    type IN (
        'MEETING',
        'AUDITORIUM',
        'LIBRARY'
    );

-- Ensure future data follows the new default logic (though Java handles it)
ALTER TABLE rooms ALTER COLUMN type SET DEFAULT 'CLASSROOM';