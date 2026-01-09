/// API Constants and Configuration
class ApiConstants {
  ApiConstants._();

  // Base URLs
  static const String baseUrlLocal = 'http://10.0.2.2:8080'; // Android Emulator
  static const String baseUrlLocalDevice = 'http://10.0.14.160:8080'; // Real device via WiFi
  
  // Current Environment - Change to baseUrlLocalDevice for real device
  static const String baseUrl = baseUrlLocalDevice; // Using real device WiFi

  // Auth Endpoints
  static const String login = '/api/auth/login';
  static const String logout = '/api/auth/logout';
  static const String forgotPassword = '/api/auth/forgot-password';
  static const String verifyOtp = '/api/auth/verify-otp';
  static const String resetPassword = '/api/auth/reset-password';
  static const String changePassword = '/api/auth/change-password';
  static const String getCurrentUser = '/api/auth/me';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String keyToken = 'auth_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUser = 'user_data';
  static const String keyIsLoggedIn = 'is_logged_in';
}
