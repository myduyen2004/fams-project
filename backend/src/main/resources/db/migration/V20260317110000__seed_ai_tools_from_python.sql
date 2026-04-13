-- Seed AI tools generated from current Python chat code
-- Total tools: 170

INSERT INTO
    ai_tools (
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
        'activate_user',
        'SQL_TEMPLATE',
        'Xu ly activate user',
        'UPDATE users SET status=''ACTIVE'', updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ADMIN',
        'code'
    ),
    (
        'approve_schedule_request',
        'SQL_TEMPLATE',
        'Phe duyet schedule request',
        'UPDATE schedule_requests SET status=''APPROVED'', updated_at=NOW() WHERE id=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'request_id'
    ),
    (
        'assign_course_to_specialization',
        'SQL_TEMPLATE',
        'Gan course to specialization',
        'INSERT INTO specialization_courses (specialization_id, course_id, semester, created_at, updated_at)
        SELECT s.id, c.id, %s, NOW(), NOW()
        FROM   specializations s, courses c
        WHERE  (s.code = %s OR unaccent(s.name) ILIKE unaccent(%s))
          AND  (c.code = %s OR unaccent(c.name) ILIKE unaccent(%s))
        ON CONFLICT DO NOTHING RETURNING specialization_id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'specialization_code,specialization_name,course_code,course_name,semester'
    ),
    (
        'assign_course_to_sub_specialization',
        'SQL_TEMPLATE',
        'Gan course to sub specialization',
        'INSERT INTO sub_specialization_courses (sub_specialization_id, course_id, created_at, updated_at)
        SELECT ss.id, c.id, NOW(), NOW()
        FROM   sub_specializations ss, courses c
        WHERE  (ss.code = %s OR unaccent(ss.name) ILIKE unaccent(%s))
          AND  (c.code  = %s OR unaccent(c.name)  ILIKE unaccent(%s))
        ON CONFLICT DO NOTHING RETURNING sub_specialization_id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'sub_specialization_code,sub_specialization_name,course_code,course_name'
    ),
    (
        'count_rooms_by_status',
        'SQL_TEMPLATE',
        'Thong ke du lieu count rooms by status',
        'SELECT status,
               COUNT(*)        AS total,
               SUM(capacity)   AS total_capacity,
               ROUND(AVG(capacity)) AS avg_capacity
        FROM   rooms
        GROUP BY status
        ORDER BY status',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'count_students_by_major',
        'SQL_TEMPLATE',
        'Thong ke du lieu count students by major',
        'SELECT m.name  AS major_name,
               m.code  AS major_code,
               COUNT(CASE WHEN u.status = ''ACTIVE'' THEN 1 END)    AS active_students,
               COUNT(CASE WHEN u.status = ''INACTIVE'' THEN 1 END)  AS inactive_students,
               COUNT(sp.user_id)                                   AS total_students,
               ROUND(AVG(sp.gpa), 2)                              AS avg_gpa
        FROM   majors m
        LEFT JOIN student_profiles sp ON m.id = sp.major_id
        LEFT JOIN users            u  ON sp.user_id = u.id
        WHERE  unaccent(m.name) ILIKE unaccent(%s)
            OR unaccent(m.code) ILIKE unaccent(%s)
            OR %s = ''''
        GROUP BY m.name, m.code
        ORDER BY active_students DESC',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'major_name,major_code'
    ),
    (
        'count_unread_notifications',
        'SQL_TEMPLATE',
        'Thong ke du lieu count unread notifications',
        'SELECT COUNT(*) AS unread_count,
               MAX(n.sent_at) AS latest_notification_at
        FROM   notification_recipients nr
        JOIN   notifications n ON nr.notification_id = n.id
        WHERE  nr.recipient_id = %s AND nr.is_read = FALSE',
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'count_users_by_role',
        'SQL_TEMPLATE',
        'Thong ke du lieu count users by role',
        'SELECT role,
               COUNT(*)                                          AS total,
               SUM(CASE WHEN status = ''ACTIVE''   THEN 1 ELSE 0 END) AS active,
               SUM(CASE WHEN status = ''INACTIVE'' THEN 1 ELSE 0 END) AS inactive
        FROM   users
        GROUP BY role
        ORDER BY role',
        NULL,
        TRUE,
        'ADMIN',
        NULL
    ),
    (
        'create_class',
        'SQL_TEMPLATE',
        'Tao moi class',
        'INSERT INTO class_sections (class_name, course_id, lecturer_id, semester_id, created_at, updated_at)
        SELECT %s, c.id, u.id, s.id, NOW(), NOW()
        FROM   courses c, users u, semesters s
        WHERE  c.code = %s AND u.code = %s AND s.code = %s
        RETURNING class_name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name,course_code,lecturer_code,semester_code'
    ),
    (
        'create_course',
        'SQL_TEMPLATE',
        'Tao moi course',
        'INSERT INTO courses (code, name, credits, status, created_at, updated_at)
        VALUES (%s, %s, %s, ''ACTIVE'', NOW(), NOW()) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'code,name,credits'
    ),
    (
        'create_major',
        'SQL_TEMPLATE',
        'Tao moi major',
        'INSERT INTO majors (code, name, status, created_at, updated_at)
        VALUES (%s, %s, ''ACTIVE'', NOW(), NOW()) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'code,name'
    ),
    (
        'create_notification',
        'BACKEND_ACTION',
        'Tao moi notification',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER',
        NULL
    ),
    (
        'create_room',
        'SQL_TEMPLATE',
        'Tao moi room',
        'INSERT INTO rooms (name, capacity, status, created_at, updated_at)
        VALUES (%s, %s, ''ACTIVE'', NOW(), NOW()) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'name,capacity'
    ),
    (
        'create_schedule_request',
        'SQL_TEMPLATE',
        'Tao moi schedule request',
        'INSERT INTO schedule_requests (requester_id, original_slot_id, requested_slot_id, reason, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, ''PENDING'', NOW(), NOW())
        RETURNING id, reason, status, created_at',
        NULL,
        TRUE,
        'LECTURER',
        'original_slot_id,requested_slot_id,reason'
    ),
    (
        'create_semester',
        'SQL_TEMPLATE',
        'Tao moi semester',
        'INSERT INTO semesters (code, name, start_date, end_date, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, ''UPCOMING'', NOW(), NOW()) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'code,name,start_date,end_date'
    ),
    (
        'create_specialization',
        'SQL_TEMPLATE',
        'Tao moi specialization',
        'INSERT INTO specializations (code, name, major_id, status, created_at, updated_at)
        VALUES (%s, %s, %s, ''ACTIVE'', NOW(), NOW()) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'major_code,spec_code,spec_name'
    ),
    (
        'create_sub_specialization',
        'SQL_TEMPLATE',
        'Tao moi sub specialization',
        'INSERT INTO sub_specializations (code, name, specialization_id, created_at, updated_at)
        VALUES (%s, %s, %s, NOW(), NOW()) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'sub_code,sub_name,spec_code'
    ),
    (
        'create_user',
        'BACKEND_ACTION',
        'Tao moi user',
        NULL,
        NULL,
        TRUE,
        'ADMIN',
        NULL
    ),
    (
        'delete_class',
        'SQL_TEMPLATE',
        'Xoa class',
        'DELETE FROM class_sections WHERE class_name=%s RETURNING class_name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'delete_room',
        'SQL_TEMPLATE',
        'Xoa room',
        'UPDATE rooms           SET status=''INACTIVE'', updated_at=NOW() WHERE unaccent(name) ILIKE unaccent(%s) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'room_name'
    ),
    (
        'delete_semester',
        'SQL_TEMPLATE',
        'Xoa semester',
        'UPDATE semesters       SET status=''CLOSED'',   updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code'
    ),
    (
        'delete_user',
        'BACKEND_ACTION',
        'Xoa user',
        NULL,
        NULL,
        TRUE,
        'ADMIN',
        NULL
    ),
    (
        'excel_query',
        'SQL_TEMPLATE',
        'Xu ly excel query',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'export_attendance_stats',
        'BACKEND_ACTION',
        'Xuat du lieu attendance stats',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        NULL
    ),
    (
        'export_excel',
        'BACKEND_ACTION',
        'Xuat du lieu excel',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER',
        NULL
    ),
    (
        'get_abnormal_attendance',
        'SQL_TEMPLATE',
        'Truy van du lieu get abnormal attendance',
        'SELECT u.full_name, u.code,
               ts.class_name, ts.date,
               sa.status, sa.method,
               sa.created_at,
               ats.opened_at,
               EXTRACT(EPOCH FROM (sa.created_at - ats.opened_at))::int AS seconds_after_open
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id = u.id
        WHERE  sa.method = ''QR_CODE''
          AND  sa.created_at < (ats.opened_at + INTERVAL ''30 seconds'')
        ORDER BY sa.created_at DESC
        LIMIT  100',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_active_semester',
        'SQL_TEMPLATE',
        'Truy van du lieu get active semester',
        'SELECT s.code, s.name, s.start_date, s.end_date, s.status,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT e.student_id)   AS enrolled_students,
               COUNT(DISTINCT cs.lecturer_id) AS active_lecturers
        FROM   semesters s
        LEFT JOIN class_sections cs ON s.id = cs.semester_id
        LEFT JOIN enrollments     e  ON cs.class_name = e.class_name
        WHERE  s.status = ''ONGOING''
        GROUP BY s.code, s.name, s.start_date, s.end_date, s.status
        ORDER BY s.start_date DESC
        LIMIT  1',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'get_all_rooms_today',
        'SQL_TEMPLATE',
        'Truy van du lieu get all rooms today',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_attendance_by_session_id',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance by session id',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'session_id'
    ),
    (
        'get_attendance_by_slot',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance by slot',
        'SELECT u.full_name, u.code,
               COALESCE(sp.gpa, 0)  AS gpa,
               sa.status, sa.method,
               sa.created_at        AS checked_at,
               ats.opened_at        AS session_opened_at
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id = u.id
        LEFT JOIN student_profiles sp  ON u.id = sp.user_id
        WHERE  unaccent(ts.class_name) ILIKE unaccent(%s)
          AND  ts.date = %s::date
        ORDER BY sa.status, u.full_name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'class_name,date'
    ),
    (
        'get_attendance_by_slot_number',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance by slot number',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'slot_number,date'
    ),
    (
        'get_attendance_heatmap',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance heatmap',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_attendance_rate_by_course',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance rate by course',
        'SELECT c.name AS course_name, c.code AS course_code,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT sa.student_id)  AS student_count,
               COUNT(sa.id)                   AS total_records,
               ROUND(100.0 * SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS present_rate,
               ROUND(100.0 * SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id  = c.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s)
            OR unaccent(c.code) ILIKE unaccent(%s)
        GROUP BY c.name, c.code',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'course_name,course_code'
    ),
    (
        'get_attendance_report_by_student',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance report by student',
        'SELECT c.name AS course_name, ts.class_name,
               COUNT(DISTINCT ts.date)                                                  AS total_sessions,
               SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)                 AS present,
               SUM(CASE WHEN sa.status = ''ABSENT''  THEN 1 ELSE 0 END)                 AS absent,
               SUM(CASE WHEN sa.status = ''LATE''    THEN 1 ELSE 0 END)                 AS late,
               ROUND(100.0 * SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1)                               AS attendance_rate,
               MAX(CASE WHEN sa.status = ''ABSENT'' THEN ts.date END)                   AS last_absence_date
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id  = c.id
        WHERE  sa.student_id = %s
        GROUP BY c.name, ts.class_name
        ORDER BY attendance_rate ASC',
        NULL,
        TRUE,
        'STUDENT',
        NULL
    ),
    (
        'get_attendance_stats_by_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance stats by class',
        'SELECT
            COUNT(DISTINCT sa.student_id)                                              AS total_students,
            COUNT(sa.id)                                                               AS total_records,
            SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)                   AS present,
            SUM(CASE WHEN sa.status = ''ABSENT''  THEN 1 ELSE 0 END)                   AS absent,
            SUM(CASE WHEN sa.status = ''LATE''    THEN 1 ELSE 0 END)                   AS late,
            ROUND(100.0 * SUM(CASE WHEN sa.status = ''PRESENT'' THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sa.id), 0), 1)                                 AS present_rate,
            ROUND(100.0 * SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sa.id), 0), 1)                                 AS absent_rate,
            SUM(CASE WHEN sa.method = ''QR_CODE'' THEN 1 ELSE 0 END)                   AS qr_checkins,
            SUM(CASE WHEN sa.method = ''MANUAL''  THEN 1 ELSE 0 END)                   AS manual_checkins,
            COUNT(DISTINCT ts.date)                                                    AS total_sessions
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  unaccent(ts.class_name) ILIKE unaccent(%s)',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'class_name'
    ),
    (
        'get_attendance_trends',
        'SQL_TEMPLATE',
        'Truy van du lieu get attendance trends',
        'WITH cls AS (
            SELECT DISTINCT ts.class_name
            FROM timetable_slots ts
            WHERE unaccent(ts.class_name) ILIKE unaccent(%s)
            ORDER BY
                CASE WHEN unaccent(ts.class_name) = unaccent(%s) THEN 0 ELSE 1 END,
                LENGTH(ts.class_name)
            LIMIT 1
        )
        SELECT TO_CHAR(ts.date, ''Day'') AS day_of_week,
               EXTRACT(DOW FROM ts.date)::int AS day_num,
               ts.slot_number,
               COUNT(sa.id)                                           AS total_records,
               SUM(CASE WHEN sa.status = ''ABSENT''  THEN 1 ELSE 0 END) AS absent_count,
               SUM(CASE WHEN sa.status = ''LATE''    THEN 1 ELSE 0 END) AS late_count,
               ROUND(100.0 * SUM(CASE WHEN sa.status = ''ABSENT'' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1)              AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  ts.class_name = (SELECT class_name FROM cls)
        GROUP BY day_of_week, day_num, ts.slot_number
        ORDER BY absent_rate DESC',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_available_classes_for_student',
        'SQL_TEMPLATE',
        'Truy van du lieu get available classes for student',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name,student_code'
    ),
    (
        'get_available_slots_for_room',
        'SQL_TEMPLATE',
        'Truy van du lieu get available slots for room',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'room_name,date'
    ),
    (
        'get_best_performing_classes',
        'SQL_TEMPLATE',
        'Truy van du lieu get best performing classes',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_class_health_check',
        'SQL_TEMPLATE',
        'Truy van du lieu get class health check',
        'WITH cls AS (
            SELECT cs.class_name
            FROM class_sections cs
            WHERE unaccent(cs.class_name) ILIKE unaccent(%s)
            ORDER BY
                CASE WHEN unaccent(cs.class_name) = unaccent(%s) THEN 0 ELSE 1 END,
                LENGTH(cs.class_name)
            LIMIT 1
        )
        SELECT cs.class_name,
               c.name        AS course_name,
               c.credits,
               u.full_name   AS lecturer,
               u.email       AS lecturer_email,
               sem.name      AS semester,
               (SELECT COUNT(*) FROM enrollments WHERE class_name = cs.class_name)
                             AS total_students,
               (SELECT ROUND(AVG(score), 2) FROM student_grades sg
                JOIN enrollments e ON sg.enrollment_id = e.id
                WHERE e.class_name = cs.class_name)
                             AS avg_score,
               (SELECT ROUND(100.0 * SUM(CASE WHEN sa.status=''ABSENT'' THEN 1 ELSE 0 END)
                            / NULLIF(COUNT(sa.id), 0), 1)
                FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                JOIN timetable_slots ts2 ON ats.timetable_slot_id = ts2.id
                WHERE ts2.class_name = cs.class_name)
                             AS absent_rate,
               (SELECT COUNT(DISTINCT e.student_id)
                FROM enrollments e
                LEFT JOIN student_profiles sp ON e.student_id = sp.user_id
                WHERE e.class_name = cs.class_name
                  AND sp.gpa < 2.0)
                             AS low_gpa_count,
               (SELECT COUNT(DISTINCT ts2.id)
                FROM timetable_slots ts2 WHERE ts2.class_name = cs.class_name)
                             AS total_slots
        FROM   class_sections cs
        JOIN   courses  c   ON cs.course_id  = c.id
        JOIN   semesters sem ON cs.semester_id = sem.id
        LEFT JOIN users  u   ON cs.lecturer_id = u.id
        WHERE  cs.class_name = (SELECT class_name FROM cls)',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_class_info',
        'SQL_TEMPLATE',
        'Truy van du lieu get class info',
        'SELECT cs.class_name,
               c.name    AS course_name,
               c.code    AS course_code,
               c.credits,
               u.full_name AS lecturer_name,
               u.code      AS lecturer_code,
               u.email     AS lecturer_email,
               s.name    AS semester,
               s.start_date, s.end_date,
               COUNT(DISTINCT e.student_id)  AS student_count,
               ROUND(AVG(sp.gpa), 2)         AS avg_student_gpa,
               COUNT(DISTINCT ts.id)         AS total_slots_scheduled,
               (SELECT ROUND(100.0 * SUM(CASE WHEN sa.status=''PRESENT'' THEN 1 ELSE 0 END)
                             / NULLIF(COUNT(sa.id),0), 1)
                FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                JOIN timetable_slots ts ON ats.timetable_slot_id = ts.id
                WHERE ts.class_name = cs.class_name) AS overall_attendance_rate
        FROM   class_sections cs
        JOIN   courses         c  ON cs.course_id   = c.id
        JOIN   semesters       s  ON cs.semester_id = s.id
        LEFT JOIN users        u  ON cs.lecturer_id = u.id
        LEFT JOIN enrollments  e  ON cs.class_name  = e.class_name
        LEFT JOIN student_profiles sp ON e.student_id = sp.user_id
        LEFT JOIN timetable_slots  ts ON cs.class_name = ts.class_name
        WHERE  unaccent(cs.class_name) ILIKE unaccent(%s)
        GROUP BY cs.class_name, c.name, c.code, c.credits,
                 u.full_name, u.code, u.email, s.name, s.start_date, s.end_date',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'class_name'
    ),
    (
        'get_class_leaderboard',
        'SQL_TEMPLATE',
        'Truy van du lieu get class leaderboard',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_class_next_session',
        'SQL_TEMPLATE',
        'Truy van du lieu get class next session',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_class_schedule',
        'SQL_TEMPLATE',
        'Truy van du lieu get class schedule',
        'SELECT ts.date, ts.slot_number,
               r.name      AS room,
               r.capacity  AS room_capacity,
               st.start_time, st.end_time,
               ts.status,
               (SELECT COUNT(DISTINCT sa.student_id) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                WHERE ats.timetable_slot_id = ts.id
                  AND sa.status = ''PRESENT'') AS present_count
        FROM   timetable_slots ts
        LEFT JOIN rooms      r  ON ts.room_id      = r.id
        LEFT JOIN slot_types st ON ts.slot_type_id = st.id
        WHERE  ts.class_name = %s
          AND  ts.date BETWEEN %s AND %s
        ORDER BY ts.date, ts.slot_number
        LIMIT  50',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        'class_name,date'
    ),
    (
        'get_classes_by_semester',
        'SQL_TEMPLATE',
        'Truy van du lieu get classes by semester',
        'SELECT cs.class_name,
               c.name    AS course_name,
               c.credits,
               u.full_name AS lecturer_name,
               u.code      AS lecturer_code,
               s.name    AS semester,
               COUNT(e.student_id) AS enrolled_count
        FROM   class_sections cs
        JOIN   semesters       s   ON cs.semester_id = s.id
        JOIN   courses         c   ON cs.course_id   = c.id
        LEFT JOIN users        u   ON cs.lecturer_id = u.id
        LEFT JOIN enrollments  e   ON cs.class_name  = e.class_name
        WHERE  (
               unaccent(s.code) ILIKE unaccent(%s)
            OR unaccent(s.name) ILIKE unaccent(%s)
            OR replace(unaccent(lower(s.name)), '' '', '''') ILIKE replace(unaccent(lower(%s)), '' '', '''')
            OR replace(unaccent(lower(s.code)), '' '', '''') ILIKE replace(unaccent(lower(%s)), '' '', '''')
        )
          AND  (cs.lecturer_id = %s OR %s = -1)
        GROUP BY cs.class_name, c.name, c.credits, u.full_name, u.code, s.name
        ORDER BY cs.class_name
        LIMIT  100',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'semester_code,semester_name'
    ),
    (
        'get_classmates',
        'SQL_TEMPLATE',
        'Truy van du lieu get classmates',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code'
    ),
    (
        'get_consecutive_absences',
        'SQL_TEMPLATE',
        'Truy van du lieu get consecutive absences',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name,threshold_absences'
    ),
    (
        'get_courses_by_name',
        'SQL_TEMPLATE',
        'Truy van du lieu get courses by name',
        'SELECT c.code, c.name, c.credits, c.status,
               COUNT(DISTINCT cs.class_name)    AS total_classes,
               COUNT(DISTINCT e.student_id)     AS total_students_ever,
               string_agg(DISTINCT sem.name, '', '') AS offered_in_semesters
        FROM   courses c
        LEFT JOIN class_sections cs  ON c.id = cs.course_id
        LEFT JOIN enrollments     e  ON cs.class_name = e.class_name
        LEFT JOIN semesters       sem ON cs.semester_id = sem.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s)
           OR  unaccent(c.code) ILIKE unaccent(%s)
        GROUP BY c.code, c.name, c.credits, c.status
        LIMIT  20',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        'course_name,course_code'
    ),
    (
        'get_courses_by_spec',
        'SQL_TEMPLATE',
        'Truy van du lieu get courses by spec',
        'SELECT c.code, c.name, c.credits, sc.semester,
               COUNT(DISTINCT cs.class_name) AS total_classes
        FROM   courses c
        JOIN   specialization_courses sc ON c.id = sc.course_id
        JOIN   specializations         s  ON sc.specialization_id = s.id
        LEFT JOIN class_sections       cs ON c.id = cs.course_id
        WHERE  (unaccent(s.name) ILIKE unaccent(%s)
             OR unaccent(s.code) ILIKE unaccent(%s)
             OR %s = '''')
        GROUP BY c.code, c.name, c.credits, sc.semester
        ORDER BY sc.semester, c.name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,STUDENT',
        'specialization_name,specialization_code,major_name'
    ),
    (
        'get_courses_by_sub_spec',
        'SQL_TEMPLATE',
        'Truy van du lieu get courses by sub spec',
        'SELECT c.code, c.name, c.credits,
               ss.name AS sub_spec_name
        FROM   courses c
        JOIN   sub_specialization_courses ssc ON c.id = ssc.course_id
        JOIN   sub_specializations         ss  ON ssc.sub_specialization_id = ss.id
        WHERE  (unaccent(ss.name) ILIKE unaccent(%s)
             OR unaccent(ss.code) ILIKE unaccent(%s)
             OR %s = '''')
        ORDER BY c.name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,STUDENT',
        'sub_specialization_name,sub_specialization_code,specialization_name'
    ),
    (
        'get_detail_course_grade',
        'SQL_TEMPLATE',
        'Truy van du lieu get detail course grade',
        'SELECT gc.name AS component, gc.type, gc.weight,
               sg.score, sg.attempt,
               ROUND(sg.score * gc.weight / 100.0, 2) AS weighted_score,
               c.name AS course_name, c.code AS course_code, c.credits,
               cs.class_name, sem.name AS semester
        FROM   student_grades  sg
        JOIN   enrollments      e  ON sg.enrollment_id      = e.id
        JOIN   grade_components gc ON sg.grade_component_id = gc.id
        JOIN   courses          c  ON gc.course_id          = c.id
        JOIN   class_sections   cs ON e.class_name          = cs.class_name
        JOIN   semesters       sem ON cs.semester_id        = sem.id
        WHERE  e.student_id = %s
          AND  (unaccent(c.name) ILIKE unaccent(%s) OR unaccent(c.code) ILIKE unaccent(%s))
        ORDER BY gc.weight DESC',
        NULL,
        TRUE,
        'STUDENT',
        'course_name,course_code'
    ),
    (
        'get_empty_rooms',
        'SQL_TEMPLATE',
        'Truy van du lieu get empty rooms',
        'SELECT r.name, r.capacity, r.status,
               (SELECT COUNT(*) FROM timetable_slots ts2
                WHERE ts2.room_id = r.id
                  AND ts2.date = %s::date) AS slots_used_today
        FROM   rooms r
        WHERE  r.id NOT IN (
            SELECT ts.room_id FROM timetable_slots ts
            WHERE  ts.date = %s::date
              AND  ts.slot_number = %s
              AND  ts.room_id IS NOT NULL
        )
          AND  r.status = ''ACTIVE''
        ORDER BY r.capacity DESC, r.name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'date,slot_number'
    ),
    (
        'get_enrollments_by_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get enrollments by class',
        'SELECT u.full_name, u.code, u.email, u.phone,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '''')  AS major,
               e.class_name,
               (SELECT COUNT(*) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                JOIN timetable_slots ts ON ats.timetable_slot_id = ts.id
                WHERE sa.student_id = u.id AND ts.class_name = e.class_name
                  AND sa.status = ''ABSENT'') AS absences
        FROM   users u
        JOIN   enrollments e ON u.id = e.student_id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  unaccent(e.class_name) ILIKE unaccent(%s)
        ORDER BY sp.gpa DESC NULLS LAST, u.full_name
        LIMIT  200',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'class_name'
    ),
    (
        'get_full_grade_sheet',
        'SQL_TEMPLATE',
        'Truy van du lieu get full grade sheet',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_gpa_attendance_correlation',
        'SQL_TEMPLATE',
        'Truy van du lieu get gpa attendance correlation',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_gpa_stats_by_major',
        'SQL_TEMPLATE',
        'Truy van du lieu get gpa stats by major',
        'SELECT m.name  AS major,
               m.code  AS major_code,
               COUNT(sp.user_id)             AS total_students,
               ROUND(AVG(sp.gpa), 2)         AS avg_gpa,
               MAX(sp.gpa)                   AS max_gpa,
               MIN(sp.gpa)                   AS min_gpa,
               ROUND(STDDEV(sp.gpa), 2)      AS std_deviation,
               SUM(CASE WHEN sp.gpa >= 3.6 THEN 1 ELSE 0 END) AS excellent,
               SUM(CASE WHEN sp.gpa >= 3.2 AND sp.gpa < 3.6 THEN 1 ELSE 0 END) AS very_good,
               SUM(CASE WHEN sp.gpa >= 2.5 AND sp.gpa < 3.2 THEN 1 ELSE 0 END) AS good,
               SUM(CASE WHEN sp.gpa <  2.5 THEN 1 ELSE 0 END) AS below_average
        FROM   student_profiles sp
        JOIN   majors           m  ON sp.major_id = m.id
        JOIN   users            u  ON sp.user_id  = u.id AND u.status = ''ACTIVE''
        GROUP BY m.name, m.code
        ORDER BY avg_gpa DESC',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_grade_components_by_course',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade components by course',
        'SELECT gc.name, gc.type, gc.weight,
               COUNT(DISTINCT sg.id)          AS total_grades_entered,
               ROUND(AVG(sg.score), 2)        AS avg_score,
               MAX(sg.score)                  AS max_score,
               MIN(sg.score)                  AS min_score
        FROM   grade_components gc
        JOIN   courses          c  ON gc.course_id = c.id
        LEFT JOIN student_grades sg ON gc.id = sg.grade_component_id
        WHERE  unaccent(c.name) ILIKE unaccent(%s)
            OR unaccent(c.code) ILIKE unaccent(%s)
        GROUP BY gc.name, gc.type, gc.weight
        ORDER BY gc.weight DESC',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        'course_name,course_code'
    ),
    (
        'get_grade_distribution',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade distribution',
        'SELECT CASE
                 WHEN score >= 8.5 THEN ''A (8.5–10)''
                 WHEN score >= 7.0 THEN ''B (7.0–8.4)''
                 WHEN score >= 5.5 THEN ''C (5.5–6.9)''
                 WHEN score >= 4.0 THEN ''D (4.0–5.4)''
                 ELSE ''F (<4.0)''
               END AS grade_tier,
               COUNT(*)  AS student_count,
               ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS percentage
        FROM   student_grades sg
        JOIN   enrollments     e  ON sg.enrollment_id = e.id
        JOIN   grade_components gc ON sg.grade_component_id = gc.id
        WHERE  e.class_name = (
            SELECT x.class_name
            FROM (
                SELECT DISTINCT e2.class_name
                FROM enrollments e2
                WHERE unaccent(e2.class_name) ILIKE unaccent(%s)
                ORDER BY
                    CASE WHEN unaccent(e2.class_name) = unaccent(%s) THEN 0 ELSE 1 END,
                    LENGTH(e2.class_name)
                LIMIT 1
            ) x
        )
          AND gc.type = ''FINAL''
        GROUP BY grade_tier
        ORDER BY grade_tier',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_grade_histogram',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade histogram',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_grade_improvement_on_retake',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade improvement on retake',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'course_code,course_name'
    ),
    (
        'get_grade_report_by_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade report by class',
        'SELECT u.full_name, u.code,
               COALESCE(sp.gpa, 0) AS overall_gpa,
               ROUND(SUM(sg.score * gc.weight) / NULLIF(SUM(gc.weight), 0), 2) AS final_score,
               MAX(CASE WHEN gc.type = ''PROGRESS'' THEN sg.score END)  AS progress_score,
               MAX(CASE WHEN gc.type = ''MIDTERM''  THEN sg.score END)  AS midterm_score,
               MAX(CASE WHEN gc.type = ''FINAL''    THEN sg.score END)  AS final_exam_score,
               COUNT(DISTINCT sg.grade_component_id) AS components_graded
        FROM   student_grades   sg
        JOIN   enrollments       e  ON sg.enrollment_id      = e.id
        JOIN   grade_components  gc ON sg.grade_component_id = gc.id
        JOIN   users             u  ON e.student_id          = u.id
        JOIN   class_sections    cs ON e.class_name          = cs.class_name
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE  unaccent(cs.class_name) ILIKE unaccent(%s)
        GROUP BY u.full_name, u.code, sp.gpa
        ORDER BY final_score DESC NULLS LAST',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'class_name'
    ),
    (
        'get_grade_report_by_course',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade report by course',
        'SELECT
            COUNT(DISTINCT e.student_id)                                               AS total_students,
            ROUND(AVG(sg.score), 2)                                                    AS avg_score,
            MAX(sg.score)                                                               AS max_score,
            MIN(sg.score)                                                               AS min_score,
            ROUND(STDDEV(sg.score), 2)                                                 AS std_deviation,
            SUM(CASE WHEN sg.score >= 8.5 THEN 1 ELSE 0 END)                         AS grade_A,
            SUM(CASE WHEN sg.score >= 7.0 AND sg.score < 8.5 THEN 1 ELSE 0 END)      AS grade_B,
            SUM(CASE WHEN sg.score >= 5.5 AND sg.score < 7.0 THEN 1 ELSE 0 END)      AS grade_C,
            SUM(CASE WHEN sg.score >= 4.0 AND sg.score < 5.5 THEN 1 ELSE 0 END)      AS grade_D,
            SUM(CASE WHEN sg.score < 4.0  THEN 1 ELSE 0 END)                         AS grade_F,
            SUM(CASE WHEN sg.score >= 5.0 THEN 1 ELSE 0 END)                         AS passed,
            SUM(CASE WHEN sg.score <  5.0 THEN 1 ELSE 0 END)                         AS failed,
            ROUND(100.0 * SUM(CASE WHEN sg.score >= 5.0 THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sg.id), 0), 1)                                  AS pass_rate
        FROM   student_grades  sg
        JOIN   enrollments      e  ON sg.enrollment_id      = e.id
        JOIN   grade_components gc ON sg.grade_component_id = gc.id
        JOIN   courses          c  ON gc.course_id          = c.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s)
            OR unaccent(c.code) ILIKE unaccent(%s)',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'course_name,course_code'
    ),
    (
        'get_grade_trend_by_student',
        'SQL_TEMPLATE',
        'Truy van du lieu get grade trend by student',
        'SELECT c.name AS course_name, gc.name AS component, gc.type,
               sg.attempt, sg.score,
               sem.name AS semester, sem.start_date
        FROM   student_grades  sg
        JOIN   enrollments      e   ON sg.enrollment_id      = e.id
        JOIN   grade_components gc  ON sg.grade_component_id = gc.id
        JOIN   courses          c   ON gc.course_id          = c.id
        JOIN   class_sections   cs  ON e.class_name          = cs.class_name
        JOIN   semesters       sem  ON cs.semester_id        = sem.id
        WHERE  e.student_id = %s
        ORDER BY sem.start_date ASC, c.name, sg.attempt',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'course_name,course_code'
    ),
    (
        'get_graduation_eligible_students',
        'SQL_TEMPLATE',
        'Truy van du lieu get graduation eligible students',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'credit_threshold'
    ),
    (
        'get_high_risk_classes',
        'SQL_TEMPLATE',
        'Truy van du lieu get high risk classes',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_idle_lecturers',
        'SQL_TEMPLATE',
        'Truy van du lieu get idle lecturers',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,lecturer_code'
    ),
    (
        'get_lecturer_by_code',
        'SQL_TEMPLATE',
        'Truy van du lieu get lecturer by code',
        'SELECT u.full_name, u.code, u.email, u.phone, u.role, u.status,
               COALESCE(lp.expertise,  '''') AS expertise,
               COALESCE(lp.department, '''') AS department,
               COUNT(DISTINCT cs.class_name)  AS active_classes,
               COUNT(DISTINCT cs.course_id)   AS distinct_courses
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections    cs ON u.id = cs.lecturer_id
        LEFT JOIN semesters         s  ON cs.semester_id = s.id AND s.status = ''ACTIVE''
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = ''LECTURER''
        GROUP BY u.full_name, u.code, u.email, u.phone, u.role, u.status, lp.expertise, lp.department',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'lecturer_code,full_name'
    ),
    (
        'get_lecturer_workload',
        'SQL_TEMPLATE',
        'Truy van du lieu get lecturer workload',
        'SELECT u.full_name, u.code,
               COALESCE(lp.department, '''') AS department,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT cs.course_id)   AS distinct_courses,
               COUNT(DISTINCT e.student_id)   AS total_students,
               COUNT(DISTINCT sem.id)          AS semesters_active,
               string_agg(DISTINCT sem.name, '', '') AS semester_names
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections    cs ON u.id = cs.lecturer_id
        LEFT JOIN semesters        sem ON cs.semester_id = sem.id
        LEFT JOIN enrollments       e  ON cs.class_name = e.class_name
        WHERE  u.role = ''LECTURER'' AND u.status = ''ACTIVE''
          AND  (unaccent(u.full_name) ILIKE unaccent(%s) OR u.code = %s OR %s = '''')
        GROUP BY u.full_name, u.code, lp.department
        ORDER BY total_students DESC
        LIMIT  30',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'lecturer_code,full_name,semester_code,semester_name'
    ),
    (
        'get_lecturer_workload_comparison',
        'SQL_TEMPLATE',
        'Truy van du lieu get lecturer workload comparison',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_lecturers_by_expertise',
        'SQL_TEMPLATE',
        'Truy van du lieu get lecturers by expertise',
        'SELECT DISTINCT u.full_name, u.code, u.email,
               COALESCE(lp.expertise,  '''') AS expertise,
               COALESCE(lp.department, '''') AS department,
               string_agg(DISTINCT c.name, '', '') AS courses_taught
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections cs ON cs.lecturer_id = u.id
        LEFT JOIN courses        c  ON cs.course_id   = c.id
        WHERE  u.role = ''LECTURER''
          AND  u.status = ''ACTIVE''
          AND  (unaccent(c.name) ILIKE unaccent(%s)
             OR unaccent(c.code) ILIKE unaccent(%s)
             OR unaccent(lp.department) ILIKE unaccent(%s)
             OR unaccent(lp.expertise) ILIKE unaccent(%s))
        GROUP BY u.full_name, u.code, u.email, lp.expertise, lp.department
        ORDER BY u.full_name
        LIMIT  30',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'expertise,department,course_name,course_code'
    ),
    (
        'get_lecturers_by_major',
        'SQL_TEMPLATE',
        'Truy van du lieu get lecturers by major',
        'SELECT DISTINCT u.full_name, u.code, u.email,
               COALESCE(lp.expertise,  '''') AS expertise,
               COALESCE(lp.department, '''') AS department,
               string_agg(DISTINCT c.name,  '', '') AS courses_taught,
               COUNT(DISTINCT cs.class_name)       AS total_classes
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections cs ON cs.lecturer_id = u.id
        LEFT JOIN courses        c  ON cs.course_id   = c.id
        WHERE  u.role = ''LECTURER''
          AND  u.status = ''ACTIVE''
          AND  (unaccent(c.name) ILIKE unaccent(%s)
             OR unaccent(c.code) ILIKE unaccent(%s)
             OR unaccent(lp.department) ILIKE unaccent(%s)
             OR unaccent(lp.expertise) ILIKE unaccent(%s)
             OR %s = '''')
        GROUP BY u.full_name, u.code, u.email, lp.expertise, lp.department
        ORDER BY total_classes DESC, u.full_name
        LIMIT  50',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'major_name,major_code,department,course_name'
    ),
    (
        'get_lecturers_teaching_today',
        'SQL_TEMPLATE',
        'Truy van du lieu get lecturers teaching today',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'date'
    ),
    (
        'get_major_curriculum_tree',
        'SQL_TEMPLATE',
        'Truy van du lieu get major curriculum tree',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'major_code,major_name'
    ),
    (
        'get_makeup_slot_candidates',
        'SQL_TEMPLATE',
        'Truy van du lieu get makeup slot candidates',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'start_time,end_time,class_name'
    ),
    (
        'get_most_absent_students',
        'SQL_TEMPLATE',
        'Truy van du lieu get most absent students',
        'WITH cls AS (
            SELECT DISTINCT ts.class_name
            FROM timetable_slots ts
            WHERE unaccent(ts.class_name) ILIKE unaccent(%s)
            ORDER BY
                CASE WHEN unaccent(ts.class_name) = unaccent(%s) THEN 0 ELSE 1 END,
                LENGTH(ts.class_name)
            LIMIT 1
        )
        SELECT u.full_name, u.code,
               COALESCE(sp.gpa, 0) AS gpa,
               COUNT(CASE WHEN sa.status = ''ABSENT''  THEN 1 END) AS absences,
               COUNT(CASE WHEN sa.status = ''LATE''    THEN 1 END) AS lates,
               COUNT(CASE WHEN sa.status = ''PRESENT'' THEN 1 END) AS presents,
               COUNT(sa.id) AS total_sessions,
               ROUND(100.0 * COUNT(CASE WHEN sa.status=''ABSENT'' THEN 1 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id = u.id
        LEFT JOIN student_profiles sp  ON u.id = sp.user_id
        WHERE  ts.class_name = (SELECT class_name FROM cls)
        GROUP BY u.full_name, u.code, sp.gpa
        HAVING COUNT(CASE WHEN sa.status = ''ABSENT'' THEN 1 END) > 0
        ORDER BY absences DESC, absent_rate DESC
        LIMIT  30',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_my_attendance_status',
        'SQL_TEMPLATE',
        'Truy van du lieu get my attendance status',
        'SELECT ts.class_name, c.name AS course_name,
               ts.date, sa.status, sa.method,
               ats.opened_at,
               sa.created_at AS checked_at
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id  = c.id
        WHERE  sa.student_id = %s
        ORDER BY ts.date DESC, ats.id DESC
        LIMIT  20',
        NULL,
        TRUE,
        'STUDENT',
        NULL
    ),
    (
        'get_my_notifications',
        'SQL_TEMPLATE',
        'Truy van du lieu get my notifications',
        'SELECT n.title, n.content, n.type, n.priority,
               n.sent_at, nr.is_read, nr.read_at
        FROM   notifications n
        JOIN   notification_recipients nr ON n.id = nr.notification_id
        WHERE  nr.recipient_id = %s
        ORDER BY n.sent_at DESC
        LIMIT  20',
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'get_my_schedule_requests',
        'SQL_TEMPLATE',
        'Truy van du lieu get my schedule requests',
        'SELECT sr.id, sr.reason, sr.status, sr.created_at,
               ts1.date       AS original_date, ts1.slot_number AS original_slot,
               r1.name        AS original_room,
               ts2.date       AS target_date,   ts2.slot_number AS target_slot,
               r2.name        AS target_room,
               cs1.class_name AS class_name
        FROM   schedule_requests sr
        LEFT JOIN timetable_slots ts1 ON sr.original_slot_id = ts1.id
        LEFT JOIN timetable_slots ts2 ON sr.requested_slot_id   = ts2.id
        LEFT JOIN rooms           r1  ON ts1.room_id = r1.id
        LEFT JOIN rooms           r2  ON ts2.room_id = r2.id
        LEFT JOIN class_sections  cs1 ON ts1.class_name = cs1.class_name
        WHERE  sr.requester_id = %s
        ORDER BY sr.created_at DESC
        LIMIT  30',
        NULL,
        TRUE,
        'LECTURER',
        NULL
    ),
    (
        'get_notification_history_for_user',
        'SQL_TEMPLATE',
        'Truy van du lieu get notification history for user',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'user_code'
    ),
    (
        'get_open_sessions_now',
        'SQL_TEMPLATE',
        'Truy van du lieu get open sessions now',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_other_lecturer_schedule',
        'SQL_TEMPLATE',
        'Truy van du lieu get other lecturer schedule',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'lecturer_code,full_name,date'
    ),
    (
        'get_other_student_schedule',
        'SQL_TEMPLATE',
        'Truy van du lieu get other student schedule',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code,full_name,date'
    ),
    (
        'get_overdue_urgent_notifications',
        'SQL_TEMPLATE',
        'Truy van du lieu get overdue urgent notifications',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_own_grades',
        'SQL_TEMPLATE',
        'Truy van du lieu get own grades',
        NULL,
        NULL,
        TRUE,
        'STUDENT',
        NULL
    ),
    (
        'get_own_schedule',
        'SQL_TEMPLATE',
        'Truy van du lieu get own schedule',
        NULL,
        NULL,
        TRUE,
        'LECTURER,STUDENT',
        NULL
    ),
    (
        'get_rescheduled_slots',
        'SQL_TEMPLATE',
        'Truy van du lieu get rescheduled slots',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_room_fill_rate_by_weekday',
        'SQL_TEMPLATE',
        'Truy van du lieu get room fill rate by weekday',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'room_name'
    ),
    (
        'get_room_info',
        'SQL_TEMPLATE',
        'Truy van du lieu get room info',
        'SELECT r.name, r.capacity, r.status,
               COUNT(DISTINCT ts.date)        AS days_used,
               COUNT(ts.id)                   AS total_slots_scheduled
        FROM   rooms r
        LEFT JOIN timetable_slots ts ON r.id = ts.room_id
        WHERE  unaccent(r.name) ILIKE unaccent(%s)
        GROUP BY r.name, r.capacity, r.status
        LIMIT  5',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'room_name'
    ),
    (
        'get_room_usage_weekly',
        'SQL_TEMPLATE',
        'Truy van du lieu get room usage weekly',
        'SELECT r.name AS room, r.capacity,
               ts.date, ts.slot_number,
               cs.class_name,
               c.name  AS course_name,
               u.full_name AS lecturer,
               st.start_time, st.end_time
        FROM   rooms r
        JOIN   timetable_slots ts ON r.id = ts.room_id
        JOIN   class_sections  cs ON ts.class_name = cs.class_name
        JOIN   courses          c  ON cs.course_id  = c.id
        LEFT JOIN users         u  ON cs.lecturer_id = u.id
        LEFT JOIN slot_types    st ON ts.slot_type_id = st.id
        WHERE  unaccent(r.name) ILIKE unaccent(%s)
          AND  ts.date BETWEEN %s AND %s
        ORDER BY ts.date, ts.slot_number
        LIMIT  100',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'room_name,date'
    ),
    (
        'get_rooms_busy_now',
        'SQL_TEMPLATE',
        'Truy van du lieu get rooms busy now',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_schedule_request_detail',
        'SQL_TEMPLATE',
        'Truy van du lieu get schedule request detail',
        'SELECT sr.id, u.full_name AS requester, u.code AS requester_code,
               u.email AS requester_email,
               sr.reason, sr.status, sr.created_at,
               ts1.date       AS original_date, ts1.slot_number AS original_slot,
               r1.name        AS original_room,
               cs1.class_name AS class_name,
               c1.name        AS course_name,
               ts2.date       AS target_date,   ts2.slot_number AS target_slot,
               r2.name        AS target_room
        FROM   schedule_requests sr
        JOIN   users              u    ON sr.requester_id    = u.id
        LEFT JOIN timetable_slots ts1  ON sr.original_slot_id = ts1.id
        LEFT JOIN timetable_slots ts2  ON sr.requested_slot_id   = ts2.id
        LEFT JOIN rooms           r1   ON ts1.room_id = r1.id
        LEFT JOIN rooms           r2   ON ts2.room_id = r2.id
        LEFT JOIN class_sections  cs1  ON ts1.class_name = cs1.class_name
        LEFT JOIN courses         c1   ON cs1.course_id  = c1.id
        WHERE  sr.id = %s',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'request_id'
    ),
    (
        'get_schedule_request_list',
        'SQL_TEMPLATE',
        'Truy van du lieu get schedule request list',
        'SELECT sr.id, u.full_name AS requester, u.code AS requester_code,
               sr.reason, sr.status, sr.created_at,
               ts1.date       AS original_date, ts1.slot_number AS original_slot,
               r1.name        AS original_room,
               cs1.class_name AS original_class,
               ts2.date       AS target_date,   ts2.slot_number AS target_slot,
               r2.name        AS target_room
        FROM   schedule_requests sr
        JOIN   users             u    ON sr.requester_id    = u.id
        LEFT JOIN timetable_slots ts1  ON sr.original_slot_id = ts1.id
        LEFT JOIN timetable_slots ts2  ON sr.requested_slot_id = ts2.id
        LEFT JOIN rooms           r1   ON ts1.room_id = r1.id
        LEFT JOIN rooms           r2   ON ts2.room_id = r2.id
        LEFT JOIN class_sections  cs1  ON ts1.class_name = cs1.class_name
        ORDER BY sr.created_at DESC
        LIMIT  50',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_semester_countdown',
        'SQL_TEMPLATE',
        'Truy van du lieu get semester countdown',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_semester_overview',
        'SQL_TEMPLATE',
        'Truy van du lieu get semester overview',
        'SELECT s.code, s.name, s.start_date, s.end_date, s.status,
               COUNT(DISTINCT cs.class_name)   AS total_classes,
               COUNT(DISTINCT cs.course_id)    AS distinct_courses,
               COUNT(DISTINCT cs.lecturer_id)  AS total_lecturers,
               COUNT(DISTINCT e.student_id)    AS total_enrolled_students,
               ROUND(AVG(sp.gpa), 2)           AS avg_student_gpa,
               COUNT(DISTINCT r.id)            AS rooms_used
        FROM   semesters s
        LEFT JOIN class_sections  cs ON s.id = cs.semester_id
        LEFT JOIN enrollments      e  ON cs.class_name = e.class_name
        LEFT JOIN student_profiles sp ON e.student_id  = sp.user_id
        LEFT JOIN timetable_slots  ts ON cs.class_name = ts.class_name
        LEFT JOIN rooms             r  ON ts.room_id   = r.id
        WHERE  (unaccent(s.code) ILIKE unaccent(%s)
             OR unaccent(s.name) ILIKE unaccent(%s)
             OR %s = '''')
        GROUP BY s.code, s.name, s.start_date, s.end_date, s.status
        ORDER BY s.start_date DESC
        LIMIT  5',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_sessions_by_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get sessions by class',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_shared_courses_across_specs',
        'SQL_TEMPLATE',
        'Truy van du lieu get shared courses across specs',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'course_code,course_name'
    ),
    (
        'get_slot_detail_by_id',
        'SQL_TEMPLATE',
        'Truy van du lieu get slot detail by id',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'slot_id'
    ),
    (
        'get_slot_time_info',
        'SQL_TEMPLATE',
        'Truy van du lieu get slot time info',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_slots_by_date',
        'SQL_TEMPLATE',
        'Truy van du lieu get slots by date',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'date'
    ),
    (
        'get_slots_by_slot_number',
        'SQL_TEMPLATE',
        'Truy van du lieu get slots by slot number',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'slot_number,date'
    ),
    (
        'get_slots_by_time_range',
        'SQL_TEMPLATE',
        'Truy van du lieu get slots by time range',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'date,time_start,time_end'
    ),
    (
        'get_specializations_by_major',
        'SQL_TEMPLATE',
        'Truy van du lieu get specializations by major',
        'SELECT s.name, s.code, s.status,
               m.name  AS major_name,
               COUNT(DISTINCT sp.user_id)  AS total_students,
               COUNT(DISTINCT ss.id)       AS sub_spec_count,
               COUNT(DISTINCT sc.course_id) AS course_count
        FROM   specializations s
        JOIN   majors           m  ON s.major_id = m.id
        LEFT JOIN student_profiles sp ON sp.specialization_id = s.id
        LEFT JOIN users             u  ON sp.user_id = u.id AND u.status = ''ACTIVE''
        LEFT JOIN sub_specializations ss ON ss.specialization_id = s.id
        LEFT JOIN specialization_courses sc ON sc.specialization_id = s.id
        WHERE  (unaccent(m.name) ILIKE unaccent(%s)
             OR unaccent(m.code) ILIKE unaccent(%s)
             OR %s = '''')
        GROUP BY s.name, s.code, s.status, m.name
        ORDER BY s.name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,STUDENT',
        'major_name,major_code'
    ),
    (
        'get_student_academic_standing',
        'SQL_TEMPLATE',
        'Truy van du lieu get student academic standing',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code'
    ),
    (
        'get_student_academic_timeline',
        'SQL_TEMPLATE',
        'Truy van du lieu get student academic timeline',
        'SELECT sem.name AS semester, c.name AS course, e.class_name,
               COALESCE(u_lec.full_name, ''N/A'') AS lecturer,
               ROUND(SUM(sg.score * gc.weight) / NULLIF(SUM(gc.weight),0), 2) AS final_score,
               SUM(CASE WHEN sa.status=''PRESENT'' THEN 1 ELSE 0 END)  AS sessions_present,
               SUM(CASE WHEN sa.status=''ABSENT''  THEN 1 ELSE 0 END)  AS sessions_absent,
               sem.start_date
        FROM   enrollments e
        JOIN   class_sections  cs  ON e.class_name   = cs.class_name
        JOIN   courses          c   ON cs.course_id   = c.id
        JOIN   semesters       sem  ON cs.semester_id = sem.id
        LEFT JOIN users        u_lec ON cs.lecturer_id = u_lec.id
        LEFT JOIN student_grades     sg  ON sg.enrollment_id = e.id
        LEFT JOIN grade_components   gc  ON sg.grade_component_id = gc.id
        LEFT JOIN timetable_slots ts ON ts.class_name = e.class_name
        LEFT JOIN attendance_sessions ats ON ats.timetable_slot_id = ts.id
        LEFT JOIN student_attendances sa  ON sa.session_id = ats.id AND sa.student_id = e.student_id
        WHERE  e.student_id = %s
        GROUP BY sem.name, c.name, e.class_name, u_lec.full_name, sem.start_date
        ORDER BY sem.start_date DESC',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code,full_name'
    ),
    (
        'get_student_attendance_by_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get student attendance by class',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code,class_name'
    ),
    (
        'get_student_by_code',
        'SQL_TEMPLATE',
        'Truy van du lieu get student by code',
        'SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.status,
               COALESCE(sp.gpa, 0)      AS gpa,
               COALESCE(m.name,  '''')    AS major,
               COALESCE(m.code,  '''')    AS major_code,
               COALESCE(s.name,  '''')    AS specialization,
               COALESCE(ss.name, '''')    AS sub_specialization,
               (SELECT COUNT(*) FROM enrollments e2 WHERE e2.student_id = u.id)
                                        AS enrolled_classes,
               (SELECT COUNT(*) FROM student_attendances sa2
                JOIN attendance_sessions ats2 ON sa2.session_id = ats2.id
                WHERE sa2.student_id = u.id AND sa2.status = ''ABSENT'')
                                        AS total_absences
        FROM   users u
        LEFT JOIN student_profiles   sp ON u.id = sp.user_id
        LEFT JOIN majors              m  ON sp.major_id = m.id
        LEFT JOIN specializations     s  ON sp.specialization_id = s.id
        LEFT JOIN sub_specializations ss ON sp.sub_specialization_id = ss.id
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = ''STUDENT''
        LIMIT  5',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'student_code,full_name'
    ),
    (
        'get_student_gpa_comparison',
        'SQL_TEMPLATE',
        'Truy van du lieu get student gpa comparison',
        'SELECT u.full_name, u.code,
               sp.gpa AS student_gpa,
               m.name AS major,
               ROUND(AVG(sp2.gpa), 2) AS major_avg_gpa,
               ROUND(sp.gpa - AVG(sp2.gpa), 2) AS gpa_delta,
               RANK() OVER (PARTITION BY sp.major_id ORDER BY sp.gpa DESC) AS rank_in_major,
               COUNT(sp2.user_id) AS total_in_major
        FROM   users u
        JOIN   student_profiles sp  ON u.id = sp.user_id
        JOIN   majors           m   ON sp.major_id = m.id
        JOIN   student_profiles sp2 ON sp2.major_id = sp.major_id
        JOIN   users            u2  ON sp2.user_id = u2.id AND u2.status = ''ACTIVE''
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = ''STUDENT''
        GROUP BY u.full_name, u.code, sp.gpa, m.name, sp.major_id
        LIMIT 1',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code,full_name'
    ),
    (
        'get_student_ranking_in_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get student ranking in class',
        'WITH cls AS (
            SELECT DISTINCT e.class_name
            FROM enrollments e
            WHERE unaccent(e.class_name) ILIKE unaccent(%s)
            ORDER BY
                CASE WHEN unaccent(e.class_name) = unaccent(%s) THEN 0 ELSE 1 END,
                LENGTH(e.class_name)
            LIMIT 1
        )
        SELECT u.full_name, u.code,
               COALESCE(sp.gpa, 0)                 AS overall_gpa,
               ROUND(AVG(sg.score), 2)             AS avg_score,
               MAX(sg.score)                        AS best_score,
               MIN(sg.score)                        AS lowest_score,
               RANK() OVER (ORDER BY AVG(sg.score) DESC NULLS LAST) AS rank,
               COUNT(CASE WHEN sa.status=''ABSENT'' THEN 1 END)       AS absences
        FROM   student_grades sg
        JOIN   enrollments     e  ON sg.enrollment_id = e.id
        JOIN   users           u  ON e.student_id     = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN timetable_slots ts ON ts.class_name = e.class_name
        LEFT JOIN attendance_sessions ats ON ats.timetable_slot_id = ts.id
        LEFT JOIN student_attendances sa  ON sa.session_id = ats.id AND sa.student_id = u.id
        WHERE  e.class_name = (SELECT class_name FROM cls)
        GROUP BY u.full_name, u.code, sp.gpa
        ORDER BY rank
        LIMIT  50',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_student_vs_class_grade',
        'SQL_TEMPLATE',
        'Truy van du lieu get student vs class grade',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name,student_code'
    ),
    (
        'get_students_at_risk',
        'SQL_TEMPLATE',
        'Truy van du lieu get students at risk',
        'SELECT u.full_name, u.code, u.email,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '''')  AS major,
               (SELECT COUNT(*) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                WHERE sa.student_id = u.id AND sa.status = ''ABSENT'') AS total_absences,
               (SELECT COUNT(DISTINCT e2.class_name) FROM enrollments e2 WHERE e2.student_id = u.id) AS classes_enrolled
        FROM   users u
        JOIN   student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors         m  ON sp.major_id = m.id
        WHERE  u.status = ''ACTIVE''
          AND  u.role = ''STUDENT''
          AND  (sp.gpa < %s OR %s = 0)
        ORDER BY sp.gpa ASC, total_absences DESC
        LIMIT  50',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'gpa_threshold'
    ),
    (
        'get_students_by_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get students by class',
        'SELECT u.full_name, u.code, u.email, u.phone,
               e.class_name,
               COALESCE(sp.gpa, 0)  AS gpa,
               COALESCE(m.name, '''') AS major,
               (SELECT COUNT(*) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                JOIN timetable_slots ts ON ats.timetable_slot_id = ts.id
                WHERE sa.student_id = u.id
                  AND ts.class_name = e.class_name
                  AND sa.status = ''ABSENT'')   AS absences_in_class
        FROM   users u
        JOIN   enrollments    e  ON u.id = e.student_id
        JOIN   class_sections cs ON e.class_name = cs.class_name
        JOIN   courses        c  ON cs.course_id  = c.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  (unaccent(e.class_name) ILIKE unaccent(%s)
             OR unaccent(c.code)       ILIKE unaccent(%s)
             OR unaccent(c.name)       ILIKE unaccent(%s))
          AND  (cs.lecturer_id = %s OR %s = -1)
        ORDER BY u.full_name
        LIMIT  200',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        'class_name,course_code,course_name'
    ),
    (
        'get_students_by_major',
        'SQL_TEMPLATE',
        'Truy van du lieu get students by major',
        'SELECT u.full_name, u.code, u.email, u.phone,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '''')  AS major,
               COALESCE(s.name, '''')  AS specialization,
               u.status
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        LEFT JOIN specializations   s  ON sp.specialization_id = s.id
        WHERE  (unaccent(m.name) ILIKE unaccent(%s)
             OR unaccent(m.code) ILIKE unaccent(%s)
             OR %s = '''')
          AND  u.status = ''ACTIVE''
          AND  u.role = ''STUDENT''
        ORDER BY sp.gpa DESC NULLS LAST
        LIMIT  100',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'major_name,major_code'
    ),
    (
        'get_sub_specializations',
        'SQL_TEMPLATE',
        'Truy van du lieu get sub specializations',
        'SELECT ss.name AS sub_spec_name, ss.code AS sub_spec_code,
               s.name  AS spec_name, s.code AS spec_code,
               m.name  AS major_name,
               COUNT(DISTINCT ssc.course_id) AS course_count
        FROM   sub_specializations ss
        JOIN   specializations      s   ON ss.specialization_id = s.id
        JOIN   majors               m   ON s.major_id = m.id
        LEFT JOIN sub_specialization_courses ssc ON ssc.sub_specialization_id = ss.id
        WHERE  (unaccent(s.name) ILIKE unaccent(%s)
             OR unaccent(s.code) ILIKE unaccent(%s)
             OR %s = '''')
        GROUP BY ss.name, ss.code, s.name, s.code, m.name
        ORDER BY ss.name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,STUDENT',
        'specialization_name,specialization_code,major_name'
    ),
    (
        'get_suitable_rooms_for_class',
        'SQL_TEMPLATE',
        'Truy van du lieu get suitable rooms for class',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name'
    ),
    (
        'get_system_broadcast_stats',
        'SQL_TEMPLATE',
        'Truy van du lieu get system broadcast stats',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_system_dashboard',
        'SQL_TEMPLATE',
        'Truy van du lieu get system dashboard',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'get_teaching_effectiveness',
        'SQL_TEMPLATE',
        'Truy van du lieu get teaching effectiveness',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_timetable_conflicts',
        'SQL_TEMPLATE',
        'Truy van du lieu get timetable conflicts',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'lecturer_code,date'
    ),
    (
        'get_top_lecturers_by_pass_rate',
        'SQL_TEMPLATE',
        'Truy van du lieu get top lecturers by pass rate',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,semester_name'
    ),
    (
        'get_user_by_code',
        'SQL_TEMPLATE',
        'Truy van du lieu get user by code',
        'SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status,
               COALESCE(sp.gpa, 0)  AS gpa,
               COALESCE(m.name, '''')  AS major,
               COALESCE(s.name, '''')  AS specialization,
               COALESCE(lp.expertise, '''') AS expertise,
               COALESCE(lp.department, '''') AS department
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        LEFT JOIN specializations    s  ON sp.specialization_id = s.id
        LEFT JOIN lecturer_profiles  lp ON u.id = lp.user_id
        WHERE  u.code = %s
        LIMIT  1',
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        'code'
    ),
    (
        'get_weekly_timetable_grid',
        'SQL_TEMPLATE',
        'Truy van du lieu get weekly timetable grid',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'start_date,end_date'
    ),
    (
        'import_component_grades',
        'BACKEND_ACTION',
        'Xu ly import component grades',
        NULL,
        NULL,
        TRUE,
        'LECTURER',
        NULL
    ),
    (
        'list_courses',
        'SQL_TEMPLATE',
        'Liet ke du lieu list courses',
        'SELECT c.code, c.name, c.credits, c.status,
               COUNT(DISTINCT cs.class_name) AS total_classes,
               COUNT(DISTINCT sc.specialization_id) AS in_specializations
        FROM   courses c
        LEFT JOIN class_sections cs ON c.id = cs.course_id
        LEFT JOIN specialization_courses sc ON c.id = sc.course_id
        WHERE  c.status = ''ACTIVE''
        GROUP BY c.code, c.name, c.credits, c.status
        ORDER BY c.name
        LIMIT  100',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'list_lecturers',
        'SQL_TEMPLATE',
        'Liet ke du lieu list lecturers',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'list_majors',
        'SQL_TEMPLATE',
        'Liet ke du lieu list majors',
        'SELECT m.code, m.name, m.status,
               COUNT(DISTINCT sp.user_id)   AS total_students,
               COUNT(DISTINCT s.id)         AS total_specializations
        FROM   majors m
        LEFT JOIN student_profiles sp ON m.id = sp.major_id
        LEFT JOIN users             u  ON sp.user_id = u.id AND u.status = ''ACTIVE''
        LEFT JOIN specializations   s  ON m.id = s.major_id AND s.status = ''ACTIVE''
        WHERE  m.status = ''ACTIVE''
        GROUP BY m.code, m.name, m.status
        ORDER BY m.name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,STUDENT',
        NULL
    ),
    (
        'list_notifications',
        'SQL_TEMPLATE',
        'Liet ke du lieu list notifications',
        'SELECT n.id, n.title, n.content, n.type, n.priority,
               n.target_type, n.status, n.sent_at,
               u.full_name AS sender,
               (SELECT COUNT(*) FROM notification_recipients nr2 WHERE nr2.notification_id = n.id) AS recipient_count,
               (SELECT COUNT(*) FROM notification_recipients nr3 WHERE nr3.notification_id = n.id AND nr3.is_read = TRUE) AS read_count
        FROM   notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        ORDER BY n.sent_at DESC
        LIMIT  30',
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'list_semesters',
        'SQL_TEMPLATE',
        'Liet ke du lieu list semesters',
        'SELECT s.code, s.name, s.start_date, s.end_date, s.status,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT e.student_id)   AS enrolled_students
        FROM   semesters s
        LEFT JOIN class_sections cs ON s.id = cs.semester_id
        LEFT JOIN enrollments     e  ON cs.class_name = e.class_name
        GROUP BY s.code, s.name, s.start_date, s.end_date, s.status
        ORDER BY s.start_date DESC
        LIMIT  100',
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'reject_schedule_request',
        'SQL_TEMPLATE',
        'Tu choi schedule request',
        'UPDATE schedule_requests SET status=''REJECTED'', updated_at=NOW() WHERE id=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'request_id'
    ),
    (
        'search_user_by_name',
        'SQL_TEMPLATE',
        'Tim kiem user by name',
        'SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status,
               COALESCE(sp.gpa, 0)  AS gpa,
               COALESCE(m.name, '''')  AS major,
               COALESCE(s.name, '''')  AS specialization
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        LEFT JOIN specializations    s  ON sp.specialization_id = s.id
        WHERE  unaccent(u.full_name) ILIKE unaccent(%s)
        ORDER BY u.role, u.full_name
        LIMIT  100',
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER',
        'full_name'
    ),
    (
        'send_email',
        'BACKEND_ACTION',
        'Xu ly send email',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER',
        NULL
    ),
    (
        'update_attendance_manually',
        'SQL_TEMPLATE',
        'Cap nhat attendance manually',
        'UPDATE student_attendances SET status=%s, updated_at=NOW()
        WHERE  student_id=(SELECT id FROM users WHERE code=%s LIMIT 1)
          AND  session_id=%s
        RETURNING id',
        NULL,
        TRUE,
        'LECTURER',
        'status,student_code,session_id'
    ),
    (
        'update_class',
        'SQL_TEMPLATE',
        'Cap nhat class',
        'UPDATE class_sections SET lecturer_id=(SELECT id FROM users WHERE code=%s LIMIT 1), semester_id=(SELECT id FROM semesters WHERE code=%s LIMIT 1), updated_at=NOW() WHERE class_name=%s RETURNING class_name',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'class_name,lecturer_code,semester_code'
    ),
    (
        'update_course',
        'SQL_TEMPLATE',
        'Cap nhat course',
        'UPDATE courses    SET name=%s, credits=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'course_code,name,credits,status'
    ),
    (
        'update_lecturer_info',
        'SQL_TEMPLATE',
        'Cap nhat lecturer info',
        'UPDATE lecturer_profiles SET expertise=%s, department=%s, updated_at=NOW() WHERE user_id=(SELECT id FROM users WHERE code=%s LIMIT 1) RETURNING user_id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'lecturer_code,expertise,department'
    ),
    (
        'update_major',
        'SQL_TEMPLATE',
        'Cap nhat major',
        'UPDATE majors     SET name=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'code,name,status'
    ),
    (
        'update_profile',
        'SQL_TEMPLATE',
        'Cap nhat profile',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'update_room',
        'SQL_TEMPLATE',
        'Cap nhat room',
        'UPDATE rooms      SET capacity=%s, status=%s, updated_at=NOW() WHERE unaccent(name) ILIKE unaccent(%s) RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'room_name,capacity,status'
    ),
    (
        'update_semester',
        'SQL_TEMPLATE',
        'Cap nhat semester',
        'UPDATE semesters  SET name=%s, start_date=%s, end_date=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'semester_code,name,start_date,end_date,status'
    ),
    (
        'update_specialization',
        'SQL_TEMPLATE',
        'Cap nhat specialization',
        'UPDATE specializations     SET name=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'code,name,status'
    ),
    (
        'update_student_info',
        'SQL_TEMPLATE',
        'Cap nhat student info',
        'UPDATE student_profiles SET major_id=(SELECT id FROM majors WHERE code=%s OR unaccent(name) ILIKE unaccent(%s) LIMIT 1), updated_at=NOW() WHERE user_id=(SELECT id FROM users WHERE code=%s LIMIT 1) RETURNING user_id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'student_code,major_code,major_name'
    ),
    (
        'update_sub_specialization',
        'SQL_TEMPLATE',
        'Cap nhat sub specialization',
        'UPDATE sub_specializations SET name=%s, updated_at=NOW() WHERE code=%s RETURNING id',
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        'code,name'
    ),
    (
        'update_user',
        'BACKEND_ACTION',
        'Cap nhat user',
        NULL,
        NULL,
        TRUE,
        'ADMIN',
        NULL
    ),
    (
        'view_alerts',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view alerts',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_assignments',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view assignments',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'view_attendance_config',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view attendance config',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_classes',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view classes',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_courses',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view courses',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_dashboard',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view dashboard',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_exam_grades',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view exam grades',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_grades',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view grades',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'view_inactive_users',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view inactive users',
        'SELECT u.full_name, u.code, u.email, u.role, u.status,
               COALESCE(m.name, '''') AS major
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  u.status = ''INACTIVE''
        ORDER BY u.role, u.full_name
        LIMIT  100',
        NULL,
        TRUE,
        'ADMIN',
        NULL
    ),
    (
        'view_lecturers',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view lecturers',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_logs',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view logs',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_majors',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view majors',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_messages',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view messages',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'view_notifications',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view notifications',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_profile',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view profile',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'view_resit_grades',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view resit grades',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_results',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view results',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_rooms',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view rooms',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_schedule',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view schedule',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF,LECTURER,STUDENT',
        NULL
    ),
    (
        'view_schedule_requests',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view schedule requests',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF,LECTURER',
        NULL
    ),
    (
        'view_semesters',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view semesters',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_specializations',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view specializations',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_students',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view students',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_sub_specializations',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view sub specializations',
        NULL,
        NULL,
        TRUE,
        'ADMIN,ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_teaching_classes',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view teaching classes',
        NULL,
        NULL,
        TRUE,
        'LECTURER',
        NULL
    ),
    (
        'view_timetable',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view timetable',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    ),
    (
        'view_users',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view users',
        NULL,
        NULL,
        TRUE,
        'ADMIN',
        NULL
    ),
    (
        'view_wifi_aps',
        'NAVIGATE_ONLY',
        'Dieu huong den chuc nang view wifi aps',
        NULL,
        NULL,
        TRUE,
        'ACADEMIC_STAFF',
        NULL
    )
ON CONFLICT (name) DO
UPDATE
SET
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    sql_template = EXCLUDED.sql_template,
    accuracy_percentage = EXCLUDED.accuracy_percentage,
    is_active = EXCLUDED.is_active,
    allowed_roles = EXCLUDED.allowed_roles,
    required_fields = EXCLUDED.required_fields,
    updated_at = CURRENT_TIMESTAMP;