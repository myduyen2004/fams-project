# 🗄️ Hướng dẫn cấu hình Database theo môi trường

## Tổng quan

Dự án FAMS sử dụng **Spring Profiles** để quản lý 3 môi trường:

| Môi trường | Profile | Database | Mục đích |
|------------|---------|----------|----------|
| **Local (Dev)** | `dev` | Docker PostgreSQL (riêng mỗi người) | Phát triển tính năng |
| **Test/Staging** | `test` | Neon Cloud (chung team) | Test tích hợp |
| **Production** | `prod` | Neon Cloud (chung team) | Production |

---

## 🚀 Cho Developer (Local Development)

### Bước 1: Khởi động Database local

```bash
# Chỉ chạy PostgreSQL và Redis (nhẹ, nhanh)
docker-compose -f docker-compose.local.yml up -d
```

### Bước 2: Chạy Backend

```bash
cd backend

# Cách 1: Mặc định đã là profile dev
./mvnw spring-boot:run

# Cách 2: Chỉ định rõ profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Bước 3: Kiểm tra kết nối

```bash
# Kiểm tra PostgreSQL
docker exec -it fams-postgres-local psql -U postgres -d fams_db -c "\dt"

# Kiểm tra Redis
docker exec -it fams-redis-local redis-cli ping
```

---

## 🧪 Cho Test Environment (Staging Domain)

### Đã cấu hình sẵn:
- **Host**: `ep-shy-truth-a1qqexjr-pooler.ap-southeast-1.aws.neon.tech`
- **Database**: `neondb`
- **User**: `neondb_owner`

### Chạy với profile test:

```bash
# Set environment variable
export SPRING_PROFILES_ACTIVE=test
export DATABASE_PASSWORD_TEST=npg_KH5UoMe0NZYA

./mvnw spring-boot:run
```

### Chạy

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=test
```

---

## 🏭 Cho Production Environment

### GitHub Secrets cần thiết

Thêm vào GitHub repository secrets:

| Secret Name | Mô tả |
|-------------|-------|
| `DATABASE_URL` | Neon production connection string |
| `DATABASE_USERNAME` | Neon username |
| `DATABASE_PASSWORD` | Neon password |
| `REDIS_HOST` | Redis host (Upstash hoặc AWS) |
| `REDIS_PASSWORD` | Redis password |
| `JWT_SECRET` | JWT signing key (256+ bits) |

### EC2 Deployment

```bash
# Set profile trong docker run
docker run -e SPRING_PROFILES_ACTIVE=prod \
  -e DATABASE_URL="jdbc:postgresql://..." \
  -e DATABASE_PASSWORD="..." \
  fams-backend
```

---

## 📁 Cấu trúc Files

```
backend/src/main/resources/
├── application.yml          # Config mặc định + shared settings
├── application-dev.yml      # Local Docker database
├── application-test.yml     # Neon test database
└── application-prod.yml     # Neon production database

docker-compose.local.yml     # Chỉ PostgreSQL + Redis cho local dev
docker-compose.yml           # Full stack (tất cả services)
```

---

## ⚠️ Lưu ý quan trọng

1. **KHÔNG commit `.env` file** - đã có trong `.gitignore`
2. **Production dùng `ddl-auto: validate`** - không tự động modify database
3. **Mỗi developer có data riêng** - không conflict với nhau
4. **Test & Production share data** - đảm bảo consistency
