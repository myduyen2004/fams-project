# Hướng dẫn Chạy và Cấu hình Ứng dụng FAMS Mobile

Tài liệu này hướng dẫn cách cài đặt, cấu hình và chạy ứng dụng FAMS trên hai nền tảng Android và iOS, đặc biệt là các lưu ý về chức năng **Quét khuôn mặt (Face Recognition)**.

---

## 1. Yêu cầu Hệ thống
*   **Flutter SDK:** Đã cài đặt và cấu hình biến môi trường.
*   **Thiết bị:** Khuyến khích sử dụng điện thoại thật để chức năng Face ID và Quét WiFi hoạt động ổn định nhất.
*   **MacOS (Bắt buộc cho iOS):** Để build được app cho iPhone, bạn cần một máy chạy macOS và cài sẵn **Xcode**.

---

## 2. Cấu hình ban đầu
Mở terminal tại thư mục `mobile/` và chạy lệnh sau để tải các thư viện:
```bash
flutter pub get
```

---

## 3. Hướng dẫn chạy trên ANDROID
### Các bước thực hiện:
1.  Kết nối điện thoại Android và bật **Gỡ lỗi USB (USB Debugging)**.
2.  Mở terminal tại thư mục gốc của dự án mobile.
3.  Chạy lệnh: `flutter run`

### Lưu ý cho Android:
*   Đã hỗ trợ định dạng ảnh camera `NV21` mặc định.
*   Quyền truy cập Camera và Vị trí (để quét WiFi) đã được khai báo sẵn trong `AndroidManifest.xml`.

---

## 4. Hướng dẫn chạy trên iOS (iPhone)
*Lưu ý: Chỉ thực hiện được trên máy Mac.*

### Bước 1: Cài đặt thư viện iOS (CocoaPods)
1.  Di chuyển vào thư mục `ios`: `cd ios`
2.  Tải các pod cần thiết: `pod install` (Nếu bị lỗi, hãy dùng `arch -x86_64 pod install` trên máy Mac chip M1/M2).
3.  Quay lại thư mục gốc: `cd ..`

### Bước 2: Cấu hình Xcode (Signing & Capabilities)
1.  Mở file `ios/Runner.xcworkspace` bằng Xcode.
2.  Chọn vào project **Runner** ở cột bên trái.
3.  Trong tab **Signing & Capabilities**:
    *   **Team:** Chọn tài khoản Apple ID của bạn để ký tên ứng dụng.
    *   **Bundle Identifier:** Phải là duy nhất (vd: `com.fams.project.mobile`).
4.  **QUAN TRỌNG (Quét WiFi):** Nhấn nút `+ Capability` ở góc trên bên trái, tìm và thêm **"Access WiFi Information"**. Nếu thiếu bước này, bạn sẽ không thể lấy được tên WiFi (SSID/BSSID) để điểm danh.

### Bước 3: Chạy ứng dụng
1.  Cắm iPhone vào máy Mac.
2.  Trên Xcode, nhấn nút **Play** (hình tam giác) hoặc chạy lệnh `flutter run` từ terminal.
3.  **Tin cậy Nhà phát triển:** Lần đầu chạy trên iPhone thật, hãy vào:
    *Cài đặt -> Cài đặt chung -> Quản lý thiết bị -> Chọn Apple ID của bạn -> Trust (Tin cậy).*

---

## 5. Chức năng Quét Khuôn mặt (Face Recognition)
Để tính năng này hoạt động ổn định trên cả 2 nền tảng:

*   **Quyền truy cập:** Ứng dụng sẽ yêu cầu quyền Camera và Vị trí. Thành viên nhóm cần chọn **"Cho phép" (Allow)** khi hệ thống hỏi.
*   **Chế độ Offline/WiFi:** Tính năng điểm danh yêu cầu dữ liệu WiFi để xác minh bạn đang ở đúng phòng học. Hãy bật WiFi trên điện thoại trước khi thực hiện.
*   **Thiết bị hỗ trợ:**
    *   **Android:** Hỗ trợ mọi thiết bị có camera trước.
    *   **iPhone:** Đã được cấu hình tự động nhận diện định dạng ảnh `BGRA8888` để tương thích với hệ điều hành iOS.

---

## 6. Các lỗi thường gặp và cách xử lý
*   **Lỗi "Podfile out of date":** Chạy `cd ios && rm -rf Pods && rm Podfile.lock && pod install`.
*   **Lỗi không nhận diện khuôn mặt:** Đảm bảo điện thoại đủ ánh sáng và không đeo kính đen (đã được cấu hình để cảnh báo người dùng tháo kính).
*   **Lỗi quét WiFi trên Android 10+:** Cần bật **Vị trí (Location/GPS)** lên thì app mới lấy được tên WiFi.

---
*Chúc các thành viên trong nhóm build app thành công!*
