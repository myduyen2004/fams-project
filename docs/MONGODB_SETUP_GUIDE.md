# 🔧 Hướng dẫn cấu hình sau khi merge branch `notification-mongodb`

> **Tóm tắt thay đổi:** Notification read status (đã đọc/chưa đọc) đã được chuyển từ MySQL (`notification_recipients`) sang MongoDB (`notification_read_status` collection). Cần thêm MongoDB vào môi trường phát triển.

---

## 📋 Checklist nhanh

- [ ] Pull code mới nhất
- [ ] Xoá volume Docker cũ (nếu có lỗi auth)
- [ ] Chạy `docker-compose up -d --build`
- [ ] Kiểm tra backend logs không có lỗi MongoDB
- [ ] (Tuỳ chọn) Cài MongoDB Compass để xem dữ liệu

> ℹ️ File `.env` đã bao gồm cấu hình MongoDB. Chỉ cần pull code và chạy Docker.

## 1. Chạy Docker

```bash
# Dọn volume MongoDB cũ (chỉ chạyz nếu gặp lỗi auth)
docker volume rm fams-project_mongodb_data 2>/dev/null

# Build và khởi động
docker-compose up -d --build
```

### Kiểm tra services đã chạy

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Kết quả mong đợi:

| Container       | Status          |
|-----------------|-----------------|
| fams-postgres   | Up (healthy)    |
| fams-redis      | Up (healthy)    |
| fams-mongodb    | Up (healthy)    |
| fams-ai-service | Up (healthy)    |
| fams-backend    | Up              |

---

## 2. Kiểm tra backend logs

```bash
docker logs fams-backend --tail 50
```

✅ **Thành công** nếu thấy: `Started BackendApplication in ... seconds`

❌ **Lỗi thường gặp:**

| Lỗi | Nguyên nhân | Cách sửa |
|------|------------|----------|
| `Connection string is invalid` | Thiếu `MONGODB_URI` trong `.env` | Thêm vào `.env` (xem bước 1) |
| `Authentication failed` | Volume cũ có user khác | `docker volume rm fams-project_mongodb_data` rồi chạy lại |
| `CLOUDINARY_API_SECRET not found` | Thiếu biến Cloudinary | Kiểm tra `.env` có đủ 3 biến Cloudinary |

---

## 3. Flyway Migration tự động

Khi backend khởi động, Flyway sẽ tự chạy migration:

```
V20260316093000__migrate_notification_read_status_to_mongodb.sql
```

Migration này sẽ:
- ✅ Xoá bảng `notification_recipients` (MySQL) — dữ liệu read status giờ lưu trong MongoDB
- ✅ Cập nhật constraint `target_type` thêm giá trị `ACADEMIC_STAFF`, `ADMIN`

> **Lưu ý:** Dữ liệu read status cũ sẽ bị mất. Không cần migrate vì đây là dữ liệu dev/test.

---

## 4. (Tuỳ chọn) Xem dữ liệu MongoDB bằng Compass

1. Tải [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Kết nối với URI:
   ```
   mongodb://fams_user:fams_pass@localhost:27017/fams_notifications?authSource=admin
   ```
3. Sau khi tạo notification trong app → Refresh Compass → thấy collection `notification_read_status`

> **Ghi nhớ:** MongoDB chỉ tạo database/collection khi có dữ liệu đầu tiên được chèn vào.

---

## 5. Tổng quan files đã thay đổi

### Files mới
| File | Mô tả |
|------|--------|
| `backend/.../document/NotificationReadStatus.java` | MongoDB document model |
| `backend/.../repository/NotificationReadStatusRepository.java` | MongoDB repository |
| `backend/.../service/UserNotificationService.java` | Interface cho notification service |
| `backend/.../migration/V20260316093000__*.sql` | Flyway migration (xoá bảng cũ) |

### Files đã xoá
| File | Mô tả |
|------|--------|
| `backend/.../entity/NotificationRecipient.java` | Entity MySQL (đã xoá) |
| `backend/.../repository/NotificationRecipientRepository.java` | Repository MySQL (đã xoá) |

### Files đã sửa
| File | Thay đổi chính |
|------|---------------|
| `pom.xml` | Thêm `spring-boot-starter-data-mongodb` |
| `docker-compose.yml` | Thêm MongoDB service |
| `application*.yml` | Thêm MongoDB URI config |
| `NotificationServiceImpl.java` | Dùng MongoDB thay MySQL cho read status |
| `DashboardServiceImpl.java` | Dùng `UserNotificationService` interface |
| `ScheduleRequestServiceImpl.java` | Dùng `notificationService.createNotification()` |
| `Notification.java` | Thêm `ACADEMIC_STAFF`, `ADMIN` target type; bỏ `recipients` field |

---

## ❓ FAQ

**Q: Tôi dùng IntelliJ chạy backend trực tiếp (không Docker), cần làm gì?**

A: Cài MongoDB local hoặc chạy riêng container MongoDB:
```bash
docker-compose up -d mongodb
```
Sau đó set biến environment trong IntelliJ Run Configuration:
```
MONGODB_URI=mongodb://fams_user:fams_pass@localhost:27017/fams_notifications?authSource=admin
```

**Q: Frontend có cần thay đổi gì không?**

A: Không. API response format không thay đổi.

**Q: Tại sao không thấy database `fams_notifications` trong Compass?**

A: MongoDB chỉ tạo database khi có dữ liệu. Hãy tạo 1 notification trong app rồi refresh Compass.
