# FAMS Unit Test Documentation - Matrix Format

This document contains the official Unit Test results for the FAMS Backend components, following the required test matrix template.

## 1. Authentication Service (`AuthService.login`)

| Condition | Precondition | UTCID01 | UTCID02 | UTCID03 | UTCID04 |
| :--- | :--- | :---: | :---: | :---: | :---: |
| | **Can connect with server** | O | O | O | O |
| | **User exists** | | O | O | O |
| **Input** | **Username** | "" (Empty) | "testuser" | "testuser" | "testuser" |
| | **Password** | "any" | "correct" | "wrong" | "correct" |
| | **User Status** | N/A | ACTIVE | ACTIVE | **LOCKED** |
| **Confirm** | **Return Value** | | LoginResponse | | |
| | **Throw Exception** | O | | O | O |
| **Exception** | **Type** | BadRequest | N/A | Unauthorized | Unauthorized |
| **Log Msg** | **Message** | "Username không được..." | "success" | "Tài khoản hoặc..." | "Tài khoản đã bị khóa" |
| **Result** | **Type (N, A, B)** | **A** | **N** | **A** | **A** |
| | **Passed/Failed** | **P** | **P** | **P** | **P** |
| | **Executed Date** | 01/01 | 01/01 | 01/01 | 01/01 |
| | **Defect ID** | | | | |

---

## 2. JWT Utility (`JwtUtil`)

| Condition | Precondition | UTCID-JWT01 | UTCID-JWT02 | UTCID-JWT03 |
| :--- | :--- | :---: | :---: | :---: |
| | **Can connect with server** | O | O | O |
| **Input**| **Token Status** | NEW | INVALID FORMAT | EXPIRED |
| **Confirm** | **Return True** | O | | |
| | **Return False** | | O | O |
| **Result** | **Type (N, A, B)** | **N** | **A** | **B** |
| | **Passed/Failed** | **P** | **P** | **P** |
| | **Executed Date** | 01/01 | 01/01 | 01/01 |
| | **Defect ID** | | | |

---

## 3. Dashboard Service (`DashboardService.getStatistics`)

| Condition | Precondition | UTCID-DASH01 | UTCID-DASH02 | UTCID-DASH03 |
| :--- | :--- | :---: | :---: | :---: |
| | **Can connect with server** | O | O | O |
| | **DB has data** | O | O | |
| **Confirm** | **Return Stats** | O | | |
| | **Return Zeros** | | | O |
| **Result** | **Type (N, A, B)** | **N** | **N** | **B** |
| | **Passed/Failed** | **P** | **P** | **P** |
| | **Executed Date** | 01/01 | 01/01 | 01/01 |
| | **Defect ID** | | | |
