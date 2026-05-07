-- Script cập nhật điểm cao (8.0 - 9.0) cho sinh viên SE007461 (Loại bỏ Resit)
BEGIN;

-- 1. Xóa tất cả điểm cũ của sinh viên SE007461
DELETE FROM student_grades 
WHERE enrollment_id IN (
    SELECT id FROM enrollments WHERE student_code = 'SE007461'
);

-- 2. Chèn điểm mới cho các môn (CHỈ lấy điểm chính, BỎ Resit)
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
        WHEN gc.type = 'PARTICIPATION' THEN 10.0
        ELSE ROUND((random() * 1.0 + 8.0)::numeric, 1)
    END as score,
    1 as attempt,
    NOW() as graded_at,
    cs.lecturer_id as graded_by_id,
    NOW() as created_at,
    NOW() as updated_at
FROM enrollments e
JOIN class_sections cs ON e.class_name = cs.class_name
JOIN grade_components gc ON cs.course_id = gc.course_id
WHERE e.student_code = 'SE007461'
AND gc.is_resit = false 
AND gc.type != 'RESIT';

-- 3. Đảm bảo các lớp học này đều đã công bố điểm
UPDATE class_sections cs
SET grades_submitted = true,
    grades_submitted_at = NOW(),
    grades_submitted_by = cs.lecturer_id,
    grades_published = true,
    grades_published_at = NOW(),
    grades_published_by = cs.lecturer_id,
    resit_grades_published = false -- Tắt hiển thị điểm thi lại vì không có
FROM enrollments e
WHERE e.class_name = cs.class_name
AND e.student_code = 'SE007461';

COMMIT;
