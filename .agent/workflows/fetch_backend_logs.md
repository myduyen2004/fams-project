---
description: Retrieve the last 200 lines of logs from the backend Docker container
---

# Fetch Backend Logs

This workflow retrieves the recent logs from the `fams-backend` container to analyze runtime errors.

## 1. Fetch Logs
Execute the following command to get the last 200 lines of logs:

```powershell
docker logs --tail 1000 fams-backend
```
// turbo
