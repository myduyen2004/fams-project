import random
from datetime import datetime

def generate_sql():
    sql_lines = []
    
    sql_lines.append("-- Script sinh dữ liệu điểm danh mẫu dựa trên Enrollments và Timetable có sẵn")
    sql_lines.append("BEGIN;")
    
    # 1. Tạo Attendance Sessions cho các Timetable Slots trong quá khứ chưa có Session
    sql_lines.append("-- 1. Tạo Session cho các slot thời khóa biểu đã qua (nếu chưa có)")
    sql_lines.append("""
INSERT INTO attendance_sessions (timetable_slot_id, lecturer_id, opened_at, closed_at, status, created_at)
SELECT 
    ts.id, 
    cs.lecturer_id, 
    (ts.date + st.start_time)::timestamp, 
    (ts.date + st.end_time)::timestamp,
    'CLOSED',
    NOW()
FROM timetable_slots ts
JOIN class_sections cs ON ts.class_name = cs.class_name
JOIN slot_types st ON ts.slot_type_id = st.id
WHERE NOT EXISTS (SELECT 1 FROM attendance_sessions WHERE timetable_slot_id = ts.id)
  AND ts.date <= CURRENT_DATE -- Chỉ tạo cho các buổi đã hoặc đang diễn ra
  AND cs.lecturer_id IS NOT NULL;
""")

    # 2. Chèn dữ liệu điểm danh cho sinh viên dựa trên Enrollment của lớp đó
    sql_lines.append("-- 2. Điểm danh sinh viên dựa trên danh sách lớp (Enrollments)")
    sql_lines.append("""
INSERT INTO student_attendances (
    session_id, 
    student_id, 
    status, 
    method, 
    check_in_time, 
    created_at, 
    updated_at
)
SELECT 
    ats.id, 
    e.student_id, 
    CASE 
        WHEN (random() > 0.08) THEN 'PRESENT' 
        ELSE 'ABSENT' 
    END AS status,
    'MANUAL',
    CASE 
        WHEN (random() > 0.08) THEN ats.opened_at + (random() * interval '10 minutes') 
        ELSE NULL 
    END AS check_in_time,
    NOW(),
    NOW()
FROM attendance_sessions ats
JOIN timetable_slots ts ON ats.timetable_slot_id = ts.id
JOIN enrollments e ON ts.class_name = e.class_name
WHERE NOT EXISTS (
    SELECT 1 FROM student_attendances sa 
    WHERE sa.session_id = ats.id 
    AND sa.student_id = e.student_id
);
""")

    sql_lines.append("COMMIT;")
    
    filename = "insert_real_attendance.sql"
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))
    print(f"Success! Generated '{filename}' based on existing enrollments and timetable data.")

if __name__ == "__main__":
    generate_sql()
