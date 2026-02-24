# FAMS - FPT Academic Management System 🚀

**FAMS (FPT Academic Management System)** là hệ thống quản lý học vụ toàn diện được thiết kế chuyên biệt cho môi trường giáo dục hiện đại. Không chỉ dừng lại ở việc điểm danh, FAMS là một hệ sinh thái quản trị tích hợp, kết nối giữa sinh viên, giảng viên và cán bộ quản lý học vụ (Academic Staff) thông qua các giải pháp công nghệ tiên tiến nhất.

Hệ thống được xây dựng trên nền tảng kiến trúc Microservices-ready, tối ưu hóa cho hiệu năng cao, bảo mật chặt chẽ và khả năng mở rộng linh hoạt.

---

## 🌟 Các Phân Hệ Quản Trị Trung Tâm

### 🏛️ Quản Lý Đào Tạo & Chương Trình Học (Curriculum Management)
- **Cấu trúc đa tầng**: Quản lý linh hoạt danh mục ngành học (Major), chuyên ngành (Specialization) và chuyên ngành hẹp (Sub-Specialization).
- **Quản lý học phần**: Hệ thống quản lý môn học (Course) với khả năng cấu trúc hóa các thành phần điểm (Grade Components) linh hoạt cho từng môn học.
- **Hệ thống Học kỳ**: Quản lý các kỳ học (Semester) với trạng thái động (Upcoming, Ongoing, Finished).

### 📅 Quản Lý Lớp Học & Thời Khóa Biểu (Scheduling & Enrollment)
- **Lớp học phần (Class Sections)**: Quản lý danh sách lớp, sĩ số và gán giảng viên phụ trách.
- **Xếp lịch thông minh (Timetable)**: Hệ thống quản lý thời khóa biểu chi tiết đến từng slot, phòng học (Room) và giảng viên.
- **Quản lý đăng ký (Enrollment)**: Hỗ trợ bulk-import sinh viên vào lớp học với kỹ thuật **Staging Table**, đảm bảo RAM usage cực thấp (< 50MB) ngay cả với dữ liệu hàng triệu bản ghi.
- **Yêu cầu đổi lịch (Schedule Requests)**: Giảng viên có thể gửi yêu cầu đổi lịch/dạy bù trực tuyến và được Academic Staff phê duyệt tức thời.

### � Quản Lý Điểm & Đánh Giá (Grade Management)
- **Nhập điểm bảo mật**: Quy trình nhập điểm được bảo vệ bằng mã OTP (Lecturer Grade OTP), đảm bảo tính toàn vẹn của dữ liệu điểm số.
- **Thống kê & Báo cáo**: Tự động tính toán điểm trung bình, quản lý các kỳ thi (Exam Grades) và hiển thị tiến độ học tập cho sinh viên.
- **Quy trình phê duyệt**: Hệ thống phân quyền cho phép giảng viên nhập điểm và Academic Staff kiểm soát, phê duyệt cuối cùng.

### �️ Hệ Thống Điểm Danh Bảo Mật AI (Security-First Attendance)
- **Nhận diện khuôn mặt**: Sử dụng công nghệ AI tiên tiến để xác thực danh tính sinh viên.
- **Chống giả mạo (Anti-Spoofing)**: Tích hợp Passive Liveness Detection (phân tích 3D Geometry) và Active Challenges để ngăn chặn các nỗ lực gian lận bằng ảnh/video.
- **Ràng buộc hạ tầng**: Kiểm tra vị trí (Location), danh sách WiFi Access Points và tín hiệu RSSI để đảm bảo sinh viên đang có mặt trực tiếp tại phòng học.

---

## 🛠️ Kiến Trúc Hệ Thống & Tech Stack

FAMS được xây dựng với kiến trúc phân tầng rõ rệt, phối hợp mượt mà giữa 4 thành phần chính:

### 🖥️ 1. Backend Central (Spring Boot)
- **Core Technology**: Java 21, Spring Boot 3.4
- **Security**: Spring Security + Stateless JWT, mã hóa dữ liệu nhạy cảm.
- **Real-time**: WebSocket (STOMP) phục vụ Dashboard giám sát và hệ thống thông báo báo động.
- **Performance**: Redis Caching, tối ưu hóa truy vấn PostgreSQL, tích hợp Cloudinary để quản lý tài nguyên ảnh.

### 💻 2. Admin Dashboard (React)
- **Tech Stack**: React 18, TypeScript, Vite, Tailwind CSS.
- **Features**: Dashboard phân tích dữ liệu chuyên sâu cho Academic Staff, quản lý bản đồ trực tuyến (Leaflet), hệ thống thông báo thời gian thực.

### 📱 3. Mobile App (Flutter)
- **Framework**: Flutter (Dart).
- **Security**: Tích hợp Google ML Kit cho việc xử lý khuôn mặt ngay trên thiết bị (Edge Computing) để đảm bảo quyền riêng tư và tốc độ.

### 🤖 4. AI Security Service (Python)
- **Core**: Python 3.10, FastAPI.
- **AI Engine**: OpenCV, MediaPipe, dlib để thực thi các thuật toán kiểm tra tính xác thực (Liveness Test) phức tạp.

---

## 🚀 Hướng Dẫn Vận Hành (Quick Start)

Hệ thống được Docker hóa hoàn toàn để đảm bảo sự đồng nhất giữa môi trường dev và production.

1. **Chuẩn bị**: Cài đặt Docker và Docker Compose.
2. **Khởi chạy**: Tại thư mục gốc, chạy lệnh:
   ```bash
   docker-compose up -d --build
   ```
3. **Địa chỉ truy cập**:
   - Web Dashboard: `http://localhost:3000`
   - API Swagger: `http://localhost:8080/swagger-ui.html`
   - AI Service: `http://localhost:5000`

---

## 📂 Tổ Chức Thư Mục

```bash
fams-project/
├── backend/          # Micro-monolith xử lý logic học vụ & bảo mật
├── frontend/         # React SPA cho quản trị viên và giảng viên
├── mobile/           # Ứng dụng di động cho sinh viên & giảng viên
├── ai-service/       # Python Service chuyên trách bảo mật khuôn mặt
└── docker-compose.yml # Orchestration cho toàn bộ hệ thống
```

---
*© 2026 FAMS Project - Kiến tạo môi trường quản lý học vụ hiện đại và minh bạch.*
