@echo off
echo [*] Cleaning Flutter build...
call flutter clean
echo [*] Cleaning Android build...
cd android
call .\gradlew clean
cd ..
echo [*] Getting packages...
call flutter pub get
echo [*] Done! Please run 'adb reverse tcp:8080 tcp:8080' if using a real device via USB.
pause
