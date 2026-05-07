-- Script xóa sạch điểm và reset trạng thái cho học kỳ SPRING 2026
BEGIN;

-- 1. Xóa tất cả điểm của các sinh viên trong kỳ SPRING 2026
DELETE FROM student_grades 
WHERE enrollment_id IN (
    SELECT e.id 
    FROM enrollments e 
    JOIN class_sections cs ON e.class_name = cs.class_name
    JOIN semesters s ON cs.semester_id = s.id
    WHERE s.code = 'SP26' OR s.name ILIKE '%SPRING 2026%'
);

-- 2. Reset trạng thái nộp/công bố điểm của tất cả các lớp thuộc kỳ SPRING 2026
UPDATE class_sections 
SET grades_submitted = false,
    grades_submitted_at = NULL,
    grades_submitted_by = NULL,
    grades_published = false,
    grades_published_at = NULL,
    grades_published_by = NULL,
    resit_grades_published = false,
    resit_grades_published_at = NULL,
    resit_grades_published_by = NULL
WHERE semester_id IN (
    SELECT id FROM semesters WHERE code = 'SP26' OR name ILIKE '%SPRING 2026%'
);

COMMIT;
