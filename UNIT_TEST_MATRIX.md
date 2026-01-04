# FAMS - Báo Cáo Chi Tiết Unit Test Theo Từng Function

Tài liệu này chi tiết hóa các kịch bản kiểm thử cho từng hàm riêng biệt.

---

## 1. Function: `login()` (AuthService)
**Mục tiêu**: Kiểm tra quá trình xác thực người dùng và xử lý lỗi validate.

| STT | Items | UTCID-LOGIN-01 | UTCID-LOGIN-02 | UTCID-LOGIN-03 | UTCID-LOGIN-04 | UTCID-LOGIN-05 | UTCID-LOGIN-06 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Condition**| **Precondition** | Server Connected | Server Connected | Server Connected | Server Connected | Server Connected | Server Connected |
| | **User Status** | ACTIVE | ACTIVE | ACTIVE | ACTIVE | INACTIVE | LOCKED |
| **Input** | **Username** | **Empty** | Valid | **Valid** | **Valid** | Valid | Valid |
| | **Password** | Valid | **Empty** | **Correct** | **Wrong** | Valid | Valid |
| **Confirm** | **Return** | - | - | **LoginResp** | - | - | - |
| | **Exception** | **BadRequest**| **BadRequest**| **N/A** | **Unauth** | Unauth | Unauth |
| | **Log message** | "Username...trống"| "Pass...trống"| "ĐN thành công"| "TK/MK sai" | "Vô hiệu hóa"| "Bị khóa" |
| **Result** | **Type\*** | A | A | N | A | A | A |
| | **Status** | **Passed** | **Passed** | **Passed** | **Passed** | **Passed** | **Passed** |

---

## 2. Function: `logout()` (AuthService)
**Mục tiêu**: Hủy bỏ các phiên làm việc đang hoạt động và cập nhật nhật ký.

| STT | Items | UTCID-LOGOUT-01 | UTCID-LOGOUT-02 |
| :--- | :--- | :--- | :--- |
| **Condition**| **Precondition** | User logged in | No active session |
| **Input** | **Action** | Call logout() | Call logout() |
| **Confirm** | **Return** | Session marked INACTIVE | No action needed |
| | **Log message** | "Logout successful" | - |
| **Result** | **Status** | **Passed** | **Passed** |

---

## 3. Function: `validateToken()` (JwtUtil)
**Mục tiêu**: Kiểm tra tính toàn vẹn và hiệu lực của JWT.

| STT | Items | UTCID-JWT-01 | UTCID-JWT-02 | UTCID-JWT-03 |
| :--- | :--- | :--- | :--- | :--- |
| **Condition**| **Precondition** | Valid Secret | Valid Secret | Valid Secret |
| **Input** | **Token** | Valid Token | Expired Token | Tampered Token |
| **Confirm** | **Return** | True | False | False |
| | **Log message** | - | "Expired JWT" | "Invalid JWT" |
| **Result** | **Status** | **Passed** | **Passed** | **Passed** |

---

## 4. Function: `getStatistics()` (DashboardService)
**Mục tiêu**: Thống kê số lượng người dùng theo vai trò.

| STT | Items | UTCID-DASH-STATS-01 |
| :--- | :--- | :--- |
| **Condition**| **Precondition** | Databases available |
| **Input** | **Action** | Fetch stats |
| **Confirm** | **Return** | DashboardStatsResponse |
| | **Data Check** | Students=50, Lec=10 |
| **Result** | **Status** | **Passed** |

---

### Ghi chú:
- **N**: Normal (Success), **A**: Abnormal (Failure), **B**: Boundary.
- Toàn bộ code test đã được viết riêng lẻ cho từng hàm trên.
