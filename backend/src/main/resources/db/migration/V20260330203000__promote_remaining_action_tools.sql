UPDATE ai_tools
SET type = 'BACKEND_ACTION',
    updated_at = NOW()
WHERE name IN (
    'activate_user',
    'create_schedule_request',
    'update_attendance_manually',
    'update_class',
    'update_lecturer_info',
    'update_room',
    'update_semester',
    'update_specialization',
    'update_student_info',
    'update_sub_specialization'
);
