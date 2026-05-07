# Script to sync courses from Insert_course.md to Docker Database with Dynamic ID Mapping
# Usage: .\sync_courses.ps1

$mdFile = "Insert_course.md"
$tempSql = "temp_insert_courses.sql"
$containerName = "fams-postgres"
$dbName = "fams_db"
$dbUser = "postgres"

Write-Host "--- Starting Smart Course Sync ---" -ForegroundColor Cyan

if (-not (Test-Path $mdFile)) {
    Write-Error "File $mdFile not found!"
    exit
}

# 1. Fetch current mapping from Database
Write-Host "1. Fetching specialization mapping from database..." -ForegroundColor Yellow
$mappingRaw = docker exec -i $containerName psql -U $dbUser -d $dbName -t -c "SELECT code, id FROM specializations;"
$specMapping = @{}
foreach ($line in ($mappingRaw -split "`n")) {
    if ($line.Trim() -and $line -match "\|") {
        $parts = $line -split "\|"
        $code = $parts[0].Trim()
        $id = $parts[1].Trim()
        if ($code -and $id) {
            $specMapping[$code] = $id
        }
    }
}

if ($specMapping.Count -eq 0) {
    Write-Error "Could not fetch specialization mapping from DB. Check if container is running."
    exit
}

Write-Host "   Found $($specMapping.Count) specializations in DB." -ForegroundColor Gray

# 2. Extract and Clean SQL with Dynamic Mapping
Write-Host "2. Extracting and mapping SQL from $mdFile..." -ForegroundColor Yellow
$content = Get-Content -Raw $mdFile -Encoding utf8

# Thorough cleaning of weird characters (including NBSP and others)
$content = $content.Replace([char]0xA0, " ") # NBSP
$content = $content.Replace("&nbsp;", " ")
$content = $content -replace '\\_', '_'
$content = $content -replace '\*\*', ''

$lines = $content -split "`r?`n"
$sqlLines = @("TRUNCATE TABLE specialization_courses CASCADE;")
$currentSpecId = $null

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if (-not $trimmed) { continue }

    # Detect specialization code in headers/comments
    $foundCode = $null
    foreach ($code in $specMapping.Keys) {
        if ($trimmed -like "*$code*") {
            $foundCode = $code
            break
        }
    }

    if ($foundCode) {
        $currentSpecId = $specMapping[$foundCode]
        $sqlLines += "-- Mapping found for $foundCode -> ID $currentSpecId"
    }

    # Replace ID in SELECT DISTINCT line
    if ($currentSpecId -and $trimmed -match "SELECT DISTINCT") {
        $line = $line -replace 'SELECT DISTINCT \d+', "SELECT DISTINCT $currentSpecId"
    }

    # Filter for SQL-like lines
    if ($trimmed -match 'INSERT|SELECT|FROM|WHERE|ON CONFLICT|\(|\)|''|--') {
        # Final safety: remove any remaining non-standard spaces that cause '?' error
        $line = $line -replace '[^\x00-\x7F]', ' ' 
        $sqlLines += $line
    }
}

$sqlLines | Out-File -FilePath $tempSql -Encoding ascii # Use ASCII to ensure no BOM issues in PSQL

Write-Host "3. Executing SQL in Docker container '$containerName'..." -ForegroundColor Yellow
try {
    $output = Get-Content -Raw $tempSql | docker exec -i $containerName psql -U $dbUser -d $dbName 2>&1
    Write-Host $output
    Write-Host "--- Sync Completed Successfully! ---" -ForegroundColor Green
}
catch {
    Write-Error "Failed to execute SQL in Docker: $_"
}
finally {
    if (Test-Path $tempSql) {
        Remove-Item $tempSql
    }
}
