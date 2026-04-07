-- Sync student attendance tool SQL templates with the latest chatbot runtime logic

UPDATE ai_tools
SET
    description = 'Tong quan diem danh cua sinh vien; sinh vien xem cua minh, nhan vien dao tao tra cuu theo ma sinh vien',
    allowed_roles = 'STUDENT,ACADEMIC_STAFF',
    sql_template = 'WITH base AS (
            SELECT ts.id AS slot_id,
                   ts.date,
                   ts.slot_number,
                   ts.class_name,
                   c.code AS course_code,
                   c.name AS course_name,
                   st.end_time,
                   sa.status AS attendance_status
            FROM   enrollments e
            JOIN   users               u   ON e.student_id = u.id
            JOIN   class_sections      cs  ON e.class_name = cs.class_name
            JOIN   courses             c   ON cs.course_id = c.id
            JOIN   timetable_slots     ts  ON ts.class_name = cs.class_name
            JOIN   slot_types          st  ON ts.slot_type_id = st.id
            LEFT JOIN attendance_sessions ats
                   ON ats.timetable_slot_id = ts.id
            LEFT JOIN student_attendances sa
                   ON sa.session_id = ats.id
                  AND sa.student_id = e.student_id
            WHERE  (e.student_id = %s OR u.code = %s)
              AND  e.status IN (''ENROLLED'', ''COMPLETED'')
              AND  ts.status <> ''CANCELLED''
        )
        SELECT course_code,
               course_name,
               class_name,
               COUNT(slot_id) AS total_slots,
               COUNT(CASE WHEN CURRENT_TIMESTAMP > (date + end_time) THEN 1 END) AS sessions_held,
               COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND attendance_status = ''PRESENT''
                        THEN 1
                    END) AS present,
               COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND attendance_status = ''EXCUSED''
                        THEN 1
                    END) AS excused,
               COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                        THEN 1
                    END) AS absent,
               ROUND(
                   100.0 * COUNT(CASE
                                     WHEN CURRENT_TIMESTAMP > (date + end_time)
                                      AND COALESCE(attendance_status, ''ABSENT'') IN (''PRESENT'', ''EXCUSED'')
                                     THEN 1
                                 END)
                   / NULLIF(COUNT(CASE WHEN CURRENT_TIMESTAMP > (date + end_time) THEN 1 END), 0),
                   1
               ) AS attendance_rate,
               GREATEST(
                   0,
                   4 - COUNT(CASE
                                 WHEN CURRENT_TIMESTAMP > (date + end_time)
                                  AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                                 THEN 1
                             END)
               ) AS slots_before_fail,
               CASE
                   WHEN COUNT(CASE
                                 WHEN CURRENT_TIMESTAMP > (date + end_time)
                                  AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                                 THEN 1
                              END) >= 4 THEN ''FAILED_BY_ATTENDANCE''
                   WHEN COUNT(CASE
                                 WHEN CURRENT_TIMESTAMP > (date + end_time)
                                  AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                                 THEN 1
                              END) = 3 THEN ''WARNING''
                   ELSE ''SAFE''
               END AS attendance_status,
               MAX(CASE
                       WHEN CURRENT_TIMESTAMP > (date + end_time)
                       THEN date
                   END) AS latest_session_date
        FROM   base
        GROUP BY course_code, course_name, class_name
        ORDER BY absent DESC, attendance_rate ASC NULLS LAST, latest_session_date DESC NULLS LAST, class_name',
    updated_at = NOW()
WHERE name = 'get_my_attendance_overview';

UPDATE ai_tools
SET
    description = 'Lich su cac buoi vang hoc cua sinh vien; sinh vien xem cua minh, nhan vien dao tao tra cuu theo ma sinh vien',
    allowed_roles = 'STUDENT,ACADEMIC_STAFF',
    sql_template = 'SELECT ts.date,
               ts.slot_number,
               ts.class_name,
               c.code AS course_code,
               c.name AS course_name,
               COALESCE(sa.status, ''ABSENT'') AS status,
               COALESCE(sa.method, ''SYSTEM'') AS method,
               r.name AS room,
               st.start_time,
               st.end_time
        FROM   enrollments e
        JOIN   users               u   ON e.student_id = u.id
        JOIN   class_sections      cs  ON e.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id = c.id
        JOIN   timetable_slots     ts  ON ts.class_name = cs.class_name
        JOIN   slot_types          st  ON ts.slot_type_id = st.id
        LEFT JOIN rooms            r   ON ts.room_id = r.id
        LEFT JOIN attendance_sessions ats
               ON ats.timetable_slot_id = ts.id
        LEFT JOIN student_attendances sa
               ON sa.session_id = ats.id
              AND sa.student_id = e.student_id
        WHERE  (e.student_id = %s OR u.code = %s)
          AND  e.status IN (''ENROLLED'', ''COMPLETED'')
          AND  ts.status <> ''CANCELLED''
          AND  CURRENT_TIMESTAMP > (ts.date + st.end_time)
          AND  COALESCE(sa.status, ''ABSENT'') = ''ABSENT''
        ORDER BY ts.date DESC, ts.slot_number DESC
        LIMIT  30',
    updated_at = NOW()
