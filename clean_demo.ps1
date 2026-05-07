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

-- You can add more cleanup queries below
-- Example: DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
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
