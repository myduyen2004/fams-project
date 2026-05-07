# FAMS Unit Testing Strategy

To ensure a robust system, the following modules in your FAMS project require comprehensive Unit Testing.

## 1. Authentication Module (`AuthService`)
*   **Login**: Validate inputs, user existence, password matching, and account status (Active/Locked/Inactive).
*   **Logout**: Invalidate active sessions and update logs.
*   **JWT Utility**: Verify token generation, extraction, and validation.

## 2. Dashboard Module (`DashboardService`)
*   **Statistics**: Verify the calculation of total users, alerts, and system logs.
*   **Recent Access**: Check if the list correctly returns the latest N records.

## 3. Map & GeoLocation Module (`MapService`)
*   **IP Extraction**: Test logic for extracting IP from various headers (X-Forwarded-For, etc.).
*   **Location Mapping**: Verify that online users are correctly grouped by province/coordinates.
*   **Distance/Circle Radius**: (Boundary) Test calculations for map circle radius based on user count.

## 4. Notifications & Alerts Module
*   **Filtering**: Test logic for retrieving read/unread notifications.
*   **Alert Escalation**: Logic for setting alert levels (INFO, WARNING, ERROR).

## 5. Security & Exceptions (`GlobalExceptionHandler`)
*   **Validation Errors**: Ensure field-specific messages (like "Username rỗng") are returned.
*   **Access Denied**: Test handling of Unauthorized and Forbidden cases.
