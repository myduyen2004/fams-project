# Hướng dẫn khắc phục lỗi Flyway cho Team

Nếu bạn gặp lỗi liên quan đến Flyway sau khi pull code mới về, hãy thực hiện các bước sau:

## 1. Nguyên nhân
Lần cập nhật trước đã bật Flyway ở môi trường `dev` một cách vô ý. Điều này xung đột với Database hiện tại của bạn (vốn được tạo bởi Hibernate `ddl-auto: update`).

## 2. Cách khắc phục

### Cách 1: Chạy lại Backend (Khuyên dùng)
Tôi đã cập nhật cấu hình để **tắt Flyway ở môi trường dev**. Bạn chỉ cần:
1. Pull code mới nhất từ nhánh `develop`.
2. Khởi động lại Backend. Lỗi sẽ biến mất.

### Cách 2: Nếu vẫn gặp lỗi "Flyway check failed"
Nếu Flyway đã lỡ tạo bảng `flyway_schema_history` và gây lỗi checksum, hãy chạy lệnh SQL này trong database của bạn (DBeaver/Postgres CLI):
```sql
DROP TABLE IF EXISTS flyway_schema_history;
```
Sau đó khởi động lại Backend.

### Cách 3: Sử dụng Maven Repair (Nếu cần)
Nếu bạn đang dùng Flyway ở môi trường khác và gặp lỗi checksum:
```bash
cd backend
mvn flyway:repair
```

---
**Lưu ý:** Từ giờ, môi trường `dev` sẽ tiếp tục dùng `ddl-auto: update` để phát triển nhanh. Flyway chỉ được bật ở `staging` và `production` để đảm bảo an toàn.
