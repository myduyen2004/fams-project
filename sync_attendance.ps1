# FAMS - Attendance Data Sync Script
# PowerShell script to generate and import real attendance data

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   FAMS ATTENDANCE DATA GENERATOR & SYNC" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Chạy script Python để sinh file SQL dựa trên Enrollments và Timetable thực tế
Write-Host "[1/2] Running Python script to generate SQL..." -ForegroundColor Yellow
python backend/scripts/generate_attendance_data.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Python script failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Kiểm tra file SQL đã được tạo chưa
$SqlFile = "insert_real_attendance.sql"
if (-Not (Test-Path $SqlFile)) {
    Write-Host "Error: $SqlFile not found!" -ForegroundColor Red
    exit 1
}

# 3. Import vào Database
Write-Host "[2/2] Importing SQL into database..." -ForegroundColor Yellow

$DB_NAME = "fams_db"
$DB_USER = "postgres"
$DB_PASS = "postgres123"
$CONTAINER_NAME = "fams-postgres"

# THỨ TỰ ƯU TIÊN:
# 1. Kiểm tra nếu có Docker và container đang chạy
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $containerStatus = docker inspect -f '{{.State.Running}}' $CONTAINER_NAME 2>$null
    if ($containerStatus -eq "true") {
        Write-Host "Detected Docker container '$CONTAINER_NAME'. Importing via Docker..." -ForegroundColor Green
        Get-Content $SqlFile | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "----------------------------------------------" -ForegroundColor Green
            Write-Host "SUCCESS: Data imported via Docker!" -ForegroundColor Green
            Write-Host "----------------------------------------------" -ForegroundColor Green
            exit 0
        }
    }
}

# 2. Nếu không có Docker, kiểm tra psql trên máy host
if (Get-Command psql -ErrorAction SilentlyContinue) {
    $env:PGPASSWORD = $DB_PASS
    psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME -f $SqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "----------------------------------------------" -ForegroundColor Green
        Write-Host "SUCCESS: Data imported via Local PSQL!" -ForegroundColor Green
        Write-Host "----------------------------------------------" -ForegroundColor Green
    }
    $env:PGPASSWORD = $null
} else {
    Write-Host "----------------------------------------------------------------" -ForegroundColor Magenta
    Write-Host "Warning: Neither 'psql' nor Docker container '$CONTAINER_NAME' found." -ForegroundColor Magenta
    Write-Host "Please import '$SqlFile' manually using DBeaver or pgAdmin." -ForegroundColor Magenta
    Write-Host "----------------------------------------------------------------" -ForegroundColor Magenta
}
