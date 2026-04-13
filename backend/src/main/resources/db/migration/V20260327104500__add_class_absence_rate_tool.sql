-- Add tool for class absence rate statistics

INSERT INTO ai_tools (
    name,
    type,
    description,
    sql_template,
    accuracy_percentage,
    is_active,
    allowed_roles,
    required_fields
)
VALUES (
    'get_absence_rate_by_class',
    'SQL_TEMPLATE',
    'Thong ke ti le vang mat tong quan cua mot lop hoc',
    'SELECT
            ts.class_name,
            COUNT(DISTINCT sa.student_id) AS total_students,
            COUNT(sa.id) AS total_records,
            COUNT(DISTINCT ts.date) AS total_sessions,
            SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END) AS absent_records,
            ROUND(
                100.0 * SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(sa.id), 0),
                1
            ) AS absent_rate,
            SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END) AS present_records,
            ROUND(
                100.0 * SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(sa.id), 0),
                1
            ) AS present_rate,
            SUM(CASE WHEN sa.status = ''LATE'' THEN 1 ELSE 0 END) AS late_records,
            ROUND(
                100.0 * SUM(CASE WHEN sa.status = ''LATE'' THEN 1 ELSE 0 END)
                / NULLIF(COUNT(sa.id), 0),
                1
            ) AS late_rate,
            COUNT(DISTINCT CASE WHEN sa.status = ''ABSENT'' THEN sa.student_id END) AS students_with_absence,
            MAX(CASE WHEN sa.status = ''ABSENT'' THEN ts.date END) AS latest_absence_date
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  unaccent(ts.class_name) ILIKE unaccent(%s)
        GROUP BY ts.class_name',
    NULL,
    TRUE,
    'ACADEMIC_STAFF',
    'class_name'
)
ON CONFLICT (name) DO UPDATE
SET
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    sql_template = EXCLUDED.sql_template,
    is_active = EXCLUDED.is_active,
    allowed_roles = EXCLUDED.allowed_roles,
    required_fields = EXCLUDED.required_fields,
    updated_at = NOW();
