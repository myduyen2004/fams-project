# FAMS - FPT Academic Management System 🚀

**FAMS (FPT Academic Management System)** là hệ thống quản lý học vụ và điểm danh sinh viên bằng công nghệ nhận dạng khuôn mặt tiên tiến, kết hợp giữa sự bảo mật của AI và tính linh hoạt của Web/Mobile. 

Dự án được thiết kế để giải quyết vấn đề gian lận điểm danh, tự động hóa quy trình quản lý của giảng viên và cung cấp cái nhìn tổng quan thời gian thực cho Academic Staff thông qua Dashboard giám sát chuyên sâu.

---

## 🌟 Tính Năng Nổi Bật

### 🛡️ Bảo Mật & Chống Giả Mạo Nâng Cao (Security & Anti-Spoofing)
- **Passive Liveness Detection**: Phát hiện khuôn mặt thật/giả thông qua phân tích chiều sâu (3D Geometry Veto) và cảm biến LCD.
- **Active Challenges**: Yêu cầu người dùng thực hiện các hành động ngẫu nhiên (chớp mắt, mỉm cười, quay đầu) để xác nhận danh tính thực.
- **Multi-Factor Validation**: Kiểm tra vị trí (Location), mạng WiFi (BSSID/RSSI) và thời gian thực để ngăn chặn điểm danh hộ từ xa.
- **Fail-Fast Security**: Hệ thống tiền kiểm tra (Pre-check) để từ chối ngay lập tức các nỗ lực tấn công bằng hình ảnh/video.

### 📊 Dashboard Giám Sát Thời Gian Thực (Real-time Monitoring)
- **Live Attendance Map**: Bản đồ trực quan hóa vị trí điểm danh của sinh viên trên phạm vi toàn quốc.
- **WebSocket Broadcasting**: Cập nhật trạng thái trực tuyến (Online users), lịch sử truy cập và các cảnh báo bảo mật ngay lập tức mà không cần tải lại trang.
- **Security Alerts**: Tự động thông báo khi phát hiện các nỗ lực đăng nhập hoặc điểm danh bất thường.

### 📱 Trải Nghiệm Mobile & Web Mượt Mà
- **Mobile app (Flutter)**: Giao diện trực quan, xử lý AI trực tiếp trên thiết bị để tăng tốc độ phản hồi.
- **Web admin (React)**: Công cụ quản lý mạnh mẽ cho giảng viên và nhân viên học vụ với hệ thống phân quyền chặt chẽ.

---

## 🛠️ Công Nghệ Sử Dụng

### 🖥️ Backend (Trung tâm xử lý)
- **Language**: Java 21
- **Framework**: Spring Boot 3 + Spring Security (Stateless JWT)
- **Database**: PostgreSQL (Data persistence) & Redis (Caching/Session)
- **Communication**: WebSocket (STOMP) cho dữ liệu thời gian thực.
- **Tooling**: Maven, Docker.

### 💻 Frontend (Dashboard & Admin)
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS & Lucide Icons
- **Visualization**: Recharts & Leaflet Map
- **State Management**: Zustand & React Router Dom 7.

### 📱 Mobile (Ứng dụng cho User)
- **Framework**: Flutter (Dart)
- **State Management**: GetX (Navigation & UI State)
- **AI/ML**: Google ML Kit Face Detection
- **Networking**: Dio for optimized API calls.

### 🤖 AI Service (Bộ não nhận diện)
- **Language**: Python 3.10
- **Libraries**: OpenCV, MediaPipe, dlib, Face Recognition.
- **API**: FastAPI/Flask phục vụ xử lý ảnh từ Backend.

---

## ⚙️ Hướng Dẫn Cài Đặt (Setup Guide)

### Yêu Cầu Hệ Thống
- Đã cài đặt **Docker** và **Docker Compose**.
- Đã cài đặt **Node.js** (cho Frontend) và **Flutter SDK** (cho Mobile) nếu muốn chạy thủ công.

### Khởi Chạy Nhanh với Docker
Chạy lệnh duy nhất tại thư mục gốc để khởi động toàn bộ hệ sinh thái (Backend, Frontend, AI, DB, Redis):

```bash
docker-compose up -d --build
```

### Các Địa Chỉ Truy Cập Mặc Định:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **AI Service API**: [http://localhost:5000](http://localhost:5000)

---

## 📂 Cấu Trúc Dự Án

```bash
fams-project/
├── backend/          # Mã nguồn Spring Boot (Java)
├── frontend/         # Mã nguồn React Dashboard (TSX)
├── mobile/           # Mã nguồn ứng dụng Flutter (Dart)
├── ai-service/       # Mã nguồn xử lý nhận diện (Python)
├── scripts/          # Các script hỗ trợ deploy/setup
└── docker-compose.yml # Cấu hình vận hành hệ thống container
```

---

## 🤝 Đội Ngũ Phát Triển (Team)

Dự án được phát triển và duy trì bởi **myduyen2004** và cộng sự, hướng tới mục tiêu xây dựng một môi trường giáo dục minh bạch và hiện đại.

---
*© 2026 FAMS Project. All rights reserved.*
