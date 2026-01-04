# Chiến lược Unit Test - Dự án FAMS

Tài liệu này hướng dẫn cách thực hiện kiểm thử đơn vị (Unit Test) cho hệ thống FAMS để đảm bảo chất lượng code và hạn chế lỗi khi triển khai.

## 1. Mục tiêu
- Đảm bảo các hàm xử lý logic (Service, Util) hoạt động đúng kịch bản.
- Phát hiện sớm các lỗi phá vỡ hệ thống khi thay đổi code (Regression testing).
- Tăng độ tin cậy của mã nguồn trước khi deploy lên Production.

## 2. Công cụ sử dụng
- **JUnit 5**: Framework kiểm thử chính.
- **Mockito**: Công cụ để giả lập (mock) các phụ thuộc (Dependencies) như Repository.
- **Maven**: Công cụ quản lý build và chạy test.

## 3. Quy tắc viết Test
- **Đặt tên hàm**: `when[Điều_kiện]_then[Kết_quả]` (Ví dụ: `whenLoginSuccess_thenReturnToken`).
- **Nguyên tắc FIRST**:
    - **Fast**: Test phải chạy nhanh.
    - **Independent**: Không phụ thuộc vào kết quả của các bài test khác.
    - **Repeatable**: Chạy ở môi trường nào cũng ra cùng một kết quả.
    - **Self-validating**: Test tự xác nhận đúng/sai qua Assertions.
    - **Thorough**: Bao phủ cả trường hợp thành công và thất bại.

## 4. Cấu trúc một bài Test (AAA Pattern)
1. **Arrange**: Chuẩn bị dữ liệu mẫu và thiết lập các Mock.
2. **Act**: Thực hiện gọi hàm cần test.
3. **Assert**: Kiểm tra kết quả trả về so với kỳ vọng.

## 5. Chạy Test bằng Docker (Khuyên dùng)
Sử dụng Docker giúp bạn không cần cài đặt Java hay Maven máy local mà vẫn đảm bảo môi trường test chuẩn xác.

Chạy lệnh sau tại thư mục gốc của dự án:
```powershell
docker run --rm -v "${PWD}/backend:/app" -w /app maven:3.9-eclipse-temurin-21-alpine mvn test "-Dtest=AuthServiceTest,JwtUtilTest,DashboardServiceImplTest"
```

---
*Ghi chú: Luôn cập nhật file UNIT_TEST_RESULTS.md sau mỗi lần chạy test quan trọng.*
