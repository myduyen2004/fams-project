@echo off
echo === HEADS UP: Configuring USB Connection ===
echo Dang chay lenh: adb reverse tcp:8080 tcp:8080
"C:\Users\qn407\AppData\Local\Android\sdk\platform-tools\adb.exe" reverse tcp:8080 tcp:8080

if %ERRORLEVEL% EQU 0 (
    echo [OK] Da ket noi thanh cong! IP 127.0.0.1 tren dien thoai gio se tro ve backend.
) else (
    echo [ERROR] Loi ket noi. Vui long kiem tra xem thiet bi da duoc cam va bat USB Debugging chua.
)
pause
