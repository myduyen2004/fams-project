/// API Constants and Configuration
class ApiConstants {
  ApiConstants._();

  // Base URLs
  static const String baseUrlLocal = 'http://10.0.2.2:8080'; // Android Emulator
  static const String baseUrlUsb = 'http://127.0.0.1:8080'; // Real device via USB (adb reverse)
  static const String baseUrlLocalDevice = 'http://10.0.14.210:8080'; // Real device via WiFi
  
  // Current Environment
  static const String baseUrl = baseUrlUsb; // Use USB (adb reverse)

  // Auth Endpoints
  static const String login = '/api/auth/login';
  static const String logout = '/api/auth/logout';
  static const String forgotPassword = '/api/auth/forgot-password';
  static const String verifyOtp = '/api/auth/verify-otp';
  static const String resetPassword = '/api/auth/reset-password';
  static const String changePassword = '/api/auth/change-password';
  static const String updateProfile = '/api/auth/profile';
  static const String getCurrentUser = '/api/auth/me';

  // Timetable Endpoints
  static const String studentSchedule = '/api/v1/timetable/student';
  static const String lecturerSchedule = '/api/v1/timetable/lecturer';
  static const String checkIn = '/api/v1/attendance/check-in';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String keyToken = 'auth_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUser = 'user_data';
  static const String keyIsLoggedIn = 'is_logged_in';
}
