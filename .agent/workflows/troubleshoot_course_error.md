---
description: Guide to troubleshoot and resolve the 500 error when adding courses (Docker environment)
---

# Troubleshooting 500 Error - Course Assignment

This workflow outlines the steps to resolve the HTTP 500 Internal Server Error occurring when adding courses to a specialization. The error is likely caused by a mismatch between the database schema (missing `semester` column) and the updated backend code.

## 1. Force Rebuild Docker Containers
To ensure the backend runs the latest code and Hibernate updates the database schema:

```powershell
docker-compose up --build -d backend frontend
```
// turbo

## 2. Monitor Startup Logs
Check the logs immediately after restart to confirm the database schema update (`alter table ... add column semester`):

```powershell
docker logs -f fams-backend
```

## 3. Verify Fix
1. Open the FAMS website.
2. Navigate to "Quản lý Chuyên ngành".
3. Try adding a course with a selected semester.

## 4. If Error Persists
If the error continues, fetch the latest error stack trace for analysis:

```powershell
docker logs --tail 200 fams-backend
```
