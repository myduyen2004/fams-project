-- Add newly introduced student attendance tools so Admin AI Tool Management can see them

INSERT INTO ai_tools (
    name,
    type,
    description,
    sql_template,
    accuracy_percentage,
    is_active,
    allowed_roles,
    required_fields
) VALUES
    (
        'get_my_attendance_overview',
        'SQL_TEMPLATE',
        'Tong quan diem danh ca nhan cua sinh vien theo tung mon lop',
        'SELECT c.code AS course_code, c.name AS course_name, ts.class_name,
               COUNT(sa.id)                                                             AS total_records,
               SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)                  AS present,
               SUM(CASE WHEN sa.status = ''ABSENT''  THEN 1 ELSE 0 END)                  AS absent,
               SUM(CASE WHEN sa.status = ''LATE''    THEN 1 ELSE 0 END)                  AS late,
               ROUND(100.0 * SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1)                                AS attendance_rate,
               GREATEST(0, 4 - SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END)) AS slots_before_fail,
               CASE
                   WHEN SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END) >= 4 THEN ''FAILED_BY_ATTENDANCE''
                   WHEN SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END) = 3 THEN ''WARNING''
                   ELSE ''SAFE''
               END                                                                      AS attendance_status,
               MAX(ts.date)                                                             AS latest_session_date
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id = c.id
        WHERE  sa.student_id = %s
        GROUP BY c.code, c.name, ts.class_name
        ORDER BY absent DESC, attendance_rate ASC, latest_session_date DESC',
        NULL,
        TRUE,
        'STUDENT',
        NULL
    ),
    (
        'get_my_absence_history',
        'SQL_TEMPLATE',
        'Lich su cac buoi vang hoc gan day cua sinh vien',
        'SELECT ts.date, ts.slot_number,
               ts.class_name, c.name AS course_name,
               sa.status, sa.method,
               r.name AS room,
               st.start_time, st.end_time
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id = c.id
        LEFT JOIN rooms            r   ON ts.room_id = r.id
        LEFT JOIN slot_types       st  ON ts.slot_type_id = st.id
        WHERE  sa.student_id = %s
          AND  sa.status = ''ABSENT''
        ORDER BY ts.date DESC, ts.slot_number DESC
        LIMIT  30',
        NULL,
        TRUE,
        'STUDENT',
        NULL
    ),
    (
        'get_my_attendance_risk_courses',
        'SQL_TEMPLATE',
        'Cac mon hoc lop hoc co nguy co rot do vang tu 3 buoi tro len',
        'SELECT c.code AS course_code, c.name AS course_name,
               ts.class_name,
               COUNT(sa.id)                                                             AS total_records,
               SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)                  AS present,
               SUM(CASE WHEN sa.status = ''ABSENT''  THEN 1 ELSE 0 END)                  AS absent,
               SUM(CASE WHEN sa.status = ''LATE''    THEN 1 ELSE 0 END)                  AS late,
               ROUND(100.0 * SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1)                                AS attendance_rate,
               GREATEST(0, 4 - SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END)) AS slots_before_fail,
               CASE
                   WHEN SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END) >= 4 THEN ''FAILED_BY_ATTENDANCE''
                   WHEN SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END) = 3 THEN ''WARNING''
                   ELSE ''SAFE''
               END                                                                      AS attendance_status,
               MAX(ts.date)                                                             AS latest_session_date
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id = c.id
        WHERE  sa.student_id = %s
        GROUP BY c.code, c.name, ts.class_name
        HAVING COUNT(sa.id) > 0
           AND SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END) >= %s
        ORDER BY attendance_rate ASC, absent DESC',
        NULL,
        TRUE,
        'STUDENT',
        NULL
    )
ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    sql_template = EXCLUDED.sql_template,
    is_active = EXCLUDED.is_active,
    allowed_roles = EXCLUDED.allowed_roles,
    required_fields = EXCLUDED.required_fields,
    updated_at = NOW();
