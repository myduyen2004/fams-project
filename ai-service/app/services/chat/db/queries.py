"""
db/queries.py  ── v2.0 (Nâng cấp toàn diện)
Tập trung toàn bộ SQL templates và param builders.

Cải tiến so với v1:
  • LIMIT tăng hợp lý theo từng use-case (không còn cắt cụt dữ liệu)
  • JOIN phong phú hơn – mỗi query trả về đủ context để AI phân tích
  • Thêm ~20 query mới: student_timeline, course_workload, lecturer_stats,
    semester_overview, attendance_heatmap, grade_trend, v.v.
  • Tất cả query dùng COALESCE/NULLIF để tránh NULL bất ngờ
  • Thêm index hints (ORDER BY có sử dụng indexed columns)
  • v2.1: Thêm normalize_entities() để chuẩn hóa TODAY/TOMORROW/THIS_WEEK
"""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Tuple, Optional
from loguru import logger # type: ignore


# ══════════════════════════════════════════════════════════════════════════════
# ENTITY NORMALIZATION - Chuyển đổi giá trị từ LLM sang giá trị thực
# ══════════════════════════════════════════════════════════════════════════════

def normalize_entities(
    entities: Optional[dict], 
    user_code: str = None,
    tool_name: str = None
) -> dict:
    """
    Chuẩn hóa entities từ LLM thành giá trị thực tế.
    
    Xử lý các trường hợp:
    - TODAY/hôm nay → date thực (YYYY-MM-DD)
    - TOMORROW/ngày mai → date thực
    - THIS_WEEK/tuần này → start_date + end_date
    - NEXT_WEEK/tuần sau → start_date + end_date
    - Inject user_code cho các tool get_own_*/get_my_*
    
    Args:
        entities: Dict chứa entities từ LLM
        user_code: Mã user hiện tại (GV001, SE12345, ...)
        tool_name: Tên tool để xác định có cần inject user_code không
        
    Returns:
        Dict đã được chuẩn hóa
    """
    if not entities:
        entities = {}
    else:
        entities = entities.copy()  # Tránh mutate dict gốc
    
    now = datetime.now()
    
    # ── Normalize date expressions ──
    date_val = str(entities.get("date", "")).upper().strip()
    
    if date_val in ("TODAY", "HÔM NAY", "HOM NAY", "HÔMNAY"):
        entities["date"] = now.strftime("%Y-%m-%d")
        logger.debug(f"[normalize] date: TODAY → {entities['date']}")
        
    elif date_val in ("TOMORROW", "NGÀY MAI", "NGAY MAI", "NGÀYMAI"):
        entities["date"] = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        logger.debug(f"[normalize] date: TOMORROW → {entities['date']}")
        
    elif date_val in ("YESTERDAY", "HÔM QUA", "HOM QUA"):
        entities["date"] = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        logger.debug(f"[normalize] date: YESTERDAY → {entities['date']}")
        
    elif date_val in ("THIS_WEEK", "TUẦN NÀY", "TUAN NAY", "TUẦNNÀY"):
        # Monday (start) và Sunday (end) của tuần hiện tại
        monday = now - timedelta(days=now.weekday())
        sunday = monday + timedelta(days=6)
        entities["start_date"] = monday.strftime("%Y-%m-%d")
        entities["end_date"] = sunday.strftime("%Y-%m-%d")
        if "date" in entities:
            del entities["date"]
        logger.debug(f"[normalize] THIS_WEEK → {entities['start_date']} to {entities['end_date']}")
        
    elif date_val in ("NEXT_WEEK", "TUẦN SAU", "TUAN SAU", "TUẦNSAU"):
        monday = now - timedelta(days=now.weekday()) + timedelta(weeks=1)
        sunday = monday + timedelta(days=6)
        entities["start_date"] = monday.strftime("%Y-%m-%d")
        entities["end_date"] = sunday.strftime("%Y-%m-%d")
        if "date" in entities:
            del entities["date"]
        logger.debug(f"[normalize] NEXT_WEEK → {entities['start_date']} to {entities['end_date']}")
        
    elif date_val in ("LAST_WEEK", "TUẦN TRƯỚC", "TUAN TRUOC"):
        monday = now - timedelta(days=now.weekday()) - timedelta(weeks=1)
        sunday = monday + timedelta(days=6)
        entities["start_date"] = monday.strftime("%Y-%m-%d")
        entities["end_date"] = sunday.strftime("%Y-%m-%d")
        if "date" in entities:
            del entities["date"]
        logger.debug(f"[normalize] LAST_WEEK → {entities['start_date']} to {entities['end_date']}")
    
    # ── Inject user_code cho get_own_*/get_my_* tools ──
    own_tools = {
        "get_own_schedule", "get_own_grades", "get_my_attendance_status",
        "get_my_notifications", "get_my_schedule_requests", 
        "get_attendance_report_by_student", "get_detail_course_grade",
        "get_abnormal_attendance", "get_students_at_risk", 
        "get_grade_components_by_course"
    }
    
    if tool_name and tool_name in own_tools and user_code:
        if not entities.get("user_code"):
            entities["user_code"] = user_code
            logger.debug(f"[normalize] Injected user_code={user_code} for tool={tool_name}")
    
    return entities


