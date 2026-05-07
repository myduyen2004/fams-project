import random
from datetime import datetime

def generate_sql():
    sql_lines = []
    
    sql_lines.append("-- Script sinh dữ liệu điểm số mẫu cho tất cả sinh viên dựa trên Enrollments và Grade Components")
    sql_lines.append("BEGIN;")
    
    # Xóa dữ liệu cũ
    sql_lines.append("-- 0. Xóa tất cả điểm hiện có và reset trạng thái của lớp học")
    sql_lines.append("""
-- Xóa tất cả điểm cũ
DELETE FROM student_grades;

-- Reset trạng thái nộp điểm của các lớp học
UPDATE class_sections 
SET grades_submitted = false,
    grades_submitted_at = NULL,
    grades_submitted_by = NULL,
    grades_published = false,
    grades_published_at = NULL,
    grades_published_by = NULL,
    resit_grades_published = false,
    resit_grades_published_at = NULL,
    resit_grades_published_by = NULL;
""")
    
    # Chèn dữ liệu điểm cho các thành phần điểm CHÍNH
    sql_lines.append("-- 1. Tạo điểm ngẫu nhiên cho các thành phần điểm chính (không phải thi lại)")
    sql_lines.append("""
INSERT INTO student_grades (
    enrollment_id, 
    grade_component_id, 
    score, 
    attempt, 
    graded_at, 
    graded_by_id,
    created_at, 
    updated_at
)
SELECT 
    e.id, 
    gc.id, 
    CASE 
        -- 1. Chuyên cần (Participation): Thường là 10.0 (95%) hoặc 0.0 (5%)
        WHEN gc.type = 'PARTICIPATION' THEN 
            CASE WHEN (random() > 0.05) THEN 10.0 ELSE 0.0 END
            
        -- 2. Quiz, Assignment, Progress Test, Workshop, Presentation: Điểm thường khá tốt (6-10)
        WHEN gc.type IN ('QUIZ', 'ASSIGNMENT', 'PROGRESS_TEST', 'WORKSHOP', 'PRESENTATION', 'PROJECT') THEN 
            CASE 
                WHEN (random() > 0.1) THEN ROUND((random() * 4 + 6)::numeric, 1) -- 6.0 đến 10.0
                ELSE ROUND((random() * 5.9)::numeric, 1) -- 0.0 đến 5.9
            END
            
        -- 3. Thi cuối kỳ / Thực hành / Giữa kỳ: Khắt khe hơn, tỉ lệ trượt cao hơn
        WHEN gc.type IN ('FINAL_EXAM', 'PRACTICAL_EXAM', 'MID_TERM') THEN 
            CASE 
                WHEN (random() > 0.2) THEN ROUND((random() * 6 + 4)::numeric, 1) -- 4.0 đến 10.0
                ELSE ROUND((random() * 3.9)::numeric, 1) -- 0.0 đến 3.9
            END
            
        -- Mặc định
        ELSE 
            CASE 
                WHEN (random() > 0.2) THEN ROUND((random() * 5 + 5)::numeric, 1)
                ELSE ROUND((random() * 4.9)::numeric, 1)
            END
    END AS score,
    1 AS attempt,
    NOW() - (random() * interval '30 days') AS graded_at,
    cs.lecturer_id AS graded_by_id,
    NOW(),
    NOW()
FROM enrollments e
JOIN class_sections cs ON e.class_name = cs.class_name
JOIN grade_components gc ON cs.course_id = gc.course_id
WHERE cs.lecturer_id IS NOT NULL
  AND cs.grades_submitted = false
  AND gc.is_resit = false AND gc.type != 'RESIT'
  AND NOT EXISTS (
    SELECT 1 FROM student_grades sg 
    WHERE sg.enrollment_id = e.id 
    AND sg.grade_component_id = gc.id
);
""")

    # Chèn dữ liệu điểm cho các thành phần điểm THI LẠI (Chỉ sinh nếu điểm thi chính < 4.0)
    sql_lines.append("-- 2. Tạo điểm thi lại (chỉ dành cho sinh viên có điểm thi chính < 4.0)")
    sql_lines.append("""
INSERT INTO student_grades (
    enrollment_id, 
    grade_component_id, 
    score, 
    attempt, 
    graded_at, 
    graded_by_id,
    created_at, 
    updated_at
)
SELECT 
    e.id, 
    gc.id, 
    -- Điểm thi lại thường là điểm để vừa đủ qua môn (5-8)
    CASE 
        WHEN (random() > 0.2) THEN ROUND((random() * 3 + 5)::numeric, 1) -- 5.0 đến 8.0
        ELSE ROUND((random() * 4.9)::numeric, 1) -- 0.0 đến 4.9
    END AS score,
    1 AS attempt,
    NOW() - (random() * interval '10 days') AS graded_at,
    cs.lecturer_id AS graded_by_id,
    NOW(),
    NOW()
FROM enrollments e
JOIN class_sections cs ON e.class_name = cs.class_name
JOIN grade_components gc ON cs.course_id = gc.course_id
-- Join với bảng student_grades để lấy điểm của component chính tương ứng
JOIN student_grades sg_main ON e.id = sg_main.enrollment_id AND gc.reference_component_id = sg_main.grade_component_id
WHERE cs.lecturer_id IS NOT NULL
  AND cs.grades_submitted = false
  AND (gc.is_resit = true OR gc.type = 'RESIT')
  AND (
      sg_main.score < 4.0 -- 1. Fail điểm thi chính (FE < 4.0)
      OR ( -- 2. Tổng điểm trung bình các cột chính < 5.0
          SELECT SUM(sg_avg.score * gc_avg.weight / 100.0)
          FROM student_grades sg_avg
          JOIN grade_components gc_avg ON sg_avg.grade_component_id = gc_avg.id
          WHERE sg_avg.enrollment_id = e.id
          AND gc_avg.is_resit = false
      ) < 5.0
      OR EXISTS ( -- 3. Có bất kỳ loại điểm nào có tổng bằng 0 (liệt)
          SELECT 1 
          FROM student_grades sg_sub
          JOIN grade_components gc_sub ON sg_sub.grade_component_id = gc_sub.id
          WHERE sg_sub.enrollment_id = e.id
          GROUP BY gc_sub.type
          HAVING SUM(sg_sub.score) = 0
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM student_grades sg 
    WHERE sg.enrollment_id = e.id 
    AND sg.grade_component_id = gc.id
);
""")

    sql_lines.append("-- 2. Cập nhật trạng thái đã nộp điểm cho các lớp đã có điểm")
    sql_lines.append("""
UPDATE class_sections cs
SET grades_submitted = true,
    grades_submitted_at = NOW(),
    grades_submitted_by = cs.lecturer_id,
    grades_published = true,
    grades_published_at = NOW(),
    grades_published_by = cs.lecturer_id,
    resit_grades_published = true,
    resit_grades_published_at = NOW(),
    resit_grades_published_by = cs.lecturer_id
WHERE EXISTS (
    SELECT 1 FROM enrollments e
    JOIN student_grades sg ON e.id = sg.enrollment_id
    WHERE e.class_name = cs.class_name
) AND (grades_submitted = false OR grades_published = false OR resit_grades_published = false);
""")

    sql_lines.append("COMMIT;")
    
    filename = "insert_real_grades.sql"
    with open(filename, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))
    print(f"Success! Generated '{filename}' based on existing enrollments and grade components.")

if __name__ == "__main__":
    generate_sql()
