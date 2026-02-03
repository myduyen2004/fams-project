@echo off
echo [FAMS] Dang thiet lap ket noi Mobile qua USB...
adb reverse tcp:8080 tcp:8080
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ket noi thanh cong! Cong 8080 da duoc chuyen huong.
) else (
    echo [LOI] Khong the thiet lap ket noi.
    echo 1. Hay dam bao da cam dien thoai, bat USB Debugging.
    echo 2. Hay dam bao da them ADB vao Path cua Windows.
)
timeout /t 3
