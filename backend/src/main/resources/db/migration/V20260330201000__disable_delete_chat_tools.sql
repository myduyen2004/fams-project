UPDATE ai_tools
SET is_active = FALSE,
    updated_at = NOW()
WHERE name IN (
    'delete_user',
    'delete_class',
    'delete_course',
    'delete_major',
    'delete_room',
    'delete_semester',
    'delete_specialization',
    'delete_sub_specialization'
);
