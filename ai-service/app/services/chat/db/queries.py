"""
db/queries.py
Tập trung toàn bộ SQL templates và param builders.
Mỗi tool_name → (resolved_sql_key, params_tuple) thông qua build_params().
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Tuple
from loguru import logger

# ── SQL Templates ─────────────────────────────────────────────────────────────
TEMPLATES: dict[str, str] = {

    # ── User search ──────────────────────────────────────────────────────────
    "search_user_by_name": """
        SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status,
               sp.gpa, m.name AS major
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        WHERE  unaccent(u.full_name) ILIKE unaccent(%s)
        LIMIT  10
    """,
    "get_user_by_code": """
        SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status,
               sp.gpa, m.name AS major
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        WHERE  u.code = %s
        LIMIT  1
    """,
    "view_inactive_users": """
        SELECT u.full_name, u.code, u.email, u.role, u.status
        FROM   users u
        WHERE  u.status = 'INACTIVE'
        ORDER BY u.role, u.full_name
        LIMIT  50
    """,
    "count_users_by_role": """
        SELECT role, COUNT(*) AS total
        FROM   users
        WHERE  status = 'ACTIVE'
        GROUP BY role
        ORDER BY role
    """,

    # ── Students ─────────────────────────────────────────────────────────────
    "get_student_by_code": """
        SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.status,
               sp.gpa, m.name AS major,
               s.name AS specialization
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        LEFT JOIN specializations    s  ON sp.specialization_id = s.id
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = 'STUDENT'
    """,
    "get_students_by_major": """
        SELECT u.full_name, u.code, sp.gpa, m.name AS major
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  (unaccent(m.name) ILIKE unaccent(%s) OR unaccent(m.code) ILIKE unaccent(%s) OR %s = '')
          AND  u.status = 'ACTIVE' AND u.role = 'STUDENT'
        ORDER BY sp.gpa DESC NULLS LAST
        LIMIT  20
    """,
    "get_students_by_class": """
        SELECT u.full_name, u.code, u.email, u.phone, e.class_name
        FROM   users u
        JOIN   enrollments    e  ON u.id = e.student_id
        JOIN   class_sections cs ON e.class_name = cs.class_name
        JOIN   courses        c  ON cs.course_id  = c.id
        WHERE  (unaccent(e.class_name) ILIKE unaccent(%s)
             OR unaccent(c.code)       ILIKE unaccent(%s)
             OR unaccent(c.name)       ILIKE unaccent(%s))
          AND  (cs.lecturer_id = %s OR %s = -1)
        ORDER BY u.full_name
        LIMIT  100
    """,
    "get_students_without_class": """
        SELECT u.full_name, u.code, u.email, m.name AS major
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  u.role = 'STUDENT' AND u.status = 'ACTIVE'
          AND  u.id NOT IN (SELECT student_id FROM enrollments)
        ORDER BY u.full_name
        LIMIT  50
    """,
    "get_top_students": """
        SELECT u.full_name, u.code, sp.gpa, m.name AS major
        FROM   users u
        JOIN   student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors         m  ON sp.major_id = m.id
        WHERE  u.status = 'ACTIVE'
        ORDER BY sp.gpa DESC NULLS LAST
        LIMIT  10
    """,
    "count_students_by_major": """
        SELECT m.name AS major_name, COUNT(sp.user_id) AS total_students
        FROM   majors m
        LEFT JOIN student_profiles sp ON m.id = sp.major_id
        LEFT JOIN users u ON sp.user_id = u.id AND u.status = 'ACTIVE'
        WHERE  unaccent(m.name) ILIKE unaccent(%s)
            OR unaccent(m.code) ILIKE unaccent(%s)
            OR %s = ''
        GROUP BY m.name
        ORDER BY total_students DESC
    """,
    "get_students_at_risk": """
        SELECT u.full_name, u.code, sp.gpa, m.name AS major
        FROM   users u
        JOIN   student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors         m  ON sp.major_id = m.id
        WHERE  u.status = 'ACTIVE' AND u.role = 'STUDENT'
          AND  (sp.gpa < %s OR %s = 0)
        ORDER BY sp.gpa ASC
        LIMIT  20
    """,

    # ── Lecturers ─────────────────────────────────────────────────────────────
    "get_lecturer_by_code": """
        SELECT u.full_name, u.code, u.email, u.phone, u.role, u.status
        FROM   users u
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = 'LECTURER'
    """,
    "get_lecturers_by_major": """
        SELECT DISTINCT u.full_name, u.code,
               string_agg(DISTINCT c.name, ', ') AS courses_taught
        FROM   users u
        JOIN   class_sections cs ON cs.lecturer_id = u.id
        JOIN   courses c ON cs.course_id = c.id
        WHERE  u.role = 'LECTURER' AND u.status = 'ACTIVE'
          AND  (unaccent(c.name) ILIKE unaccent(%s)
             OR unaccent(c.code) ILIKE unaccent(%s)
             OR %s = '')
        GROUP BY u.full_name, u.code
        ORDER BY u.full_name
        LIMIT  20
    """,
    "get_lecturers_by_expertise": """
        SELECT DISTINCT u.full_name, u.code,
               string_agg(DISTINCT c.name, ', ') AS courses_taught
        FROM   users u
        JOIN   class_sections cs ON cs.lecturer_id = u.id
        JOIN   courses c ON cs.course_id = c.id
        WHERE  u.role = 'LECTURER' AND u.status = 'ACTIVE'
          AND  (unaccent(c.name) ILIKE unaccent(%s)
             OR unaccent(c.code) ILIKE unaccent(%s))
        GROUP BY u.full_name, u.code
        ORDER BY u.full_name
        LIMIT  20
    """,

    # ── Rooms ─────────────────────────────────────────────────────────────────
    "get_empty_rooms": """
        SELECT r.name, r.capacity
        FROM   rooms r
        WHERE  r.id NOT IN (
            SELECT ts.room_id FROM timetable_slots ts
            WHERE  ts.date = %s
              AND  ts.slot_number = %s
        )
          AND  r.status = 'ACTIVE'
        ORDER BY r.name
    """,
    "get_room_info": """
        SELECT name, capacity, status
        FROM   rooms
        WHERE  unaccent(name) ILIKE unaccent(%s)
        LIMIT  5
    """,
    "count_rooms_by_status": """
        SELECT status, COUNT(*) AS total
        FROM   rooms
        GROUP BY status
        ORDER BY status
    """,

    # ── Majors ────────────────────────────────────────────────────────────────
    "list_majors": """
        SELECT code, name, status FROM majors WHERE status = 'ACTIVE' ORDER BY name
    """,
    "get_major_id_by_name": """
        SELECT id, name FROM majors
        WHERE (unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s))
          AND status = 'ACTIVE'
        LIMIT  1
    """,

    # ── Specializations ───────────────────────────────────────────────────────
    "get_specializations_by_major": """
        SELECT s.name, s.code, s.status
        FROM   specializations s
        JOIN   majors           m ON s.major_id = m.id
        WHERE  (unaccent(m.name) ILIKE unaccent(%s)
             OR unaccent(m.code) ILIKE unaccent(%s)
             OR %s = '')
        ORDER BY s.name
    """,
    "get_sub_specializations": """
        SELECT ss.name AS sub_spec_name, ss.code AS sub_spec_code,
               s.name  AS spec_name
        FROM   sub_specializations ss
        JOIN   specializations     s  ON ss.specialization_id = s.id
        WHERE  (unaccent(s.name) ILIKE unaccent(%s)
             OR unaccent(s.code) ILIKE unaccent(%s)
             OR %s = '')
        ORDER BY ss.name
    """,
    "get_specialization_id_by_name": """
        SELECT id, name FROM specializations
        WHERE (unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s))
          AND status = 'ACTIVE'
        LIMIT  1
    """,

    # ── Courses ───────────────────────────────────────────────────────────────
    "list_courses": """
        SELECT code, name, credits, status FROM courses WHERE status = 'ACTIVE' ORDER BY name LIMIT 50
    """,
    "get_courses_by_name": """
        SELECT code, name, credits, status
        FROM   courses
        WHERE  unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s)
        LIMIT  20
    """,
    "get_courses_by_spec": """
        SELECT c.code, c.name, sc.semester
        FROM   courses c
        JOIN   specialization_courses sc ON c.id = sc.course_id
        JOIN   specializations         s  ON sc.specialization_id = s.id
        WHERE  (unaccent(s.name) ILIKE unaccent(%s)
             OR unaccent(s.code) ILIKE unaccent(%s)
             OR %s = '')
        ORDER BY sc.semester, c.name
    """,
    "get_courses_by_sub_spec": """
        SELECT c.code, c.name
        FROM   courses c
        JOIN   sub_specialization_courses ssc ON c.id = ssc.course_id
        JOIN   sub_specializations         ss  ON ssc.sub_specialization_id = ss.id
        WHERE  (unaccent(ss.name) ILIKE unaccent(%s)
             OR unaccent(ss.code) ILIKE unaccent(%s)
             OR %s = '')
        ORDER BY c.name
    """,
    "get_grade_components_by_course": """
        SELECT gc.name, gc.type, gc.weight
        FROM   grade_components gc
        JOIN   courses          c  ON gc.course_id = c.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s) OR unaccent(c.code) ILIKE unaccent(%s)
        ORDER BY gc.weight DESC
    """,

    # ── Semesters ─────────────────────────────────────────────────────────────
    "list_semesters": """
        SELECT code, name, start_date, end_date, status
        FROM   semesters
        ORDER BY start_date DESC
        LIMIT  10
    """,
    "get_active_semester": """
        SELECT code, name, start_date, end_date, status
        FROM   semesters
        ORDER BY (CASE WHEN status = 'ACTIVE' THEN 1 ELSE 2 END),
                 ABS(EXTRACT(EPOCH FROM (CURRENT_DATE - start_date)))
        LIMIT  1
    """,

    # ── Classes ───────────────────────────────────────────────────────────────
    "get_classes_by_semester": """
        SELECT cs.class_name, c.name AS course_name,
               u.full_name AS lecturer_name, s.name AS semester
        FROM   class_sections cs
        JOIN   semesters       s  ON cs.semester_id  = s.id
        JOIN   courses         c  ON cs.course_id    = c.id
        LEFT JOIN users        u  ON cs.lecturer_id  = u.id
        WHERE  (
               unaccent(s.code) ILIKE unaccent(%s)
            OR unaccent(s.name) ILIKE unaccent(%s)
            OR replace(unaccent(lower(s.name)), ' ', '') ILIKE replace(unaccent(lower(%s)), ' ', '')
            OR replace(unaccent(lower(s.code)), ' ', '') ILIKE replace(unaccent(lower(%s)), ' ', '')
        )
          AND  (cs.lecturer_id = %s OR %s = -1)
        ORDER BY cs.class_name
        LIMIT  50
    """,
    "get_class_info": """
        SELECT cs.class_name, c.name AS course_name, c.credits,
               u.full_name AS lecturer_name, s.name AS semester,
               COUNT(e.student_id) AS student_count
        FROM   class_sections cs
        JOIN   courses         c  ON cs.course_id   = c.id
        JOIN   semesters       s  ON cs.semester_id = s.id
        LEFT JOIN users        u  ON cs.lecturer_id = u.id
        LEFT JOIN enrollments  e  ON cs.class_name  = e.class_name
        WHERE  unaccent(cs.class_name) ILIKE unaccent(%s)
        GROUP BY cs.class_name, c.name, c.credits, u.full_name, s.name
    """,
    "get_enrollments_by_class": """
        SELECT u.full_name, u.code, u.email, e.class_name
        FROM   users u
        JOIN   enrollments e ON u.id = e.student_id
        WHERE  unaccent(e.class_name) ILIKE unaccent(%s)
        ORDER BY u.full_name
        LIMIT  100
    """,

    # ── Schedules ─────────────────────────────────────────────────────────────
    "get_my_schedule": """
        SELECT DISTINCT ts.date, ts.slot_number, cs.class_name, c.name AS course_name,
               r.name AS room, st.start_time, st.end_time
        FROM   timetable_slots ts
        JOIN   class_sections  cs ON ts.class_name   = cs.class_name
        JOIN   courses          c  ON cs.course_id    = c.id
        LEFT JOIN rooms        r  ON ts.room_id       = r.id
        LEFT JOIN slot_types   st ON ts.slot_type_id  = st.id
        LEFT JOIN enrollments  e  ON cs.class_name    = e.class_name
        WHERE  (e.student_id = %s OR cs.lecturer_id = %s)
          AND  ts.date >= CURRENT_DATE
        ORDER BY ts.date, ts.slot_number
        LIMIT  20
    """,
    "get_my_schedule_targeted": """
        SELECT DISTINCT ts.date, ts.slot_number, cs.class_name, c.name AS course_name,
               r.name AS room, st.start_time, st.end_time
        FROM   timetable_slots ts
        JOIN   class_sections  cs ON ts.class_name   = cs.class_name
        JOIN   courses          c  ON cs.course_id    = c.id
        LEFT JOIN rooms        r  ON ts.room_id       = r.id
        LEFT JOIN slot_types   st ON ts.slot_type_id  = st.id
        LEFT JOIN enrollments  e  ON cs.class_name    = e.class_name
        WHERE  (e.student_id = %s OR cs.lecturer_id = %s)
          AND  (ts.date BETWEEN %s AND %s)
          AND  (unaccent(cs.class_name) ILIKE unaccent(%s) OR %s = '')
        ORDER BY ts.date, ts.slot_number
        LIMIT  50
    """,
    "get_class_schedule": """
        SELECT ts.date, ts.slot_number, r.name AS room,
               st.start_time, st.end_time, ts.status
        FROM   timetable_slots ts
        LEFT JOIN rooms      r  ON ts.room_id      = r.id
        LEFT JOIN slot_types st ON ts.slot_type_id = st.id
        WHERE  ts.class_name = %s
          AND  ts.date BETWEEN %s AND %s
        ORDER BY ts.date, ts.slot_number
        LIMIT  20
    """,
    "get_lecturer_schedule_by_search": """
        SELECT ts.date, ts.slot_number, cs.class_name, c.name AS course_name,
               r.name AS room, st.start_time, st.end_time,
               u.full_name AS lecturer_name, sem.name AS semester
        FROM   timetable_slots ts
        JOIN   class_sections  cs  ON ts.class_name   = cs.class_name
        JOIN   courses          c   ON cs.course_id    = c.id
        JOIN   users            u   ON cs.lecturer_id  = u.id
        LEFT JOIN semesters    sem  ON cs.semester_id  = sem.id
        LEFT JOIN rooms         r   ON ts.room_id      = r.id
        LEFT JOIN slot_types    st  ON ts.slot_type_id = st.id
        WHERE  (unaccent(u.full_name) ILIKE unaccent(%s) OR u.code = %s)
          AND  ts.date BETWEEN %s AND %s
        ORDER BY ts.date, ts.slot_number
        LIMIT  50
    """,
    "get_student_schedule_by_search": """
        SELECT ts.date, ts.slot_number, cs.class_name, c.name AS course_name,
               r.name AS room, st.start_time, st.end_time,
               u.full_name AS student_name, sem.name AS semester
        FROM   timetable_slots ts
        JOIN   class_sections  cs  ON ts.class_name   = cs.class_name
        JOIN   enrollments     e   ON cs.class_name   = e.class_name
        JOIN   users           u   ON e.student_id    = u.id
        JOIN   courses          c   ON cs.course_id    = c.id
        LEFT JOIN semesters   sem  ON cs.semester_id  = sem.id
        LEFT JOIN rooms        r   ON ts.room_id      = r.id
        LEFT JOIN slot_types   st  ON ts.slot_type_id = st.id
        WHERE  (unaccent(u.full_name) ILIKE unaccent(%s) OR u.code = %s)
          AND  ts.date BETWEEN %s AND %s
        ORDER BY ts.date, ts.slot_number
        LIMIT  50
    """,

    # ── Schedule Requests ─────────────────────────────────────────────────────
    "get_schedule_request_list": """
        SELECT sr.id, u.full_name AS requester, sr.reason, sr.status, sr.created_at,
               ts1.date AS original_date, ts1.slot_number AS original_slot,
               ts2.date AS target_date,   ts2.slot_number AS target_slot
        FROM   schedule_requests sr
        JOIN   users             u   ON sr.requester_id    = u.id
        LEFT JOIN timetable_slots ts1 ON sr.original_slot_id = ts1.id
        LEFT JOIN timetable_slots ts2 ON sr.target_slot_id   = ts2.id
        ORDER BY sr.created_at DESC
        LIMIT  30
    """,
    "get_my_schedule_requests": """
        SELECT sr.id, sr.reason, sr.status, sr.created_at,
               ts1.date AS original_date, ts1.slot_number AS original_slot,
               ts2.date AS target_date,   ts2.slot_number AS target_slot
        FROM   schedule_requests sr
        LEFT JOIN timetable_slots ts1 ON sr.original_slot_id = ts1.id
        LEFT JOIN timetable_slots ts2 ON sr.target_slot_id   = ts2.id
        WHERE  sr.requester_id = %s
        ORDER BY sr.created_at DESC
        LIMIT  20
    """,
    "get_schedule_request_detail": """
        SELECT sr.id, u.full_name AS requester, sr.reason, sr.status, sr.created_at,
               ts1.date AS original_date, ts1.slot_number AS original_slot,
               r1.name AS original_room,
               ts2.date AS target_date,   ts2.slot_number AS target_slot,
               r2.name AS target_room
        FROM   schedule_requests sr
        JOIN   users             u    ON sr.requester_id    = u.id
        LEFT JOIN timetable_slots ts1  ON sr.original_slot_id = ts1.id
        LEFT JOIN timetable_slots ts2  ON sr.target_slot_id   = ts2.id
        LEFT JOIN rooms           r1   ON ts1.room_id = r1.id
        LEFT JOIN rooms           r2   ON ts2.room_id = r2.id
        WHERE  sr.id = %s
    """,

    # ── Attendance ────────────────────────────────────────────────────────────
    "get_attendance_by_slot": """
        SELECT u.full_name, u.code, sa.status, sa.method
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id  = u.id
        WHERE  unaccent(ts.class_name) ILIKE unaccent(%s)
          AND  ts.date = %s::date
        ORDER BY u.full_name
    """,
    "get_attendance_stats_by_class": """
        SELECT
            SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN sa.status = 'ABSENT'  THEN 1 ELSE 0 END) AS absent,
            SUM(CASE WHEN sa.status = 'LATE'    THEN 1 ELSE 0 END) AS late,
            COUNT(sa.id) AS total,
            ROUND(100.0 * SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sa.id), 0), 1) AS present_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  unaccent(ts.class_name) ILIKE unaccent(%s)
    """,
    "get_attendance_rate_by_course": """
        SELECT c.name AS course_name,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS present_rate,
               COUNT(DISTINCT sa.student_id) AS student_count
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id   = c.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s) OR unaccent(c.code) ILIKE unaccent(%s)
        GROUP BY c.name
    """,
    "get_my_attendance_status": """
        SELECT ts.class_name, ts.date, sa.status, sa.method
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  sa.student_id = %s
        ORDER BY ts.date DESC, ats.id DESC
        LIMIT  10
    """,
    "get_attendance_report_by_student": """
        SELECT c.name AS course_name, ts.class_name,
               COUNT(sa.id) AS total_sessions,
               SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
               SUM(CASE WHEN sa.status = 'ABSENT'  THEN 1 ELSE 0 END) AS absent,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS attendance_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id   = c.id
        WHERE  sa.student_id = %s
        GROUP BY c.name, ts.class_name
        ORDER BY attendance_rate ASC
    """,
    "get_abnormal_attendance": """
        SELECT u.full_name, u.code, ts.class_name, ts.date, sa.status, sa.method,
               sa.created_at
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id = u.id
        WHERE  sa.method = 'QR_CODE'
          AND  sa.created_at < (ats.opened_at + INTERVAL '30 seconds')
        ORDER BY sa.created_at DESC
        LIMIT  50
    """,
    "get_attendance_trends": """
        SELECT TO_CHAR(ts.date, 'Day') AS day_of_week, ts.slot_number,
               COUNT(sa.id) AS total_records,
               SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) / COUNT(sa.id), 1) AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  ts.class_name = %s
        GROUP BY day_of_week, ts.slot_number
        ORDER BY absent_rate DESC
    """,
    "get_grade_distribution": """
        SELECT CASE 
                 WHEN score >= 8.5 THEN 'A (8.5-10)'
                 WHEN score >= 7.0 THEN 'B (7.0-8.4)'
                 WHEN score >= 5.5 THEN 'C (5.5-6.9)'
                 WHEN score >= 4.0 THEN 'D (4.0-5.4)'
                 ELSE 'F (<4.0)'
               END AS grade_tier,
               COUNT(*) AS student_count
        FROM   student_grades sg
        JOIN   enrollments e ON sg.enrollment_id = e.id
        JOIN   grade_components gc ON sg.grade_component_id = gc.id
        WHERE  e.class_name = %s AND gc.type = 'FINAL'
        GROUP BY grade_tier
        ORDER BY grade_tier
    """,
    "get_class_health_check": """
        SELECT cs.class_name, c.name AS course_name, 
               u.full_name AS lecturer,
               (SELECT COUNT(*) FROM enrollments WHERE class_name = cs.class_name) AS total_students,
               (SELECT ROUND(AVG(score), 2) FROM student_grades sg 
                JOIN enrollments e ON sg.enrollment_id = e.id 
                WHERE e.class_name = cs.class_name) AS avg_score,
               (SELECT ROUND(100.0 * SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END) / COUNT(sa.id), 1)
                FROM student_attendances sa 
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                WHERE ats.class_name = cs.class_name) AS absent_rate,
               (SELECT COUNT(DISTINCT e.student_id)
                FROM enrollments e
                LEFT JOIN student_profiles sp ON e.student_id = sp.user_id
                WHERE e.class_name = cs.class_name 
                  AND (sp.gpa < 2.0 OR 
                       (SELECT COUNT(*) FROM student_attendances sa 
                        JOIN attendance_sessions ats ON sa.session_id = ats.id 
                        WHERE sa.student_id = e.student_id AND sa.status = 'ABSENT') > 10)) AS at_risk_count
        FROM   class_sections cs
        JOIN   courses c ON cs.course_id = c.id
        LEFT JOIN users u ON cs.lecturer_id = u.id
        WHERE  cs.class_name = %s
    """,
    "get_student_ranking_in_class": """
        SELECT u.full_name, u.code, 
               ROUND(AVG(sg.score), 2) AS avg_score,
               RANK() OVER (ORDER BY AVG(sg.score) DESC) as rank
        FROM   student_grades sg
        JOIN   enrollments e ON sg.enrollment_id = e.id
        JOIN   users u ON e.student_id = u.id
        WHERE  e.class_name = %s
        GROUP BY u.full_name, u.code
        ORDER BY rank
        LIMIT 20
    """,

    # ── Grades ────────────────────────────────────────────────────────────────
    "get_my_grades": """
        SELECT c.name AS course_name, cs.class_name,
               gc.name AS component, gc.weight, sg.score, sg.attempt
        FROM   student_grades   sg
        JOIN   enrollments       e  ON sg.enrollment_id      = e.id
        JOIN   grade_components  gc ON sg.grade_component_id = gc.id
        JOIN   courses           c  ON gc.course_id          = c.id
        JOIN   class_sections    cs ON e.class_name          = cs.class_name
        WHERE  e.student_id = %s
        ORDER BY c.name, gc.weight DESC
    """,
    "get_detail_course_grade": """
        SELECT gc.name AS component, gc.type, gc.weight, sg.score, sg.attempt
        FROM   student_grades  sg
        JOIN   enrollments      e  ON sg.enrollment_id      = e.id
        JOIN   grade_components gc ON sg.grade_component_id = gc.id
        JOIN   courses          c  ON gc.course_id          = c.id
        WHERE  e.student_id = %s
          AND  (unaccent(c.name) ILIKE unaccent(%s) OR unaccent(c.code) ILIKE unaccent(%s))
        ORDER BY gc.weight DESC
    """,
    "get_grade_report_by_class": """
        SELECT u.full_name, u.code,
               ROUND(SUM(sg.score * gc.weight) / NULLIF(SUM(gc.weight), 0), 2) AS final_score
        FROM   student_grades   sg
        JOIN   enrollments       e  ON sg.enrollment_id      = e.id
        JOIN   grade_components  gc ON sg.grade_component_id = gc.id
        JOIN   users             u  ON e.student_id          = u.id
        JOIN   class_sections    cs ON e.class_name          = cs.class_name
        WHERE  unaccent(cs.class_name) ILIKE unaccent(%s)
        GROUP BY u.full_name, u.code
        ORDER BY final_score DESC NULLS LAST
    """,
    "get_grade_report_by_course": """
        SELECT
            COUNT(DISTINCT e.student_id) AS total_students,
            ROUND(AVG(sg.score), 2)      AS avg_score,
            MAX(sg.score)                AS max_score,
            MIN(sg.score)                AS min_score,
            SUM(CASE WHEN sg.score >= 5.0 THEN 1 ELSE 0 END) AS passed,
            SUM(CASE WHEN sg.score <  5.0 THEN 1 ELSE 0 END) AS failed
        FROM   student_grades  sg
        JOIN   enrollments      e  ON sg.enrollment_id      = e.id
        JOIN   grade_components gc ON sg.grade_component_id = gc.id
        JOIN   courses          c  ON gc.course_id          = c.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s) OR unaccent(c.code) ILIKE unaccent(%s)
    """,
    "get_gpa_stats_by_major": """
        SELECT m.name AS major,
               COUNT(sp.user_id)       AS total_students,
               ROUND(AVG(sp.gpa), 2)   AS avg_gpa,
               MAX(sp.gpa)             AS max_gpa,
               MIN(sp.gpa)             AS min_gpa
        FROM   student_profiles sp
        JOIN   majors           m ON sp.major_id = m.id
        GROUP BY m.name
        ORDER BY avg_gpa DESC
    """,

    # ── Notifications ─────────────────────────────────────────────────────────
    "get_my_notifications": """
        SELECT n.title, n.content, n.sent_at, nr.is_read
        FROM   notifications n
        JOIN   notification_recipients nr ON n.id = nr.notification_id
        WHERE  nr.recipient_id = %s
        ORDER BY n.sent_at DESC
        LIMIT  10
    """,
    "list_notifications": """
        SELECT title, content, target_type, status, sent_at
        FROM   notifications
        ORDER BY sent_at DESC
        LIMIT  20
    """,
    "count_unread_notifications": """
        SELECT COUNT(*) AS unread_count
        FROM   notification_recipients
        WHERE  recipient_id = %s AND is_read = FALSE
    """,

    # ── Mutations ─────────────────────────────────────────────────────────────
    "create_major": """
        INSERT INTO majors (code, name, status, created_at, updated_at)
        VALUES (%s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id
    """,
    "create_course": """
        INSERT INTO courses (code, name, credits, status, created_at, updated_at)
        VALUES (%s, %s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id
    """,
    "create_room": """
        INSERT INTO rooms (name, capacity, status, created_at, updated_at)
        VALUES (%s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id
    """,
    "create_semester": """
        INSERT INTO semesters (code, name, start_date, end_date, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'UPCOMING', NOW(), NOW()) RETURNING id
    """,
    "create_specialization": """
        INSERT INTO specializations (code, name, major_id, status, created_at, updated_at)
        VALUES (%s, %s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id
    """,
    "create_sub_specialization": """
        INSERT INTO sub_specializations (code, name, specialization_id, created_at, updated_at)
        VALUES (%s, %s, %s, NOW(), NOW()) RETURNING id
    """,
    "approve_schedule_request": """
        UPDATE schedule_requests SET status='APPROVED', updated_at=NOW() WHERE id=%s RETURNING id
    """,
    "reject_schedule_request": """
        UPDATE schedule_requests SET status='REJECTED', updated_at=NOW() WHERE id=%s RETURNING id
    """,
    "update_attendance_manually": """
        UPDATE student_attendances SET status=%s, updated_at=NOW()
        WHERE  student_id=(SELECT id FROM users WHERE code=%s LIMIT 1)
          AND  session_id=%s
        RETURNING id
    """,
    "activate_user": """
        UPDATE users SET status='ACTIVE', updated_at=NOW() WHERE code=%s RETURNING id
    """,
    "add_student_to_class": """
        INSERT INTO enrollments (student_id, class_name, created_at, updated_at)
        SELECT u.id, %s, NOW(), NOW()
        FROM   users u WHERE u.code = %s
        ON CONFLICT DO NOTHING
        RETURNING id
    """,
    "remove_student_from_class": """
        DELETE FROM enrollments
        WHERE  class_name = %s
          AND  student_id = (SELECT id FROM users WHERE code = %s LIMIT 1)
        RETURNING id
    """,
    "assign_course_to_specialization": """
        INSERT INTO specialization_courses (specialization_id, course_id, semester, created_at, updated_at)
        SELECT s.id, c.id, %s, NOW(), NOW()
        FROM   specializations s, courses c
        WHERE  (s.code = %s OR unaccent(s.name) ILIKE unaccent(%s))
          AND  (c.code = %s OR unaccent(c.name) ILIKE unaccent(%s))
        ON CONFLICT DO NOTHING
        RETURNING specialization_id
    """,
    "assign_course_to_sub_specialization": """
        INSERT INTO sub_specialization_courses (sub_specialization_id, course_id, created_at, updated_at)
        SELECT ss.id, c.id, NOW(), NOW()
        FROM   sub_specializations ss, courses c
        WHERE  (ss.code = %s OR unaccent(ss.name) ILIKE unaccent(%s))
          AND  (c.code = %s OR unaccent(c.name) ILIKE unaccent(%s))
        ON CONFLICT DO NOTHING
        RETURNING sub_specialization_id
    """,
    "delete_major": "UPDATE majors SET status = 'INACTIVE', updated_at = NOW() WHERE code = %s OR name = %s RETURNING id",
    "delete_course": "UPDATE courses SET status = 'INACTIVE', updated_at = NOW() WHERE code = %s OR name = %s RETURNING id",
    "delete_room": "UPDATE rooms SET status = 'INACTIVE', updated_at = NOW() WHERE name = %s RETURNING id",
    "delete_semester": "UPDATE semesters SET status = 'CLOSED', updated_at = NOW() WHERE code = %s RETURNING id",
    "delete_class": "DELETE FROM class_sections WHERE class_name = %s RETURNING class_name",
    "delete_specialization": "UPDATE specializations SET status = 'INACTIVE', updated_at = NOW() WHERE code = %s OR name = %s RETURNING id",
    "delete_sub_specialization": "DELETE FROM sub_specializations WHERE code = %s OR name = %s RETURNING id",
    "update_student_info": "UPDATE student_profiles SET major_id = (SELECT id FROM majors WHERE code = %s OR name = %s LIMIT 1), updated_at = NOW() WHERE user_id = (SELECT id FROM users WHERE code = %s LIMIT 1) RETURNING user_id",
    "update_lecturer_info": "UPDATE lecturer_profiles SET expertise = %s, department = %s, updated_at = NOW() WHERE user_id = (SELECT id FROM users WHERE code = %s LIMIT 1) RETURNING user_id",
    "update_room": "UPDATE rooms SET capacity = %s, status = %s, updated_at = NOW() WHERE name = %s RETURNING id",
    "update_semester": "UPDATE semesters SET name = %s, start_date = %s, end_date = %s, status = %s, updated_at = NOW() WHERE code = %s RETURNING id",
    "update_course": "UPDATE courses SET name = %s, credits = %s, status = %s, updated_at = NOW() WHERE code = %s RETURNING id",
    "update_major": "UPDATE majors SET name = %s, status = %s, updated_at = NOW() WHERE code = %s RETURNING id",
    "update_specialization": "UPDATE specializations SET name = %s, status = %s, updated_at = NOW() WHERE code = %s RETURNING id",
    "update_sub_specialization": "UPDATE sub_specializations SET name = %s, updated_at = NOW() WHERE code = %s RETURNING id",
    "update_class": "UPDATE class_sections SET lecturer_id = (SELECT id FROM users WHERE code = %s LIMIT 1), semester_id = (SELECT id FROM semesters WHERE code = %s LIMIT 1), updated_at = NOW() WHERE class_name = %s RETURNING class_name",
    "create_class": """
        INSERT INTO class_sections (class_name, course_id, lecturer_id, semester_id, created_at, updated_at)
        SELECT %s, c.id, u.id, s.id, NOW(), NOW()
        FROM   courses c, users u, semesters s
        WHERE  c.code = %s AND u.code = %s AND s.code = %s
        RETURNING class_name
    """,
}


# ── Param Builders ────────────────────────────────────────────────────────────
def build_params(
    tool_name: str,
    entities: dict,
    user_id: int,
    user_role: str,
) -> Tuple[str, tuple]:
    """
    Returns (resolved_template_key, params_tuple).
    Raises ValueError khi thiếu entity bắt buộc.
    """
    e = entities

    def req(key: str, label: str = "") -> Any:
        val = e.get(key)
        if not val:
            raise ValueError(f"Thiếu trường bắt buộc: {label or key}")
        return val

    def _normalize_date(raw: str) -> str:
        """Convert various date formats to YYYY-MM-DD."""
        import re as _re
        s = str(raw).strip()
        # Already ISO? (2026-03-04)
        m = _re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
        # d-m-y or d/m/y (4-3-2026 or 04/03/2026)
        m = _re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$", s)
        if m:
            return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
        # Fallback: return as-is (will be handled by Vietnamese keyword matching)
        return s

    def _resolve_date_range(dt_raw: str) -> Tuple[str, str]:
        if not dt_raw or dt_raw == "1970-01-01":
            return "1970-01-01", "2099-12-31"
            
        dt_lower = dt_raw.lower().replace("_", " ")
        now = datetime.now()
        
        # Các biến thể LLM có thể trả: "tuần này", "tuan nay", "this week", "this_week"
        _WEEK_KW  = ("tuan nay", "tuần này", "this week", "week", "tuần")
        _TODAY_KW  = ("hom nay", "hôm nay", "today")
        _TMRW_KW  = ("ngay mai", "ngày mai", "tomorrow")
        
        if any(kw in dt_lower for kw in _WEEK_KW):
            monday = now - timedelta(days=now.weekday())
            sunday = monday + timedelta(days=6)
            return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")
        elif any(kw in dt_lower for kw in _TODAY_KW):
            t = now.strftime("%Y-%m-%d")
            return t, t
        elif any(kw in dt_lower for kw in _TMRW_KW):
            tomorrow = now + timedelta(days=1)
            t = tomorrow.strftime("%Y-%m-%d")
            return t, t
        else:
            normalized = _normalize_date(dt_raw)
            return normalized, normalized

    def like(val: str) -> str:
        return f"%{val}%"

    if tool_name == "search_user_by_name":
        return tool_name, (like(req("full_name")),)
    elif tool_name == "get_user_by_code":
        return tool_name, (req("code"),)
    elif tool_name in ("view_inactive_users", "count_users_by_role"):
        return tool_name, ()
    elif tool_name == "activate_user":
        return tool_name, (req("code"),)

    # ── Students ─────────────────────────────────────────────────────────
    elif tool_name == "get_student_by_code":
        val = e.get("student_code") or e.get("code", "")
        return tool_name, (val, like(val))
    elif tool_name == "get_students_by_major":
        val = e.get("major_name", "")
        # Nếu không có major, trả về danh sách chung nhưng giới hạn 20 (thay cho list_students cũ)
        return tool_name, (like(val), like(val), val)
    elif tool_name == "count_students_by_major":
        val = e.get("major_name") or e.get("major_code") or ""
        # Pass 3 params: name ILIKE, code ILIKE, and '' sentinel for all-majors
        return tool_name, (like(val), like(val), val)
    elif tool_name == "get_students_by_class":
        val = e.get("class_name") or e.get("course_code", "")
        lec_id = user_id if user_role == "LECTURER" else -1
        return tool_name, (like(val), like(val), like(val), lec_id, lec_id)
    elif tool_name == "get_students_at_risk":
        gpa_threshold = float(e.get("gpa_threshold") or 2.0)
        # Simplified query: only GPA filter (attendance data not available)
        return tool_name, (gpa_threshold, gpa_threshold)
    elif tool_name in ("get_top_students", "get_students_without_class"):
        return tool_name, ()
    elif tool_name == "get_enrollments_by_class":
        return tool_name, (like(req("class_name")),)

    # ── Lecturers ────────────────────────────────────────────────────────
    elif tool_name == "get_lecturer_by_code":
        val = e.get("lecturer_code") or e.get("code", "")
        return tool_name, (val, like(val))
    elif tool_name == "get_lecturers_by_major":
        val = e.get("major_name") or e.get("course_name") or e.get("keyword") or ""
        # Return all lecturers if no filter specified
        return tool_name, (like(val), like(val), val)
    elif tool_name == "get_lecturers_by_expertise":
        # expertise maps to course/skill name since lecturer_profiles is empty
        val = e.get("expertise") or e.get("course_name") or e.get("keyword") or ""
        return "get_lecturers_by_major", (like(val), like(val), "NOT_EMPTY_FLAG")
    elif tool_name == "list_lecturers":
        # list_lecturers fallback: return all lecturers without filter
        return "get_lecturers_by_major", ("%", "%", "")

    # ── Rooms ────────────────────────────────────────────────────────────
    elif tool_name == "get_empty_rooms":
        dt = e.get("date") or datetime.now().strftime("%Y-%m-%d")
        slot = e.get("slot_number") or e.get("slot")
        if not slot:
            slot = 1
        try:
            slot = int(slot)
        except (ValueError, TypeError):
            slot = 1
        return tool_name, (dt, slot)
    elif tool_name == "count_rooms_by_status":
        return tool_name, ()
    elif tool_name == "get_room_info":
        return tool_name, (like(req("room_name", "tên phòng")),)
    elif tool_name == "create_room":
        return tool_name, (req("name", "tên phòng"), e.get("capacity", 30))

    # ── Majors ───────────────────────────────────────────────────────────
    elif tool_name == "list_majors":
        return tool_name, ()
    elif tool_name == "create_major":
        return tool_name, (req("code", "mã ngành"), req("name", "tên ngành"))

    # ── Specializations ──────────────────────────────────────────────────
    elif tool_name in ["get_attendance_trends", "get_grade_distribution", "get_class_health_check", "get_student_ranking_in_class"]:
        cls = e.get("class_name") or ""
        return tool_name, (cls,)
    elif tool_name == "get_specializations_by_major":
        val = e.get("major_name", "")
        return tool_name, (like(val), like(val), val)
    elif tool_name == "get_sub_specializations":
        val = e.get("specialization_name") or e.get("major_name", "")
        return tool_name, (like(val), like(val), val)
    elif tool_name == "get_courses_by_spec":
        val = e.get("specialization_name") or e.get("major_name", "")
        return tool_name, (like(val), like(val), val)
    elif tool_name == "get_courses_by_sub_spec":
        val = e.get("sub_specialization_name") or e.get("specialization_name", "")
        return tool_name, (like(val), like(val), val)

    # ── Courses ──────────────────────────────────────────────────────────
    elif tool_name == "list_courses":
        return tool_name, ()
    elif tool_name == "get_courses_by_name":
        val = e.get("course_name") or e.get("course_code", "")
        return tool_name, (like(val), like(val))
    elif tool_name == "get_grade_components_by_course":
        val = e.get("course_name") or e.get("course_code", "")
        return tool_name, (like(val), like(val))
    elif tool_name == "get_grade_report_by_course":
        val = e.get("course_name") or e.get("course_code", "")
        return tool_name, (like(val), like(val))
    elif tool_name == "get_attendance_rate_by_course":
        val = e.get("course_name") or e.get("course_code", "")
        return tool_name, (like(val), like(val))
    elif tool_name == "create_course":
        return tool_name, (req("code"), req("name"), e.get("credits") or 3)

    # ── Semesters ────────────────────────────────────────────────────────
    elif tool_name in ("list_semesters", "get_active_semester"):
        return tool_name, ()
    elif tool_name == "create_semester":
        return tool_name, (req("code", "mã học kỳ"), req("name", "tên học kỳ"), e.get("start_date", ""), e.get("end_date", ""))

    # ── Classes ──────────────────────────────────────────────────────────
    elif tool_name == "get_classes_by_semester":
        import re as _re
        raw_val = (e.get("semester_code") or e.get("semester_name") or e.get("semester") or "").strip()
        # Normalize: "Spring 2026" → search like "%Spring%26%" to match "Spring26" or "SP26"
        # Extract season word and last 2 year digits
        season_match = _re.search(r'(spring|fall|summer|winter|xuân|thu|hè|đông)', raw_val, _re.I)
        year_match   = _re.search(r'20(\d{2})', raw_val)
        short_year   = year_match.group(1) if year_match else ""
        season       = season_match.group(1).capitalize() if season_match else ""
        if season and short_year:
            fuzzy = f"%{season}%{short_year}%"
        elif raw_val:
            # fallback: use raw stripped
            fuzzy = like(raw_val)
        else:
            fuzzy = "%"
        lec_id = user_id if user_role == "LECTURER" else -1
        # 6 params for the WHERE clause
        return tool_name, (fuzzy, fuzzy, fuzzy, fuzzy, lec_id, lec_id)
    elif tool_name == "create_class":
        return tool_name, (req("class_name"), req("course_code"), req("lecturer_code"), req("semester_code"))

    # ── Schedule Requests ────────────────────────────────────────────────
    elif tool_name == "get_own_schedule":
        dt_raw = e.get("date") or ""
        cls = e.get("class_name") or ""
        start_dt, end_dt = _resolve_date_range(dt_raw)
        
        if not dt_raw or dt_raw == "1970-01-01":
            if not cls:
                return "get_my_schedule", (user_id, user_id)
                
        return "get_my_schedule_targeted", (user_id, user_id, start_dt, end_dt, like(cls), cls)
    elif tool_name == "get_own_grades":
        return "get_my_grades", (user_id,)
    elif tool_name == "get_my_notifications":
        return tool_name, (user_id,)
    elif tool_name == "count_unread_notifications":
        return tool_name, (user_id,)
    elif tool_name == "get_my_attendance_status":
        return tool_name, (user_id,)
    elif tool_name == "get_attendance_report_by_student":
        return tool_name, (user_id,)
    elif tool_name == "get_class_schedule":
        cls = e.get("class_name")
        if not cls and user_role in ("LECTURER", "STUDENT"):
            # Safety Net: AI chọn nhầm get_class_schedule -> fallback get_own_schedule
            logger.info("[build_params] Safety Net: fallback get_class_schedule -> get_own_schedule")
            return build_params("get_own_schedule", e, user_id, user_role)
        start_dt, end_dt = _resolve_date_range(e.get("date"))
        return tool_name, (req("class_name"), start_dt, end_dt)
    elif tool_name == "get_other_lecturer_schedule":
        val = e.get("full_name") or e.get("code") or e.get("lecturer_code", "")
        start_dt, end_dt = _resolve_date_range(e.get("date"))
        return "get_lecturer_schedule_by_search", (like(val), val, start_dt, end_dt)
    elif tool_name == "get_other_student_schedule":
        val = e.get("full_name") or e.get("code") or e.get("student_code", "")
        start_dt, end_dt = _resolve_date_range(e.get("date"))
        return "get_student_schedule_by_search", (like(val), val, start_dt, end_dt)

    # ── Assignments & Mutations (Python handled) ─────────────────────────
    elif tool_name == "assign_course_to_specialization":
        return tool_name, (e.get("semester", 1), e.get("specialization_code") or e.get("specialization_name", ""), like(e.get("specialization_name", "")), e.get("course_code") or e.get("course_name", ""), like(e.get("course_name", "")))
    elif tool_name == "assign_course_to_sub_specialization":
        return tool_name, (e.get("sub_specialization_code") or e.get("sub_specialization_name", ""), like(e.get("sub_specialization_name", "")), e.get("course_code") or e.get("course_name", ""), like(e.get("course_name", "")))
    elif tool_name in ("delete_major", "delete_course", "delete_specialization", "delete_sub_specialization"):
        val = e.get("code") or e.get("name", "")
        return tool_name, (val, val)
    elif tool_name == "delete_room":
        return tool_name, (e.get("room_name") or e.get("name", ""),)
    elif tool_name == "delete_semester":
        return tool_name, (e.get("semester_code") or e.get("code", ""),)
    elif tool_name == "delete_class":
        return tool_name, (req("class_name"),)
    elif tool_name == "update_student_info":
        return tool_name, (e.get("major_code") or e.get("major_name", ""), e.get("major_name", ""), req("student_code"))
    elif tool_name == "update_lecturer_info":
        return tool_name, (req("expertise"), req("department"), req("lecturer_code"))
    elif tool_name == "update_room":
        return tool_name, (e.get("capacity", 30), e.get("status", "ACTIVE"), req("room_name"))
    elif tool_name == "update_semester":
        return tool_name, (req("name"), req("start_date"), req("end_date"), e.get("status", "UPCOMING"), req("semester_code"))
    elif tool_name == "update_course":
        return tool_name, (req("name"), e.get("credits", 3), e.get("status", "ACTIVE"), req("course_code"))
    elif tool_name == "update_major":
        return tool_name, (req("name"), e.get("status", "ACTIVE"), req("code"))
    elif tool_name == "update_specialization":
        return tool_name, (req("name"), e.get("status", "ACTIVE"), req("code"))
    elif tool_name == "update_sub_specialization":
        return tool_name, (req("name"), req("code"))
    elif tool_name == "update_class":
        return tool_name, (req("lecturer_code"), req("semester_code"), req("class_name"))

    # ── Schedule Requests ────────────────────────────────────────────────
    elif tool_name == "get_schedule_request_list":
        return tool_name, ()
    elif tool_name == "get_my_schedule_requests":
        return tool_name, (user_id,)
    elif tool_name == "get_schedule_request_detail":
        return tool_name, (req("request_id"),)
    elif tool_name == "approve_schedule_request":
        return tool_name, (req("request_id"),)
    elif tool_name == "reject_schedule_request":
        return tool_name, (req("request_id"),)

    # ── Attendance ───────────────────────────────────────────────────────
    elif tool_name == "get_attendance_by_slot":
        cls = req("class_name")
        date = e.get("date", "CURRENT_DATE")
        return tool_name, (like(cls), date)
    elif tool_name == "get_attendance_stats_by_class":
        return tool_name, (like(req("class_name")),)
    elif tool_name == "get_attendance_trends":
        return tool_name, (req("class_name"),)
    elif tool_name == "get_grade_distribution":
        return tool_name, (req("class_name"),)
    elif tool_name == "get_abnormal_attendance":
        return tool_name, ()
    elif tool_name == "update_attendance_manually":
        return tool_name, (req("status", "trạng thái (PRESENT/ABSENT/LATE)"), req("student_code", "mã SV"), req("session_id"))

    # ── Grades ───────────────────────────────────────────────────────────
    elif tool_name == "get_detail_course_grade":
        val = e.get("course_name") or e.get("course_code", "")
        return tool_name, (user_id, like(val), like(val))
    elif tool_name == "get_grade_report_by_class":
        return tool_name, (like(req("class_name")),)
    elif tool_name == "get_gpa_stats_by_major":
        return tool_name, ()

    # ── Notifications ────────────────────────────────────────────────────
    elif tool_name == "list_notifications":
        return tool_name, ()

    # ── Specialization / Sub-Spec Create ───────────────────────────────
    elif tool_name == "create_specialization":
        return tool_name, (req("major_code"), req("spec_code"), req("spec_name"))
    elif tool_name == "create_sub_specialization":
        return tool_name, (req("sub_code"), req("sub_name"), req("spec_code"))
    elif tool_name == "create_class":
        return tool_name, (req("class_name"), req("course_code"), req("lecturer_code"), req("semester_code"))

    else:
        raise ValueError(f"Không có param builder cho tool: '{tool_name}'")