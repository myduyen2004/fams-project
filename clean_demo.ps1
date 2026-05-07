# Script to clean demo data and execute custom SQL queries
# Usage: .\clean_demo.ps1

$containerName = "fams-postgres"
$dbName = "fams_db"
$dbUser = "postgres"

# Define your SQL queries here
$sqlQuery = @"
-- 1. Set all lecturers' majors and specializations to NULL
UPDATE lecturer_profiles 
SET major_id = NULL, 
    specialization_id = NULL;

-- 2. Xóa điểm thành phần môn MAD101 của lớp SE18C01 trong kỳ SP26
DELETE FROM student_grades 
WHERE enrollment_id IN (
    SELECT e.id 
    FROM enrollments e 
    JOIN class_sections cs ON e.class_name = cs.class_name
    JOIN courses c ON cs.course_id = c.id
    JOIN semesters s ON cs.semester_id = s.id
    WHERE c.code = 'MAD101' 
      AND cs.class_name = 'SE18C01' 
      AND (s.code = 'SP26' OR s.name = 'SPRING 2026')
);

-- 3. Xóa điểm thi của môn MAD101 trong kỳ SP26 (tất cả các lớp)
DELETE FROM student_grades 
WHERE grade_component_id IN (
    SELECT gc.id 
    FROM grade_components gc
    JOIN courses c ON gc.course_id = c.id
    WHERE c.code = 'MAD101' AND gc.type IN ('FINAL_EXAM', 'PRACTICAL_EXAM', 'RESIT')
)
AND enrollment_id IN (
    SELECT e.id 
    FROM enrollments e 
    JOIN class_sections cs ON e.class_name = cs.class_name
    JOIN semesters s ON cs.semester_id = s.id
    WHERE (s.code = 'SP26' OR s.name = 'SPRING 2026')
);

-- 4. Xóa đoạn chat của lớp SE18C01
-- Xóa reactions và read receipts trước do ràng buộc khóa ngoại
DELETE FROM chat_message_reactions 
WHERE message_id IN (
    SELECT id FROM chat_messages 
    WHERE chat_group_id IN (SELECT id FROM chat_groups WHERE class_name = 'SE18C01')
);

DELETE FROM chat_message_reads 
WHERE message_id IN (
    SELECT id FROM chat_messages 
    WHERE chat_group_id IN (SELECT id FROM chat_groups WHERE class_name = 'SE18C01')
);

DELETE FROM chat_messages 
WHERE chat_group_id IN (
    SELECT id FROM chat_groups 
    WHERE class_name = 'SE18C01'
);
"@

Write-Host "--- Starting Demo Data Cleanup ---" -ForegroundColor Cyan

# Check if docker is running and container exists
$containerStatus = docker ps -q -f name=$containerName
if (-not $containerStatus) {
    Write-Error "Docker container '$containerName' is not running. Please start your docker environment first."
    exit
}

Write-Host "Executing SQL in container '$containerName'..." -ForegroundColor Yellow

try {
    # Execute the query string directly via docker exec
    $sqlQuery | docker exec -i $containerName psql -U $dbUser -d $dbName
    
    Write-Host "`n--- Cleanup Completed Successfully! ---" -ForegroundColor Green
    Write-Host "Lecturer profiles have been reset." -ForegroundColor Gray
}
catch {
    Write-Error "Failed to execute SQL: $_"
}