WHERE name = 'get_my_absence_history';

UPDATE ai_tools
SET
    description = 'Cac mon hoc co nguy co rot do vang hoc; sinh vien xem cua minh, nhan vien dao tao tra cuu theo ma sinh vien',
    allowed_roles = 'STUDENT,ACADEMIC_STAFF',
    sql_template = 'WITH base AS (
            SELECT ts.id AS slot_id,
                   ts.date,
                   ts.slot_number,
                   ts.class_name,
                   c.code AS course_code,
                   c.name AS course_name,
                   st.end_time,
                   sa.status AS attendance_status
            FROM   enrollments e
            JOIN   users               u   ON e.student_id = u.id
            JOIN   class_sections      cs  ON e.class_name = cs.class_name
            JOIN   courses             c   ON cs.course_id = c.id
            JOIN   timetable_slots     ts  ON ts.class_name = cs.class_name
            JOIN   slot_types          st  ON ts.slot_type_id = st.id
            LEFT JOIN attendance_sessions ats
                   ON ats.timetable_slot_id = ts.id
            LEFT JOIN student_attendances sa
                   ON sa.session_id = ats.id
                  AND sa.student_id = e.student_id
            WHERE  (e.student_id = %s OR u.code = %s)
              AND  e.status IN (''ENROLLED'', ''COMPLETED'')
              AND  ts.status <> ''CANCELLED''
        )
        SELECT course_code,
               course_name,
               class_name,
               COUNT(slot_id) AS total_slots,
               COUNT(CASE WHEN CURRENT_TIMESTAMP > (date + end_time) THEN 1 END) AS sessions_held,
               COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND attendance_status = ''PRESENT''
                        THEN 1
                    END) AS present,
               COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND attendance_status = ''EXCUSED''
                        THEN 1
                    END) AS excused,
               COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                        THEN 1
                    END) AS absent,
               ROUND(
                   100.0 * COUNT(CASE
                                     WHEN CURRENT_TIMESTAMP > (date + end_time)
                                      AND COALESCE(attendance_status, ''ABSENT'') IN (''PRESENT'', ''EXCUSED'')
                                     THEN 1
                                 END)
                   / NULLIF(COUNT(CASE WHEN CURRENT_TIMESTAMP > (date + end_time) THEN 1 END), 0),
                   1
               ) AS attendance_rate,
               GREATEST(
                   0,
                   4 - COUNT(CASE
                                 WHEN CURRENT_TIMESTAMP > (date + end_time)
                                  AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                                 THEN 1
                             END)
               ) AS slots_before_fail,
               CASE
                   WHEN COUNT(CASE
                                 WHEN CURRENT_TIMESTAMP > (date + end_time)
                                  AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                                 THEN 1
                              END) >= 4 THEN ''FAILED_BY_ATTENDANCE''
                   WHEN COUNT(CASE
                                 WHEN CURRENT_TIMESTAMP > (date + end_time)
                                  AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                                 THEN 1
                              END) = 3 THEN ''WARNING''
                   ELSE ''SAFE''
               END AS attendance_status,
               MAX(CASE
                       WHEN CURRENT_TIMESTAMP > (date + end_time)
                       THEN date
                   END) AS latest_session_date
        FROM   base
        GROUP BY course_code, course_name, class_name
        HAVING COUNT(CASE
                        WHEN CURRENT_TIMESTAMP > (date + end_time)
                         AND COALESCE(attendance_status, ''ABSENT'') = ''ABSENT''
                        THEN 1
                     END) >= %s
        ORDER BY absent DESC, attendance_rate ASC NULLS LAST, latest_session_date DESC NULLS LAST, class_name',
    updated_at = NOW()
WHERE name = 'get_my_attendance_risk_courses';
