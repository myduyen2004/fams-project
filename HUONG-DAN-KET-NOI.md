# Hướng dẫn thiết lập kết nối Mobile cho Team FAMS

Chào team! Để việc kết nối điện thoại thật qua USB trở nên "siêu tốc" và không cần gõ lệnh dài dòng, mọi người hãy thực hiện 2 bước thiết lập dưới đây (Chỉ làm 1 lần duy nhất).

---

## Bước 1: Thêm ADB vào đường dẫn hệ thống (Path)
*Bước này giúp máy tính hiểu lệnh `adb` là gì.*

1. Tìm thư mục `platform-tools` trong máy (Thường là: `C:\Users\<Tên_Bạn>\AppData\Local\Android\Sdk\platform-tools`).
2. Copy đường dẫn đó.
3. Nhấn phím Windows, gõ **"path"** -> Chọn **Edit the system environment variables**.
4. Nhấn nút **Environment Variables...**.
5. Ở ô **User variables**, chọn dòng **Path** -> Nhấn **Edit**.
6. Nhấn **New**, dán đường dẫn đã copy vào -> Nhấn OK hết các cửa sổ.

---

## Bước 2: Tạo lệnh tắt "fams-connect"
*Bước này giúp bạn chỉ cần gõ 1 từ duy nhất để kết nối.*

1. Mở Terminal trong VS Code (Nhấn \`Ctrl + \` \`).
2. Copy và dán toàn bộ lệnh dưới đây vào rồi nhấn Enter:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -Type File -Path $PROFILE -Force }
$cmd = 'function fams-connect { adb reverse tcp:8080 tcp:8080; echo "`n[FAMS] Da ket noi thanh cong qua USB! San sang build app." }'
Add-Content -Path $PROFILE -Value $cmd
```

3. **QUAN TRỌNG**: Tắt VS Code đi và mở lại để lệnh có hiệu lực.

---

## Cách dùng hàng ngày
Mỗi khi bắt đầu làm việc:
1. Cắm điện thoại vào máy tính (Đã bật USB Debugging).
2. Mở Terminal gõ: **`fams-connect`**
3. Thế là xong! Bạn có thể nhấn F5 để chạy app.