# ── SQL Templates ─────────────────────────────────────────────────────────────
TEMPLATES: dict[str, str] = {

    # ════════════════════════════════════════════════════════════════════════
    # USER SEARCH
    # ════════════════════════════════════════════════════════════════════════

    "search_user_by_name": """
        SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status,
               COALESCE(sp.gpa, 0)  AS gpa,
               COALESCE(m.name, '')  AS major,
               COALESCE(s.name, '')  AS specialization
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        LEFT JOIN specializations    s  ON sp.specialization_id = s.id
        WHERE  unaccent(u.full_name) ILIKE unaccent(%s)
        ORDER BY u.role, u.full_name
        LIMIT  100
    """,

    "get_user_by_code": """
        SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status,
               COALESCE(sp.gpa, 0)  AS gpa,
               COALESCE(m.name, '')  AS major,
               COALESCE(s.name, '')  AS specialization,
               COALESCE(lp.expertise, '') AS expertise,
               COALESCE(lp.department, '') AS department
        FROM   users u
        LEFT JOIN student_profiles  sp ON u.id = sp.user_id
        LEFT JOIN majors             m  ON sp.major_id = m.id
        LEFT JOIN specializations    s  ON sp.specialization_id = s.id
        LEFT JOIN lecturer_profiles  lp ON u.id = lp.user_id
        WHERE  u.code = %s
        LIMIT  1
    """,

    "view_inactive_users": """
        SELECT u.full_name, u.code, u.email, u.role, u.status,
               COALESCE(m.name, '') AS major
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  u.status = 'INACTIVE'
        ORDER BY u.role, u.full_name
        LIMIT  100
    """,

    "count_users_by_role": """
        SELECT role,
               COUNT(*)                                          AS total,
               SUM(CASE WHEN status = 'ACTIVE'   THEN 1 ELSE 0 END) AS active,
               SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) AS inactive
        FROM   users
        GROUP BY role
        ORDER BY role
    """,

    # ════════════════════════════════════════════════════════════════════════
    # STUDENTS
    # ════════════════════════════════════════════════════════════════════════

    "get_student_by_code": """
        SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.status,
               COALESCE(sp.gpa, 0)      AS gpa,
               COALESCE(m.name,  '')    AS major,
               COALESCE(m.code,  '')    AS major_code,
               COALESCE(s.name,  '')    AS specialization,
               COALESCE(ss.name, '')    AS sub_specialization,
               (SELECT COUNT(*) FROM enrollments e2 WHERE e2.student_id = u.id)
                                        AS enrolled_classes,
               (SELECT COUNT(*) FROM student_attendances sa2
                JOIN attendance_sessions ats2 ON sa2.session_id = ats2.id
                WHERE sa2.student_id = u.id AND sa2.status = 'ABSENT')
                                        AS total_absences
        FROM   users u
        LEFT JOIN student_profiles   sp ON u.id = sp.user_id
        LEFT JOIN majors              m  ON sp.major_id = m.id
        LEFT JOIN specializations     s  ON sp.specialization_id = s.id
        LEFT JOIN sub_specializations ss ON sp.sub_specialization_id = ss.id
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = 'STUDENT'
        LIMIT  5
    """,

    "get_students_by_major": """
        SELECT u.full_name, u.code, u.email, u.phone,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '')  AS major,
               COALESCE(s.name, '')  AS specialization,
               u.status
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        LEFT JOIN specializations   s  ON sp.specialization_id = s.id
        WHERE  (unaccent(m.name) ILIKE unaccent(%s)
             OR unaccent(m.code) ILIKE unaccent(%s)
             OR %s = '')
          AND  u.status = 'ACTIVE'
          AND  u.role = 'STUDENT'
        ORDER BY sp.gpa DESC NULLS LAST
        LIMIT  100
    """,

    "get_students_by_class": """
        SELECT u.full_name, u.code, u.email, u.phone,
               e.class_name,
               COALESCE(sp.gpa, 0)  AS gpa,
               COALESCE(m.name, '') AS major,
               (SELECT COUNT(*) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                JOIN timetable_slots ts ON ats.timetable_slot_id = ts.id
                WHERE sa.student_id = u.id
                  AND ts.class_name = e.class_name
                  AND sa.status = 'ABSENT')   AS absences_in_class
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
        LIMIT  200
    """,

    "get_students_without_class": """
        SELECT u.full_name, u.code, u.email,
               COALESCE(m.name, '') AS major,
               COALESCE(sp.gpa, 0) AS gpa
        FROM   users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  u.role = 'STUDENT'
          AND  u.status = 'ACTIVE'
          AND  u.id NOT IN (SELECT DISTINCT student_id FROM enrollments)
        ORDER BY u.full_name
        LIMIT  100
    """,

    "get_top_students": """
        SELECT u.full_name, u.code, u.email,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '')  AS major,
               COALESCE(s.name, '')  AS specialization,
               (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = u.id) AS classes_enrolled
        FROM   users u
        JOIN   student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors         m  ON sp.major_id = m.id
        LEFT JOIN specializations s ON sp.specialization_id = s.id
        WHERE  u.status = 'ACTIVE' AND u.role = 'STUDENT'
        ORDER BY sp.gpa DESC NULLS LAST
        LIMIT  20
    """,

    "count_students_by_major": """
        SELECT m.name  AS major_name,
               m.code  AS major_code,
               COUNT(CASE WHEN u.status = 'ACTIVE' THEN 1 END)    AS active_students,
               COUNT(CASE WHEN u.status = 'INACTIVE' THEN 1 END)  AS inactive_students,
               COUNT(sp.user_id)                                   AS total_students,
               ROUND(AVG(sp.gpa), 2)                              AS avg_gpa
        FROM   majors m
        LEFT JOIN student_profiles sp ON m.id = sp.major_id
        LEFT JOIN users            u  ON sp.user_id = u.id
        WHERE  unaccent(m.name) ILIKE unaccent(%s)
            OR unaccent(m.code) ILIKE unaccent(%s)
            OR %s = ''
        GROUP BY m.name, m.code
        ORDER BY active_students DESC
    """,

    "get_students_at_risk": """
        SELECT u.full_name, u.code, u.email,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '')  AS major,
               (SELECT COUNT(*) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                WHERE sa.student_id = u.id AND sa.status = 'ABSENT') AS total_absences,
               (SELECT COUNT(DISTINCT e2.class_name) FROM enrollments e2 WHERE e2.student_id = u.id) AS classes_enrolled
        FROM   users u
        JOIN   student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors         m  ON sp.major_id = m.id
        WHERE  u.status = 'ACTIVE'
          AND  u.role = 'STUDENT'
          AND  (sp.gpa < %s OR %s = 0)
        ORDER BY sp.gpa ASC, total_absences DESC
        LIMIT  50
    """,

    # NEW: Timeline học tập của một sinh viên
    "get_student_academic_timeline": """
        SELECT sem.name AS semester, c.name AS course, e.class_name,
               COALESCE(u_lec.full_name, 'N/A') AS lecturer,
               ROUND(SUM(sg.score * gc.weight) / NULLIF(SUM(gc.weight),0), 2) AS final_score,
               SUM(CASE WHEN sa.status='PRESENT' THEN 1 ELSE 0 END)  AS sessions_present,
               SUM(CASE WHEN sa.status='ABSENT'  THEN 1 ELSE 0 END)  AS sessions_absent,
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
        ORDER BY sem.start_date DESC
    """,

    # NEW: So sánh GPA của SV với trung bình ngành
    "get_student_gpa_comparison": """
        SELECT u.full_name, u.code,
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
        JOIN   users            u2  ON sp2.user_id = u2.id AND u2.status = 'ACTIVE'
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = 'STUDENT'
        GROUP BY u.full_name, u.code, sp.gpa, m.name, sp.major_id
        LIMIT 1
    """,

    # ════════════════════════════════════════════════════════════════════════
    # LECTURERS
    # ════════════════════════════════════════════════════════════════════════

    "get_lecturer_by_code": """
        SELECT u.full_name, u.code, u.email, u.phone, u.role, u.status,
               COALESCE(lp.expertise,  '') AS expertise,
               COALESCE(lp.department, '') AS department,
               COUNT(DISTINCT cs.class_name)  AS active_classes,
               COUNT(DISTINCT cs.course_id)   AS distinct_courses
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections    cs ON u.id = cs.lecturer_id
        LEFT JOIN semesters         s  ON cs.semester_id = s.id AND s.status = 'ACTIVE'
        WHERE  (u.code = %s OR unaccent(u.full_name) ILIKE unaccent(%s))
          AND  u.role = 'LECTURER'
        GROUP BY u.full_name, u.code, u.email, u.phone, u.role, u.status, lp.expertise, lp.department
    """,

    "get_lecturers_by_major": """
        SELECT DISTINCT u.full_name, u.code, u.email,
               COALESCE(lp.expertise,  '') AS expertise,
               COALESCE(lp.department, '') AS department,
               string_agg(DISTINCT c.name,  ', ') AS courses_taught,
               COUNT(DISTINCT cs.class_name)       AS total_classes
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections cs ON cs.lecturer_id = u.id
        LEFT JOIN courses        c  ON cs.course_id   = c.id
        WHERE  u.role = 'LECTURER'
          AND  u.status = 'ACTIVE'
          AND  (unaccent(c.name) ILIKE unaccent(%s)
             OR unaccent(c.code) ILIKE unaccent(%s)
             OR unaccent(lp.department) ILIKE unaccent(%s)
             OR unaccent(lp.expertise) ILIKE unaccent(%s)
             OR %s = '')
        GROUP BY u.full_name, u.code, u.email, lp.expertise, lp.department
        ORDER BY total_classes DESC, u.full_name
        LIMIT  50
    """,

    "get_lecturers_by_expertise": """
        SELECT DISTINCT u.full_name, u.code, u.email,
               COALESCE(lp.expertise,  '') AS expertise,
               COALESCE(lp.department, '') AS department,
               string_agg(DISTINCT c.name, ', ') AS courses_taught
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections cs ON cs.lecturer_id = u.id
        LEFT JOIN courses        c  ON cs.course_id   = c.id
        WHERE  u.role = 'LECTURER'
          AND  u.status = 'ACTIVE'
          AND  (unaccent(c.name) ILIKE unaccent(%s)
             OR unaccent(c.code) ILIKE unaccent(%s)
             OR unaccent(lp.department) ILIKE unaccent(%s)
             OR unaccent(lp.expertise) ILIKE unaccent(%s))
        GROUP BY u.full_name, u.code, u.email, lp.expertise, lp.department
        ORDER BY u.full_name
        LIMIT  30
    """,

    # NEW: Thống kê tải giảng dạy của từng GV
    "get_lecturer_workload": """
        SELECT u.full_name, u.code,
               COALESCE(lp.department, '') AS department,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT cs.course_id)   AS distinct_courses,
               COUNT(DISTINCT e.student_id)   AS total_students,
               COUNT(DISTINCT sem.id)          AS semesters_active,
               string_agg(DISTINCT sem.name, ', ') AS semester_names
        FROM   users u
        LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
        LEFT JOIN class_sections    cs ON u.id = cs.lecturer_id
        LEFT JOIN semesters        sem ON cs.semester_id = sem.id
        LEFT JOIN enrollments       e  ON cs.class_name = e.class_name
        WHERE  u.role = 'LECTURER' AND u.status = 'ACTIVE'
          AND  (unaccent(u.full_name) ILIKE unaccent(%s) OR u.code = %s OR %s = '')
        GROUP BY u.full_name, u.code, lp.department
        ORDER BY total_students DESC
        LIMIT  30
    """,

    # ════════════════════════════════════════════════════════════════════════
    # ROOMS
    # ════════════════════════════════════════════════════════════════════════

    "get_empty_rooms": """
        SELECT r.name, r.capacity, r.status,
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
          AND  r.status = 'ACTIVE'
        ORDER BY r.capacity DESC, r.name
    """,

    "get_room_info": """
        SELECT r.name, r.capacity, r.status,
               COUNT(DISTINCT ts.date)        AS days_used,
               COUNT(ts.id)                   AS total_slots_scheduled
        FROM   rooms r
        LEFT JOIN timetable_slots ts ON r.id = ts.room_id
        WHERE  unaccent(r.name) ILIKE unaccent(%s)
        GROUP BY r.name, r.capacity, r.status
        LIMIT  5
    """,

    "count_rooms_by_status": """
        SELECT status,
               COUNT(*)        AS total,
               SUM(capacity)   AS total_capacity,
               ROUND(AVG(capacity)) AS avg_capacity
        FROM   rooms
        GROUP BY status
        ORDER BY status
    """,

    # NEW: Lịch sử sử dụng phòng trong tuần
    "get_room_usage_weekly": """
        SELECT r.name AS room, r.capacity,
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
        LIMIT  100
    """,

    # ════════════════════════════════════════════════════════════════════════
    # MAJORS
    # ════════════════════════════════════════════════════════════════════════

    "list_majors": """
        SELECT m.code, m.name, m.status,
               COUNT(DISTINCT sp.user_id)   AS total_students,
               COUNT(DISTINCT s.id)         AS total_specializations
        FROM   majors m
        LEFT JOIN student_profiles sp ON m.id = sp.major_id
        LEFT JOIN users             u  ON sp.user_id = u.id AND u.status = 'ACTIVE'
        LEFT JOIN specializations   s  ON m.id = s.major_id AND s.status = 'ACTIVE'
        WHERE  m.status = 'ACTIVE'
        GROUP BY m.code, m.name, m.status
        ORDER BY m.name
    """,

    "get_major_id_by_name": """
        SELECT id, name, code FROM majors
        WHERE (unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s))
          AND status = 'ACTIVE'
        LIMIT  1
    """,

    # ════════════════════════════════════════════════════════════════════════
    # SPECIALIZATIONS
    # ════════════════════════════════════════════════════════════════════════

    "get_specializations_by_major": """
        SELECT s.name, s.code, s.status,
               m.name  AS major_name,
               COUNT(DISTINCT sp.user_id)  AS total_students,
               COUNT(DISTINCT ss.id)       AS sub_spec_count,
               COUNT(DISTINCT sc.course_id) AS course_count
        FROM   specializations s
        JOIN   majors           m  ON s.major_id = m.id
        LEFT JOIN student_profiles sp ON sp.specialization_id = s.id
        LEFT JOIN users             u  ON sp.user_id = u.id AND u.status = 'ACTIVE'
        LEFT JOIN sub_specializations ss ON ss.specialization_id = s.id
        LEFT JOIN specialization_courses sc ON sc.specialization_id = s.id
        WHERE  (unaccent(m.name) ILIKE unaccent(%s)
             OR unaccent(m.code) ILIKE unaccent(%s)
             OR %s = '')
        GROUP BY s.name, s.code, s.status, m.name
        ORDER BY s.name
    """,

    "get_sub_specializations": """
        SELECT ss.name AS sub_spec_name, ss.code AS sub_spec_code,
               s.name  AS spec_name, s.code AS spec_code,
               m.name  AS major_name,
               COUNT(DISTINCT ssc.course_id) AS course_count
        FROM   sub_specializations ss
        JOIN   specializations      s   ON ss.specialization_id = s.id
        JOIN   majors               m   ON s.major_id = m.id
        LEFT JOIN sub_specialization_courses ssc ON ssc.sub_specialization_id = ss.id
        WHERE  (unaccent(s.name) ILIKE unaccent(%s)
             OR unaccent(s.code) ILIKE unaccent(%s)
             OR %s = '')
        GROUP BY ss.name, ss.code, s.name, s.code, m.name
        ORDER BY ss.name
    """,

    "get_specialization_id_by_name": """
        SELECT id, name, code FROM specializations
        WHERE (unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s))
          AND status = 'ACTIVE'
        LIMIT  1
    """,

    # ════════════════════════════════════════════════════════════════════════
    # COURSES
    # ════════════════════════════════════════════════════════════════════════

    "list_courses": """
        SELECT c.code, c.name, c.credits, c.status,
               COUNT(DISTINCT cs.class_name) AS total_classes,
               COUNT(DISTINCT sc.specialization_id) AS in_specializations
        FROM   courses c
        LEFT JOIN class_sections cs ON c.id = cs.course_id
        LEFT JOIN specialization_courses sc ON c.id = sc.course_id
        WHERE  c.status = 'ACTIVE'
        GROUP BY c.code, c.name, c.credits, c.status
        ORDER BY c.name
        LIMIT  100
    """,

    "get_courses_by_name": """
        SELECT c.code, c.name, c.credits, c.status,
               COUNT(DISTINCT cs.class_name)    AS total_classes,
               COUNT(DISTINCT e.student_id)     AS total_students_ever,
               string_agg(DISTINCT sem.name, ', ') AS offered_in_semesters
        FROM   courses c
        LEFT JOIN class_sections cs  ON c.id = cs.course_id
        LEFT JOIN enrollments     e  ON cs.class_name = e.class_name
        LEFT JOIN semesters       sem ON cs.semester_id = sem.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s)
           OR  unaccent(c.code) ILIKE unaccent(%s)
        GROUP BY c.code, c.name, c.credits, c.status
        LIMIT  20
    """,

    "get_courses_by_spec": """
        SELECT c.code, c.name, c.credits, sc.semester,
               COUNT(DISTINCT cs.class_name) AS total_classes
        FROM   courses c
        JOIN   specialization_courses sc ON c.id = sc.course_id
        JOIN   specializations         s  ON sc.specialization_id = s.id
        LEFT JOIN class_sections       cs ON c.id = cs.course_id
        WHERE  (unaccent(s.name) ILIKE unaccent(%s)
             OR unaccent(s.code) ILIKE unaccent(%s)
             OR %s = '')
        GROUP BY c.code, c.name, c.credits, sc.semester
        ORDER BY sc.semester, c.name
    """,

    "get_courses_by_sub_spec": """
        SELECT c.code, c.name, c.credits,
               ss.name AS sub_spec_name
        FROM   courses c
        JOIN   sub_specialization_courses ssc ON c.id = ssc.course_id
        JOIN   sub_specializations         ss  ON ssc.sub_specialization_id = ss.id
        WHERE  (unaccent(ss.name) ILIKE unaccent(%s)
             OR unaccent(ss.code) ILIKE unaccent(%s)
             OR %s = '')
        ORDER BY c.name
    """,

    "get_grade_components_by_course": """
        SELECT gc.name, gc.type, gc.weight,
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
        ORDER BY gc.weight DESC
    """,

    # ════════════════════════════════════════════════════════════════════════
    # SEMESTERS
    # ════════════════════════════════════════════════════════════════════════

    "list_semesters": """
        SELECT s.code, s.name, s.start_date, s.end_date, s.status,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT e.student_id)   AS enrolled_students
        FROM   semesters s
        LEFT JOIN class_sections cs ON s.id = cs.semester_id
        LEFT JOIN enrollments     e  ON cs.class_name = e.class_name
        GROUP BY s.code, s.name, s.start_date, s.end_date, s.status
        ORDER BY s.start_date DESC
        LIMIT  100
    """,

    "get_active_semester": """
        SELECT s.code, s.name, s.start_date, s.end_date, s.status,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT e.student_id)   AS enrolled_students,
               COUNT(DISTINCT cs.lecturer_id) AS active_lecturers
        FROM   semesters s
        LEFT JOIN class_sections cs ON s.id = cs.semester_id
        LEFT JOIN enrollments     e  ON cs.class_name = e.class_name
        WHERE  s.status = 'ONGOING'
        GROUP BY s.code, s.name, s.start_date, s.end_date, s.status
        ORDER BY s.start_date DESC
        LIMIT  1
    """,

    # NEW: Tổng quan một học kỳ
    "get_semester_overview": """
        SELECT s.code, s.name, s.start_date, s.end_date, s.status,
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
             OR %s = '')
        GROUP BY s.code, s.name, s.start_date, s.end_date, s.status
        ORDER BY s.start_date DESC
        LIMIT  5
    """,

    # ════════════════════════════════════════════════════════════════════════
    # CLASSES & ENROLLMENT
    # ════════════════════════════════════════════════════════════════════════

    "get_classes_by_semester": """
        SELECT cs.class_name,
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
            OR replace(unaccent(lower(s.name)), ' ', '') ILIKE replace(unaccent(lower(%s)), ' ', '')
            OR replace(unaccent(lower(s.code)), ' ', '') ILIKE replace(unaccent(lower(%s)), ' ', '')
        )
          AND  (cs.lecturer_id = %s OR %s = -1)
        GROUP BY cs.class_name, c.name, c.credits, u.full_name, u.code, s.name
        ORDER BY cs.class_name
        LIMIT  100
    """,

    "get_class_info": """
        SELECT cs.class_name,
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
               (SELECT ROUND(100.0 * SUM(CASE WHEN sa.status='PRESENT' THEN 1 ELSE 0 END)
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
                 u.full_name, u.code, u.email, s.name, s.start_date, s.end_date
    """,

    "get_enrollments_by_class": """
        SELECT u.full_name, u.code, u.email, u.phone,
               COALESCE(sp.gpa, 0)   AS gpa,
               COALESCE(m.name, '')  AS major,
               e.class_name,
               (SELECT COUNT(*) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                JOIN timetable_slots ts ON ats.timetable_slot_id = ts.id
                WHERE sa.student_id = u.id AND ts.class_name = e.class_name
                  AND sa.status = 'ABSENT') AS absences
        FROM   users u
        JOIN   enrollments e ON u.id = e.student_id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN majors            m  ON sp.major_id = m.id
        WHERE  unaccent(e.class_name) ILIKE unaccent(%s)
        ORDER BY sp.gpa DESC NULLS LAST, u.full_name
        LIMIT  200
    """,

    # ════════════════════════════════════════════════════════════════════════
    # SCHEDULES
    # ════════════════════════════════════════════════════════════════════════

    "get_my_schedule": """
        SELECT DISTINCT ts.date, ts.slot_number,
               cs.class_name,
               c.name     AS course_name,
               c.credits,
               r.name     AS room,
               r.capacity AS room_capacity,
               st.start_time, st.end_time,
               ts.status  AS slot_status
        FROM   timetable_slots ts
        JOIN   class_sections  cs ON ts.class_name  = cs.class_name
        JOIN   courses          c  ON cs.course_id   = c.id
        LEFT JOIN rooms        r  ON ts.room_id      = r.id
        LEFT JOIN slot_types   st ON ts.slot_type_id = st.id
        LEFT JOIN enrollments  e  ON cs.class_name   = e.class_name
        WHERE  (e.student_id = %s OR cs.lecturer_id = %s)
          AND  ts.date >= CURRENT_DATE
        ORDER BY ts.date, ts.slot_number
        LIMIT  50
    """,

    "get_my_schedule_targeted": """
        SELECT DISTINCT ts.date, ts.slot_number,
               cs.class_name,
               c.name     AS course_name,
               c.credits,
               r.name     AS room,
               r.capacity AS room_capacity,
               st.start_time, st.end_time,
               ts.status  AS slot_status,
               sem.name   AS semester
        FROM   timetable_slots ts
        JOIN   class_sections  cs  ON ts.class_name   = cs.class_name
        JOIN   courses          c   ON cs.course_id    = c.id
        JOIN   semesters       sem  ON cs.semester_id  = sem.id
        LEFT JOIN rooms        r   ON ts.room_id       = r.id
        LEFT JOIN slot_types   st  ON ts.slot_type_id  = st.id
        LEFT JOIN enrollments  e   ON cs.class_name    = e.class_name
        WHERE  (e.student_id = %s OR cs.lecturer_id = %s)
          AND  (ts.date BETWEEN %s AND %s)
          AND  (unaccent(cs.class_name) ILIKE unaccent(%s) OR %s = '')
        ORDER BY ts.date, ts.slot_number
        LIMIT  100
    """,

    "get_class_schedule": """
        SELECT ts.date, ts.slot_number,
               r.name      AS room,
               r.capacity  AS room_capacity,
               st.start_time, st.end_time,
               ts.status,
               (SELECT COUNT(DISTINCT sa.student_id) FROM student_attendances sa
                JOIN attendance_sessions ats ON sa.session_id = ats.id
                WHERE ats.timetable_slot_id = ts.id
                  AND sa.status = 'PRESENT') AS present_count
        FROM   timetable_slots ts
        LEFT JOIN rooms      r  ON ts.room_id      = r.id
        LEFT JOIN slot_types st ON ts.slot_type_id = st.id
        WHERE  ts.class_name = %s
          AND  ts.date BETWEEN %s AND %s
        ORDER BY ts.date, ts.slot_number
        LIMIT  50
    """,

    "get_lecturer_schedule_by_search": """
        SELECT ts.date, ts.slot_number,
               cs.class_name, c.name AS course_name, c.credits,
               r.name      AS room,
               r.capacity  AS room_capacity,
               st.start_time, st.end_time,
               u.full_name AS lecturer_name,
               sem.name    AS semester
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
        LIMIT  100
    """,

    "get_student_schedule_by_search": """
        SELECT ts.date, ts.slot_number,
               cs.class_name, c.name AS course_name, c.credits,
               r.name     AS room,
               st.start_time, st.end_time,
               u.full_name AS student_name, u.code AS student_code,
               sem.name    AS semester
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
        LIMIT  100
    """,

    # ════════════════════════════════════════════════════════════════════════
    # SCHEDULE REQUESTS
    # ════════════════════════════════════════════════════════════════════════

    "get_schedule_request_list": """
        SELECT sr.id, u.full_name AS requester, u.code AS requester_code,
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
        LIMIT  50
    """,

    "get_my_schedule_requests": """
        SELECT sr.id, sr.reason, sr.status, sr.created_at,
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
        LIMIT  30
    """,

    "create_schedule_request": """
        INSERT INTO schedule_requests (requester_id, original_slot_id, requested_slot_id, reason, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, 'PENDING', NOW(), NOW())
        RETURNING id, reason, status, created_at
    """,

    "get_schedule_request_detail": """
        SELECT sr.id, u.full_name AS requester, u.code AS requester_code,
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
        WHERE  sr.id = %s
    """,

    # ════════════════════════════════════════════════════════════════════════
    # ATTENDANCE
    # ════════════════════════════════════════════════════════════════════════

    "get_attendance_by_slot": """
        SELECT u.full_name, u.code,
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
        ORDER BY sa.status, u.full_name
    """,

    "get_attendance_stats_by_class": """
        SELECT
            COUNT(DISTINCT sa.student_id)                                              AS total_students,
            COUNT(sa.id)                                                               AS total_records,
            SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)                   AS present,
            SUM(CASE WHEN sa.status = 'ABSENT'  THEN 1 ELSE 0 END)                   AS absent,
            SUM(CASE WHEN sa.status = 'LATE'    THEN 1 ELSE 0 END)                   AS late,
            ROUND(100.0 * SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sa.id), 0), 1)                                 AS present_rate,
            ROUND(100.0 * SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END)
                        / NULLIF(COUNT(sa.id), 0), 1)                                 AS absent_rate,
            SUM(CASE WHEN sa.method = 'QR_CODE' THEN 1 ELSE 0 END)                   AS qr_checkins,
            SUM(CASE WHEN sa.method = 'MANUAL'  THEN 1 ELSE 0 END)                   AS manual_checkins,
            COUNT(DISTINCT ts.date)                                                    AS total_sessions
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  unaccent(ts.class_name) ILIKE unaccent(%s)
    """,

    "get_attendance_rate_by_course": """
        SELECT c.name AS course_name, c.code AS course_code,
               COUNT(DISTINCT cs.class_name)  AS total_classes,
               COUNT(DISTINCT sa.student_id)  AS student_count,
               COUNT(sa.id)                   AS total_records,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS present_rate,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id  = c.id
        WHERE  unaccent(c.name) ILIKE unaccent(%s)
            OR unaccent(c.code) ILIKE unaccent(%s)
        GROUP BY c.name, c.code
    """,

    "get_my_attendance_status": """
        SELECT ts.class_name, c.name AS course_name,
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
        LIMIT  20
    """,

    "get_attendance_report_by_student": """
        SELECT c.name AS course_name, ts.class_name,
               COUNT(DISTINCT ts.date)                                                  AS total_sessions,
               SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)                 AS present,
               SUM(CASE WHEN sa.status = 'ABSENT'  THEN 1 ELSE 0 END)                 AS absent,
               SUM(CASE WHEN sa.status = 'LATE'    THEN 1 ELSE 0 END)                 AS late,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'PRESENT' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1)                               AS attendance_rate,
               MAX(CASE WHEN sa.status = 'ABSENT' THEN ts.date END)                   AS last_absence_date
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id  = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   class_sections      cs  ON ts.class_name = cs.class_name
        JOIN   courses             c   ON cs.course_id  = c.id
        WHERE  sa.student_id = %s
        GROUP BY c.name, ts.class_name
        ORDER BY attendance_rate ASC
    """,

    "get_abnormal_attendance": """
        SELECT u.full_name, u.code,
               ts.class_name, ts.date,
               sa.status, sa.method,
               sa.created_at,
               ats.opened_at,
               EXTRACT(EPOCH FROM (sa.created_at - ats.opened_at))::int AS seconds_after_open
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id = u.id
        WHERE  sa.method = 'QR_CODE'
          AND  sa.created_at < (ats.opened_at + INTERVAL '30 seconds')
        ORDER BY sa.created_at DESC
        LIMIT  100
    """,

    "get_attendance_trends": """
        WITH cls AS (
            SELECT DISTINCT ts.class_name
            FROM timetable_slots ts
            WHERE unaccent(ts.class_name) ILIKE unaccent(%s)
            ORDER BY
                CASE WHEN unaccent(ts.class_name) = unaccent(%s) THEN 0 ELSE 1 END,
                LENGTH(ts.class_name)
            LIMIT 1
        )
        SELECT TO_CHAR(ts.date, 'Day') AS day_of_week,
               EXTRACT(DOW FROM ts.date)::int AS day_num,
               ts.slot_number,
               COUNT(sa.id)                                           AS total_records,
               SUM(CASE WHEN sa.status = 'ABSENT'  THEN 1 ELSE 0 END) AS absent_count,
               SUM(CASE WHEN sa.status = 'LATE'    THEN 1 ELSE 0 END) AS late_count,
               ROUND(100.0 * SUM(CASE WHEN sa.status = 'ABSENT' THEN 1 ELSE 0 END)
                           / NULLIF(COUNT(sa.id), 0), 1)              AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        WHERE  ts.class_name = (SELECT class_name FROM cls)
        GROUP BY day_of_week, day_num, ts.slot_number
        ORDER BY absent_rate DESC
    """,

    # NEW: Danh sách SV vắng nhiều nhất trong một lớp
    "get_most_absent_students": """
        WITH cls AS (
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
               COUNT(CASE WHEN sa.status = 'ABSENT'  THEN 1 END) AS absences,
               COUNT(CASE WHEN sa.status = 'LATE'    THEN 1 END) AS lates,
               COUNT(CASE WHEN sa.status = 'PRESENT' THEN 1 END) AS presents,
               COUNT(sa.id) AS total_sessions,
               ROUND(100.0 * COUNT(CASE WHEN sa.status='ABSENT' THEN 1 END)
                           / NULLIF(COUNT(sa.id), 0), 1) AS absent_rate
        FROM   student_attendances sa
        JOIN   attendance_sessions ats ON sa.session_id = ats.id
        JOIN   timetable_slots     ts  ON ats.timetable_slot_id = ts.id
        JOIN   users               u   ON sa.student_id = u.id
        LEFT JOIN student_profiles sp  ON u.id = sp.user_id
        WHERE  ts.class_name = (SELECT class_name FROM cls)
        GROUP BY u.full_name, u.code, sp.gpa
        HAVING COUNT(CASE WHEN sa.status = 'ABSENT' THEN 1 END) > 0
        ORDER BY absences DESC, absent_rate DESC
        LIMIT  30
    """,

    # ════════════════════════════════════════════════════════════════════════
    # GRADES
    # ════════════════════════════════════════════════════════════════════════

    "get_my_courses": """
        SELECT DISTINCT
               c.name     AS course_name,
               c.code     AS course_code,
               c.credits,
               cs.class_name,
               u_lec.full_name AS lecturer_name,
               sem.name   AS semester,
               sem.code   AS semester_code,
               sem.start_date
        FROM   enrollments       e
        JOIN   class_sections    cs ON e.class_name = cs.class_name
        JOIN   courses           c  ON cs.course_id = c.id
        JOIN   semesters        sem ON cs.semester_id = sem.id
        LEFT JOIN users         u_lec ON cs.lecturer_id = u_lec.id
        WHERE  e.student_id = %s
        ORDER BY sem.start_date DESC, c.name
    """,

    "get_my_grades": """
        SELECT c.name     AS course_name,
               c.code     AS course_code,
               c.credits,
               cs.class_name,
               sem.name   AS semester,
               gc.name    AS component,
               gc.type    AS component_type,
               gc.weight,
               sg.score,
               sg.attempt,
               ROUND(sg.score * gc.weight / 100.0, 2) AS weighted_score
        FROM   student_grades   sg
        JOIN   enrollments       e  ON sg.enrollment_id      = e.id
        JOIN   grade_components  gc ON sg.grade_component_id = gc.id
        JOIN   courses           c  ON gc.course_id          = c.id
        JOIN   class_sections    cs ON e.class_name          = cs.class_name
        JOIN   semesters        sem ON cs.semester_id        = sem.id
        WHERE  e.student_id = %s
        ORDER BY sem.start_date DESC, c.name, gc.weight DESC
    """,

    "get_detail_course_grade": """
        SELECT gc.name AS component, gc.type, gc.weight,
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
        ORDER BY gc.weight DESC
    """,

    "get_grade_report_by_class": """
        SELECT u.full_name, u.code,
               COALESCE(sp.gpa, 0) AS overall_gpa,
               ROUND(SUM(sg.score * gc.weight) / NULLIF(SUM(gc.weight), 0), 2) AS final_score,
               MAX(CASE WHEN gc.type = 'PROGRESS' THEN sg.score END)  AS progress_score,
               MAX(CASE WHEN gc.type = 'MIDTERM'  THEN sg.score END)  AS midterm_score,
               MAX(CASE WHEN gc.type = 'FINAL'    THEN sg.score END)  AS final_exam_score,
               COUNT(DISTINCT sg.grade_component_id) AS components_graded
        FROM   student_grades   sg
        JOIN   enrollments       e  ON sg.enrollment_id      = e.id
        JOIN   grade_components  gc ON sg.grade_component_id = gc.id
        JOIN   users             u  ON e.student_id          = u.id
        JOIN   class_sections    cs ON e.class_name          = cs.class_name
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE  unaccent(cs.class_name) ILIKE unaccent(%s)
        GROUP BY u.full_name, u.code, sp.gpa
        ORDER BY final_score DESC NULLS LAST
    """,

    "get_grade_report_by_course": """
        SELECT
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
            OR unaccent(c.code) ILIKE unaccent(%s)
    """,

    "get_gpa_stats_by_major": """
        SELECT m.name  AS major,
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
        JOIN   users            u  ON sp.user_id  = u.id AND u.status = 'ACTIVE'
        GROUP BY m.name, m.code
        ORDER BY avg_gpa DESC
    """,

    "get_grade_distribution": """
        SELECT CASE
                 WHEN score >= 8.5 THEN 'A (8.5–10)'
                 WHEN score >= 7.0 THEN 'B (7.0–8.4)'
                 WHEN score >= 5.5 THEN 'C (5.5–6.9)'
                 WHEN score >= 4.0 THEN 'D (4.0–5.4)'
                 ELSE 'F (<4.0)'
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
          AND gc.type = 'FINAL'
        GROUP BY grade_tier
        ORDER BY grade_tier
    """,

    "get_class_health_check": """
        WITH cls AS (
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
               (SELECT ROUND(100.0 * SUM(CASE WHEN sa.status='ABSENT' THEN 1 ELSE 0 END)
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
        WHERE  cs.class_name = (SELECT class_name FROM cls)
    """,

    "get_student_ranking_in_class": """
        WITH cls AS (
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
               COUNT(CASE WHEN sa.status='ABSENT' THEN 1 END)       AS absences
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
        LIMIT  50
    """,

    # NEW: Xu hướng điểm số theo thời gian (per session/attempt)
    "get_grade_trend_by_student": """
        SELECT c.name AS course_name, gc.name AS component, gc.type,
               sg.attempt, sg.score,
               sem.name AS semester, sem.start_date
        FROM   student_grades  sg
        JOIN   enrollments      e   ON sg.enrollment_id      = e.id
        JOIN   grade_components gc  ON sg.grade_component_id = gc.id
        JOIN   courses          c   ON gc.course_id          = c.id
        JOIN   class_sections   cs  ON e.class_name          = cs.class_name
        JOIN   semesters       sem  ON cs.semester_id        = sem.id
        WHERE  e.student_id = %s
        ORDER BY sem.start_date ASC, c.name, sg.attempt
    """,

    # ════════════════════════════════════════════════════════════════════════
    # NOTIFICATIONS
    # ════════════════════════════════════════════════════════════════════════

    "get_my_notifications": """
        SELECT n.title, n.content, n.type, n.priority,
               n.sent_at, nr.is_read, nr.read_at
        FROM   notifications n
        JOIN   notification_recipients nr ON n.id = nr.notification_id
        WHERE  nr.recipient_id = %s
        ORDER BY n.sent_at DESC
        LIMIT  20
    """,

    "list_notifications": """
        SELECT n.id, n.title, n.content, n.type, n.priority,
               n.target_type, n.status, n.sent_at,
               u.full_name AS sender,
               (SELECT COUNT(*) FROM notification_recipients nr2 WHERE nr2.notification_id = n.id) AS recipient_count,
               (SELECT COUNT(*) FROM notification_recipients nr3 WHERE nr3.notification_id = n.id AND nr3.is_read = TRUE) AS read_count
        FROM   notifications n
        LEFT JOIN users u ON n.sender_id = u.id
        ORDER BY n.sent_at DESC
        LIMIT  30
    """,

    "count_unread_notifications": """
        SELECT COUNT(*) AS unread_count,
               MAX(n.sent_at) AS latest_notification_at
        FROM   notification_recipients nr
        JOIN   notifications n ON nr.notification_id = n.id
        WHERE  nr.recipient_id = %s AND nr.is_read = FALSE
    """,

    # ════════════════════════════════════════════════════════════════════════
    # MUTATIONS (unchanged logic, kept for completeness)
    # ════════════════════════════════════════════════════════════════════════

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
    "approve_schedule_request": "UPDATE schedule_requests SET status='APPROVED', updated_at=NOW() WHERE id=%s RETURNING id",
    "reject_schedule_request":  "UPDATE schedule_requests SET status='REJECTED', updated_at=NOW() WHERE id=%s RETURNING id",
    "update_attendance_manually": """
        UPDATE student_attendances SET status=%s, updated_at=NOW()
        WHERE  student_id=(SELECT id FROM users WHERE code=%s LIMIT 1)
          AND  session_id=%s
        RETURNING id
    """,
    "activate_user": "UPDATE users SET status='ACTIVE', updated_at=NOW() WHERE code=%s RETURNING id",
    "add_student_to_class": """
        INSERT INTO enrollments (student_id, class_name, created_at, updated_at)
        SELECT u.id, %s, NOW(), NOW() FROM users u WHERE u.code = %s
        ON CONFLICT DO NOTHING RETURNING id
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
        ON CONFLICT DO NOTHING RETURNING specialization_id
    """,
    "assign_course_to_sub_specialization": """
        INSERT INTO sub_specialization_courses (sub_specialization_id, course_id, created_at, updated_at)
        SELECT ss.id, c.id, NOW(), NOW()
        FROM   sub_specializations ss, courses c
        WHERE  (ss.code = %s OR unaccent(ss.name) ILIKE unaccent(%s))
          AND  (c.code  = %s OR unaccent(c.name)  ILIKE unaccent(%s))
        ON CONFLICT DO NOTHING RETURNING sub_specialization_id
    """,
    "delete_major":          "UPDATE majors          SET status='INACTIVE', updated_at=NOW() WHERE code=%s OR unaccent(name) ILIKE unaccent(%s) RETURNING id",
    "delete_course":         "UPDATE courses         SET status='INACTIVE', updated_at=NOW() WHERE code=%s OR unaccent(name) ILIKE unaccent(%s) RETURNING id",
    "delete_room":           "UPDATE rooms           SET status='INACTIVE', updated_at=NOW() WHERE unaccent(name) ILIKE unaccent(%s) RETURNING id",
    "delete_semester":       "UPDATE semesters       SET status='CLOSED',   updated_at=NOW() WHERE code=%s RETURNING id",
    "delete_class":          "DELETE FROM class_sections WHERE class_name=%s RETURNING class_name",
    "delete_specialization": "UPDATE specializations SET status='INACTIVE', updated_at=NOW() WHERE code=%s OR unaccent(name) ILIKE unaccent(%s) RETURNING id",
    "delete_sub_specialization": "DELETE FROM sub_specializations WHERE code=%s OR unaccent(name) ILIKE unaccent(%s) RETURNING id",
    "update_student_info":   "UPDATE student_profiles SET major_id=(SELECT id FROM majors WHERE code=%s OR unaccent(name) ILIKE unaccent(%s) LIMIT 1), updated_at=NOW() WHERE user_id=(SELECT id FROM users WHERE code=%s LIMIT 1) RETURNING user_id",
    "update_lecturer_info":  "UPDATE lecturer_profiles SET expertise=%s, department=%s, updated_at=NOW() WHERE user_id=(SELECT id FROM users WHERE code=%s LIMIT 1) RETURNING user_id",
    "update_room":           "UPDATE rooms      SET capacity=%s, status=%s, updated_at=NOW() WHERE unaccent(name) ILIKE unaccent(%s) RETURNING id",
    "update_semester":       "UPDATE semesters  SET name=%s, start_date=%s, end_date=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id",
    "update_course":         "UPDATE courses    SET name=%s, credits=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id",
    "update_major":          "UPDATE majors     SET name=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id",
    "update_specialization": "UPDATE specializations     SET name=%s, status=%s, updated_at=NOW() WHERE code=%s RETURNING id",
    "update_sub_specialization": "UPDATE sub_specializations SET name=%s, updated_at=NOW() WHERE code=%s RETURNING id",
    "update_class": "UPDATE class_sections SET lecturer_id=(SELECT id FROM users WHERE code=%s LIMIT 1), semester_id=(SELECT id FROM semesters WHERE code=%s LIMIT 1), updated_at=NOW() WHERE class_name=%s RETURNING class_name",
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
        import re as _re
        s = str(raw).strip()
        m = _re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})$", s)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
        m = _re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$", s)
        if m:
            return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
        return s

    def _normalize_major(val: str) -> str:
        if not val:
            return val
        v = str(val).strip()
        # ✅ NEW: Remove "ngành" prefix if present (common in Vietnamese queries)
        if v.lower().startswith("ngành "):
            v = v[6:].strip()  # Remove "ngành " (6 chars including space)
        v_upper = v.upper()
        _map = {
            "CNTT": "Công nghệ thông tin",
            "IT": "Công nghệ thông tin",
            "QTKD": "Quản trị kinh doanh",
            "BA": "Quản trị kinh doanh",
            "NNN": "Ngôn Ngữ Nhật",
            "JS": "Ngôn Ngữ Nhật",
            "NNA": "Ngôn ngữ Anh",
            "ES": "Ngôn ngữ Anh",
            "NNHQ": "Ngôn ngữ Hàn Quốc",
            "KS": "Ngôn ngữ Hàn Quốc",
        }
        return _map.get(v_upper, v)

    def _resolve_date_range(dt_raw: str) -> Tuple[str, str]:
        if not dt_raw or dt_raw == "1970-01-01":
            return "1970-01-01", "2099-12-31"

        dt_lower = dt_raw.lower().replace("_", " ")
        now = datetime.now()

        _WEEK_KW   = ("tuan nay", "tuần này", "this week", "week", "tuần")
        _NXTW_KW   = ("tuan sau", "tuần sau", "next week", "tuần tới")
        _TODAY_KW  = ("hom nay", "hôm nay", "today")
        _TMRW_KW   = ("ngay mai", "ngày mai", "tomorrow")
        _MONTH_KW  = ("thang nay", "tháng này", "this month", "month")

        if any(kw in dt_lower for kw in _NXTW_KW):
            monday = now - timedelta(days=now.weekday()) + timedelta(weeks=1)
            sunday = monday + timedelta(days=6)
            return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")
        elif any(kw in dt_lower for kw in _WEEK_KW):
            monday = now - timedelta(days=now.weekday())
            sunday = monday + timedelta(days=6)
            return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")
        elif any(kw in dt_lower for kw in _TODAY_KW):
            t = now.strftime("%Y-%m-%d")
            return t, t
        elif any(kw in dt_lower for kw in _TMRW_KW):
            t = (now + timedelta(days=1)).strftime("%Y-%m-%d")
            return t, t
        elif any(kw in dt_lower for kw in _MONTH_KW):
            first = now.replace(day=1).strftime("%Y-%m-%d")
            import calendar
            last_day = calendar.monthrange(now.year, now.month)[1]
            last = now.replace(day=last_day).strftime("%Y-%m-%d")
            return first, last
        else:
            normalized = _normalize_date(dt_raw)
            return normalized, normalized

    def like(val: str) -> str:
        s = "" if val is None else str(val)
        return f"%{s}%"

    def _looks_like_code(s: str) -> bool:
        if not s:
            return False
        s2 = s.strip()
        if not s2 or any(ch.isspace() for ch in s2):
            return False
        # allow: SE12345, GV001, PRF192, SP26, etc.
        return s2.replace("-", "").replace("_", "").isalnum()

    def _norm_code(raw: Any) -> str:
        if raw is None:
            return ""
        s = str(raw).strip()
        return s.upper() if _looks_like_code(s) else s

    def _class_match_params(raw: Any) -> tuple[str, str]:
        """Return (pattern, exact_candidate) for class_name matching."""
        s = str(raw or "").strip()
        if not s:
            raise ValueError("Thiếu trường bắt buộc: class_name")
        return like(s), s

    # ── Users ────────────────────────────────────────────────────────────
    if tool_name == "search_user_by_name":
        return tool_name, (like(req("full_name")),)
    elif tool_name == "get_user_by_code":
        val = e.get("code") or e.get("user_code") or e.get("student_code") or e.get("lecturer_code")
        if not val:
            val = req("code")
        return tool_name, (_norm_code(val),)
    elif tool_name in ("view_inactive_users", "count_users_by_role"):
        return tool_name, ()
    elif tool_name == "activate_user":
        return tool_name, (_norm_code(req("code")),)

    # ── Students ─────────────────────────────────────────────────────────
    elif tool_name == "get_student_by_code":
        raw = e.get("student_code") or e.get("code") or e.get("full_name")
        if not raw:
            raise ValueError("Thiếu trường bắt buộc: student_code hoặc full_name")
        val = _norm_code(raw)
        return tool_name, (val, like(raw))
    elif tool_name == "get_students_by_major":
        val = _normalize_major(e.get("major_name", ""))
        return tool_name, (like(val), like(val), val)
    elif tool_name == "count_students_by_major":
        val = _normalize_major(e.get("major_name") or e.get("major_code") or "")
        params = (like(val), like(val), val)
        logger.info(f"[build_params] count_students_by_major: major_name={e.get('major_name')} → normalized={val} → params={params}")
        return tool_name, params
    elif tool_name == "get_students_by_class":
        val = e.get("class_name") or e.get("course_code")
        if not val:
            raise ValueError("Thiếu trường bắt buộc: class_name")
        lec_id = user_id if user_role == "LECTURER" else -1
        return tool_name, (like(val), like(val), like(val), lec_id, lec_id)
    elif tool_name == "get_students_at_risk":
        gpa_threshold = float(e.get("gpa_threshold") or 2.0)
        return tool_name, (gpa_threshold, gpa_threshold)
    elif tool_name in ("get_top_students", "get_students_without_class"):
        return tool_name, ()
    elif tool_name == "get_class_info":
        val = e.get("class_name") or e.get("class") or ""
        if not val:
            raise ValueError("Thiếu trường bắt buộc: class_name")
        return tool_name, (like(val),)
    elif tool_name == "get_enrollments_by_class":
        return tool_name, (like(req("class_name")),)
    elif tool_name == "get_student_academic_timeline":
        return tool_name, (user_id,)
    elif tool_name == "get_student_gpa_comparison":
        val = e.get("student_code") or e.get("code", "")
        return tool_name, (val, like(val))

    # ── Lecturers ────────────────────────────────────────────────────────
    elif tool_name == "get_lecturer_by_code":
        raw = e.get("lecturer_code") or e.get("code") or e.get("full_name")
        if not raw:
            raise ValueError("Thiếu trường bắt buộc: lecturer_code hoặc full_name")
        val = _norm_code(raw)
        return tool_name, (val, like(raw))
    elif tool_name == "get_lecturers_by_major":
        val = _normalize_major(e.get("major_name") or e.get("course_name") or e.get("keyword") or "")
        return tool_name, (like(val), like(val), like(val), like(val), val)
    elif tool_name == "get_lecturers_by_expertise":
        val = e.get("expertise") or e.get("course_name") or e.get("keyword") or ""
        return "get_lecturers_by_major", (like(val), like(val), like(val), like(val), "NOT_EMPTY_FLAG")
    elif tool_name == "list_lecturers":
        return "get_lecturers_by_major", ("%", "%", "%", "%", "")
    elif tool_name == "get_lecturer_workload":
        val = e.get("full_name") or e.get("lecturer_code") or ""
        code = e.get("lecturer_code") or e.get("code") or ""
        return tool_name, (like(val), code, val)

    # ── Rooms ────────────────────────────────────────────────────────────
    elif tool_name == "get_empty_rooms":
        dt = e.get("date") or datetime.now().strftime("%Y-%m-%d")
        slot = e.get("slot_number") or e.get("slot") or 1
        try:
            slot = int(slot)
        except (ValueError, TypeError):
            slot = 1
        return tool_name, (_normalize_date(dt), _normalize_date(dt), slot)
    elif tool_name == "count_rooms_by_status":
        return tool_name, ()
    elif tool_name == "get_room_info":
        return tool_name, (like(req("room_name", "tên phòng")),)
    elif tool_name == "create_room":
        return tool_name, (req("name", "tên phòng"), e.get("capacity", 30))
    elif tool_name == "get_room_usage_weekly":
        start_dt, end_dt = _resolve_date_range(e.get("date") or "tuần này")
        return tool_name, (like(req("room_name")), start_dt, end_dt)

    # ── Majors ───────────────────────────────────────────────────────────
    elif tool_name == "list_majors":
        return tool_name, ()
    elif tool_name == "create_major":
        return tool_name, (_norm_code(req("code", "mã ngành")), req("name", "tên ngành"))

    # ── Specializations ──────────────────────────────────────────────────
    elif tool_name == "get_specializations_by_major":
        val = _normalize_major(e.get("major_name", ""))
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
        return tool_name, (_norm_code(req("code")), req("name"), e.get("credits") or 3)

    # ── Semesters ────────────────────────────────────────────────────────
    elif tool_name in ("list_semesters", "get_active_semester"):
        return tool_name, ()
    elif tool_name == "get_semester_overview":
        val = e.get("semester_code") or e.get("semester_name") or ""
        return tool_name, (like(val), like(val), val)
    elif tool_name == "create_semester":
        return tool_name, (_norm_code(req("code", "mã HK")), req("name", "tên HK"), e.get("start_date", ""), e.get("end_date", ""))

    # ── Classes ──────────────────────────────────────────────────────────
    elif tool_name == "get_classes_by_semester":
        import re as _re
        raw_val = (e.get("semester_code") or e.get("semester_name") or e.get("semester") or "").strip()
        season_match = _re.search(r'(spring|fall|summer|winter|xuân|thu|hè|đông)', raw_val, _re.I)
        year_match   = _re.search(r'20(\d{2})', raw_val)
        short_year   = year_match.group(1) if year_match else ""
        season       = season_match.group(1).capitalize() if season_match else ""
        if season and short_year:
            fuzzy = f"%{season}%{short_year}%"
        elif raw_val:
            fuzzy = like(raw_val)
        else:
            fuzzy = "%"
        lec_id = user_id if user_role == "LECTURER" else -1
        return tool_name, (fuzzy, fuzzy, fuzzy, fuzzy, lec_id, lec_id)
    elif tool_name == "create_class":
        return tool_name, (
            req("class_name"),
            _norm_code(req("course_code")),
            _norm_code(req("lecturer_code")),
            _norm_code(req("semester_code")),
        )

    # ── Schedule ─────────────────────────────────────────────────────────
    elif tool_name == "get_own_schedule":
        dt_raw = e.get("date") or ""
        cls    = e.get("class_name") or ""
        # ✅ FIX: normalize_entities may have converted THIS_WEEK→start_date/end_date
        if e.get("start_date") and e.get("end_date"):
            start_dt, end_dt = e["start_date"], e["end_date"]
        else:
            start_dt, end_dt = _resolve_date_range(dt_raw)
        if (not dt_raw and not e.get("start_date")) or dt_raw == "1970-01-01":
            if not cls:
                return "get_my_schedule", (user_id, user_id)
        return "get_my_schedule_targeted", (user_id, user_id, start_dt, end_dt, like(cls), cls)
    elif tool_name == "get_own_grades":
        return "get_my_courses", (user_id,)
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
            logger.info("[build_params] Safety Net: fallback get_class_schedule -> get_own_schedule")
            return build_params("get_own_schedule", e, user_id, user_role)
        # ✅ FIX: Use start_date/end_date from normalize_entities first
        if e.get("start_date") and e.get("end_date"):
            start_dt, end_dt = e["start_date"], e["end_date"]
        else:
            start_dt, end_dt = _resolve_date_range(e.get("date") or "")
        return tool_name, (req("class_name"), start_dt, end_dt)
    elif tool_name == "get_other_lecturer_schedule":
        val = e.get("full_name") or e.get("code") or e.get("lecturer_code", "")
        # ✅ FIX: normalize_entities converts THIS_WEEK→start_date/end_date and DELETES date
        # So check start_date/end_date first, only fallback to _resolve_date_range(date)
        if e.get("start_date") and e.get("end_date"):
            start_dt, end_dt = e["start_date"], e["end_date"]
        else:
            start_dt, end_dt = _resolve_date_range(e.get("date") or "")
        return "get_lecturer_schedule_by_search", (like(val), val, start_dt, end_dt)
    elif tool_name == "get_other_student_schedule":
        val = e.get("full_name") or e.get("code") or e.get("student_code", "")
        # ✅ FIX: Same as above — use start_date/end_date from normalize_entities
        if e.get("start_date") and e.get("end_date"):
            start_dt, end_dt = e["start_date"], e["end_date"]
        else:
            start_dt, end_dt = _resolve_date_range(e.get("date") or "")
        return "get_student_schedule_by_search", (like(val), val, start_dt, end_dt)

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
        cls = e.get("class_name") or e.get("class") or e.get("class_code")
        if not cls:
            raise ValueError("Thiếu trường bắt buộc: class_name")
        date_raw = e.get("date") or datetime.now().strftime("%Y-%m-%d")
        return tool_name, (like(cls), _normalize_date(date_raw))
    elif tool_name == "get_attendance_stats_by_class":
        return tool_name, (like(req("class_name")),)
    elif tool_name == "get_attendance_trends":
        return tool_name, _class_match_params(e.get("class_name"))
    elif tool_name == "get_grade_distribution":
        return tool_name, _class_match_params(e.get("class_name"))
    elif tool_name == "get_class_health_check":
        return tool_name, _class_match_params(e.get("class_name"))
    elif tool_name == "get_student_ranking_in_class":
        return tool_name, _class_match_params(e.get("class_name"))
    elif tool_name == "get_most_absent_students":
        return tool_name, _class_match_params(req("class_name"))
    elif tool_name == "get_abnormal_attendance":
        return tool_name, ()
    elif tool_name == "update_attendance_manually":
        return tool_name, (
            req("status", "trạng thái (PRESENT/ABSENT/LATE)"),
            _norm_code(req("student_code", "mã SV")),
            req("session_id"),
        )

    # ── Grades ───────────────────────────────────────────────────────────
    elif tool_name == "get_detail_course_grade":
        val = e.get("course_name") or e.get("course_code", "")
        return tool_name, (user_id, like(val), like(val))
    elif tool_name == "get_grade_report_by_class":
        return tool_name, (like(req("class_name")),)
    elif tool_name == "get_gpa_stats_by_major":
        return tool_name, ()
    elif tool_name == "get_grade_trend_by_student":
        return tool_name, (user_id,)

    # ── Mutations: delete ────────────────────────────────────────────────
    elif tool_name in ("delete_major", "delete_course", "delete_specialization", "delete_sub_specialization"):
        val = e.get("code") or e.get("name", "")
        return tool_name, (val, like(val))
    elif tool_name == "delete_room":
        return tool_name, (like(e.get("room_name") or e.get("name", "")),)
    elif tool_name == "delete_semester":
        return tool_name, (_norm_code(e.get("semester_code") or e.get("code", "")),)
    elif tool_name == "delete_class":
        return tool_name, (req("class_name"),)

    # ── Mutations: update ────────────────────────────────────────────────
    elif tool_name == "update_student_info":
        return tool_name, (_norm_code(e.get("major_code") or e.get("major_name", "")), like(e.get("major_name", "")), _norm_code(req("student_code")))
    elif tool_name == "update_lecturer_info":
        return tool_name, (req("expertise"), req("department"), _norm_code(req("lecturer_code")))
    elif tool_name == "update_room":
        return tool_name, (e.get("capacity", 30), e.get("status", "ACTIVE"), like(req("room_name")))
    elif tool_name == "update_semester":
        return tool_name, (req("name"), req("start_date"), req("end_date"), e.get("status", "UPCOMING"), _norm_code(req("semester_code")))
    elif tool_name == "update_course":
        return tool_name, (req("name"), e.get("credits", 3), e.get("status", "ACTIVE"), _norm_code(req("course_code")))
    elif tool_name == "update_major":
        return tool_name, (req("name"), e.get("status", "ACTIVE"), _norm_code(req("code")))
    elif tool_name == "update_specialization":
        return tool_name, (req("name"), e.get("status", "ACTIVE"), _norm_code(req("code")))
    elif tool_name == "update_sub_specialization":
        return tool_name, (req("name"), _norm_code(req("code")))
    elif tool_name == "update_class":
        return tool_name, (_norm_code(req("lecturer_code")), _norm_code(req("semester_code")), req("class_name"))

    # ── Assignments ──────────────────────────────────────────────────────
    elif tool_name == "assign_course_to_specialization":
        return tool_name, (
            e.get("semester", 1),
            e.get("specialization_code") or e.get("specialization_name", ""),
            like(e.get("specialization_name", "")),
            e.get("course_code") or e.get("course_name", ""),
            like(e.get("course_name", "")),
        )
    elif tool_name == "assign_course_to_sub_specialization":
        return tool_name, (
            e.get("sub_specialization_code") or e.get("sub_specialization_name", ""),
            like(e.get("sub_specialization_name", "")),
            e.get("course_code") or e.get("course_name", ""),
            like(e.get("course_name", "")),
        )

    # ── Specialization create ────────────────────────────────────────────
    elif tool_name == "create_specialization":
        return tool_name, (req("major_code"), req("spec_code"), req("spec_name"))
    elif tool_name == "create_sub_specialization":
        return tool_name, (req("sub_code"), req("sub_name"), req("spec_code"))

    # ── Schedule Requests mutations ─────────────────────────────────────
    elif tool_name == "create_schedule_request":
        return tool_name, (
            user_id,
            req("original_slot_id"),
            req("requested_slot_id"),
            e.get("reason", "")
        )

    # ── Notifications ────────────────────────────────────────────────────
    elif tool_name == "list_notifications":
        return tool_name, ()

    # ── Semester overview ────────────────────────────────────────────────
    elif tool_name == "get_semester_overview":
        val = e.get("semester_code") or e.get("semester_name") or ""
        return tool_name, (like(val), like(val), val)

    # ── Excel queries (adhoc SQL) ────────────────────────────────────────
    elif tool_name == "excel_query":
        # excel_query uses dynamic SQL from intent_data, not standard template
        # Return special marker that executor recognizes
        return "dynamic_sql", ()

    else:
        raise ValueError(f"Không có param builder cho tool: '{tool_name}'")