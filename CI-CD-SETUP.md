# Hướng dẫn Setup CI/CD đa môi trường

## 📋 Tổng quan

Hệ thống đã được cấu hình với 3 môi trường:

| Môi trường | Branch | Database | URL Backend | Frontend |
|------------|--------|----------|-------------|----------|
| Development | `develop` | Docker PostgreSQL | localhost:8080 | localhost:5173 |
| Staging | `staging` | Neon fams-test | http://16.176.158.195:8081 | Vercel (preview) |
| Production | `main` | Neon fams-project | http://16.176.158.195:8080 | Vercel (production) |

## 🚀 Bước 1: Setup GitHub Secrets

Vào repository Settings → Secrets and variables → Actions → New repository secret:

### Secrets chung:
- `EC2_SSH_KEY`: SSH private key để connect tới EC2
  
### Secrets cho Staging:
- `NEON_STAGING_DB_URL`: `jdbc:postgresql://[host]/fams-test?sslmode=require` (Bắt đầu bằng jdbc:)
- `NEON_STAGING_DB_USER`: Username Neon staging database
- `NEON_STAGING_DB_PASSWORD`: Password Neon staging database

### Secrets cho Production:
- `NEON_PROD_DB_URL`: `jdbc:postgresql://[host]/fams-project?sslmode=require` (Bắt đầu bằng jdbc:)
- `NEON_PROD_DB_USER`: Username Neon production database  
- `NEON_PROD_DB_PASSWORD`: Password Neon production database
- `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/1459826342605623375/P7HtDHOTrkhzNIJzw3zcf0E20tGhruu_b_EWnGH4IUjX-ac7qrq8uUsp-_8HMSgUq9Ma`

## 🔧 Bước 2: Tạo branch Staging

```bash
# Tạo branch staging từ develop
git checkout develop
git pull origin develop
git checkout -b staging
git push origin staging

# Set upstream
git push --set-upstream origin staging
```

## 🖥️ Bước 3: Setup trên EC2

SSH vào EC2:
```bash
ssh ec2-user@16.176.158.195
```

### 3.1 Clone repository (nếu chưa có):
```bash
cd /home/ubuntu
git clone git@github.com:myduyen2004/fams-project.git
cd fams-project
```

### 3.2 Make deployment scripts executable:
```bash
chmod +x deploy-staging.sh
chmod +x deploy-production.sh
```

### 3.3 Test manual deployment:

**Staging:**
```bash
git checkout staging
./deploy-staging.sh
```

**Production:**
```bash
git checkout main
./deploy-production.sh
```

## 🌐 Bước 4: Setup DNS (Namecheap)

Vào Namecheap dashboard → Domain List → fams-edu.online → Advanced DNS:

### Thêm A Records:
```
Type: A Record
Host: @
Value: 16.176.158.195
TTL: Automatic

Type: A Record
Host: staging
Value: 16.176.158.195
TTL: Automatic
```

## 🎯 Bước 5: Setup Nginx (Optional - nếu muốn dùng domain thay vì IP)

SSH vào EC2 và install Nginx:
```bash
sudo apt update
sudo apt install nginx -y
```

Tạo config cho các domains:

### Production config:
```bash
sudo nano /etc/nginx/sites-available/fams-production
```

```nginx
server {
    listen 80;
    server_name fams-edu.online www.fams-edu.online;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Staging config:
```bash
sudo nano /etc/nginx/sites-available/fams-staging
```

```nginx
server {
    listen 80;
    server_name staging.fams-edu.online;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable configs:
```bash
sudo ln -s /etc/nginx/sites-available/fams-production /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/fams-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Bước 5.1: Setup SSL (Bắt buộc cho Vercel)

Do Vercel dùng HTTPS, backend cũng phải có SSL để tránh lỗi Mixed Content.

Sử dụng script `setup-ssl.sh` đã có sẵn:

```bash
cd /home/ec2-user/fams-project
chmod +x scripts/setup-ssl.sh

# Setup cho Staging
./scripts/setup-ssl.sh staging.fams-edu.online admin@fams-edu.online

# Setup cho Production
./scripts/setup-ssl.sh fams-edu.online admin@fams-edu.online
```

> [!IMPORTANT]
> Bạn phải trỏ A Record của domain về IP EC2 trước khi chạy script này.

## 📱 Bước 6: Setup Vercel Frontend

### Staging:
1. Vào Vercel dashboard
2. Import project → Connect to GitHub
3. Settings:
   - Branch: `staging`
   - Environment Variables:
     - `VITE_API_URL`: `http://staging.fams-edu.online` (hoặc `http://16.176.158.195:8081`)

### Production:
1. Settings:
   - Branch: `main`
   - Environment Variables:
     - `VITE_API_URL`: `http://fams-edu.online` (hoặc `http://16.176.158.195:8080`)

## 🔄 Workflow hoạt động

### Development (develop branch):
1. Developer push code lên `develop`
2. Local development với Docker PostgreSQL
3. Test trên local trước

### Staging (staging branch):
1. Merge `develop` → `staging`
2. GitHub Actions tự động deploy lên EC2 port 8081
3. Connect tới Neon fams-test database
4. Test trên staging.fams-edu.online

### Production (main branch):
1. Merge `staging` → `main`
2. GitHub Actions tự động deploy lên EC2 port 8080
3. Connect tới Neon fams-project database
4. **Lỗi sẽ tự động ping Discord webhook**
5. Live tại fams-edu.online

## 🔔 Discord Notifications

Production sẽ gửi notifications khi:
- ✅ Deployment thành công
- ❌ Deployment thất bại
- 🚨 Runtime errors (Exception trong application)

Notifications sẽ include:
- Error type & message
- Stack trace
- Endpoint & HTTP method
- Timestamp

## 🧪 Testing

### Test Discord notification:
1. Deploy một version với lỗi cố ý
2. Trigger error bằng cách call một endpoint không tồn tại
3. Check Discord channel để xem notification

### Test deployment:
```bash
# Push test commit
git checkout staging
git commit --allow-empty -m "Test staging deployment"
git push origin staging

# Check GitHub Actions
# Check Discord notifications
```

## 📝 Troubleshooting

### Deployment failed:
```bash
# SSH vào EC2
ssh ubuntu@16.176.158.195

# Check logs
cd /home/ubuntu/fams-project
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.staging.yml logs backend
```

### Health check failed:
```bash
# Check backend health
curl http://localhost:8080/actuator/health  # Production
curl http://localhost:8081/actuator/health  # Staging
```

### Discord notifications không hoạt động:
- Check Discord webhook URL trong GitHub Secrets
- Verify `SPRING_PROFILES_ACTIVE=prod` trong production
- Check backend logs cho Discord errors

## 🎉 Hoàn tất!

Hệ thống CI/CD đã sẵn sàng! Workflow:
1. Develop trên branch `develop`
2. Test trên `staging`
3. Deploy lên `main` cho production
4. Mọi lỗi production sẽ tự động thông báo Discord
