#!/bin/bash
# Script tạo Swap ram ảo để tránh lỗi hết RAM khi build Docker trên EC2 t2.micro

echo "Creating 2GB Swap file..."
# Tạo file swap 2GB
sudo fallocate -l 2G /swapfile
# Set quyền
sudo chmod 600 /swapfile
# Format thành swap
sudo mkswap /swapfile
# Kích hoạt swap
sudo swapon /swapfile
# Tự động mount khi khởi động lại
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo "Swap created successfully!"
free -h
