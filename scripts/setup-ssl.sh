#!/bin/bash

# Script cài đặt SSL và Nginx cho EC2 Backend (Amazon Linux 2023)
# Chạy script này trên EC2 instance

DOMAIN="api.fams-edu.online"
EMAIL="admin@fams-edu.online"

echo "=== Setup SSL for $DOMAIN (AL2023) ==="

# 1. Cài đặt Nginx và Certbot (Dùng dnf thay verify yum/amazon-linux-extras)
echo "Installing Nginx and Certbot..."
sudo dnf update -y
sudo dnf install -y nginx certbot python3-certbot-nginx

# 2. Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 3. Tạo cấu hình Nginx cho Domain
echo "Configuring Nginx..."
sudo tee /etc/nginx/conf.d/$DOMAIN.conf > /dev/null <<EOF
server {
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 4. Reload Nginx
sudo systemctl reload nginx

# 5. Chạy Certbot để lấy chứng chỉ SSL
echo "Obtaining SSL Certificate..."
echo "NOTE: Bạn cần trỏ DNS $DOMAIN về IP của server này trước khi chạy bước này!"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "=== SSL Setup Complete ==="
echo "Backend is now available at https://$DOMAIN"
