import 'dart:io';

/// API Constants and Configuration
class ApiConstants {
  ApiConstants._();

  // Base URLs
  static const String baseUrlNgrok =
      'https://nonprotrusive-crimpier-eula.ngrok-free.dev';
  static const String baseUrlLocal = 'http://10.0.2.2:8080'; // Android Emulator
  static const String baseUrlUsb =
      'http://127.0.0.1:8080'; // Real device via USB (adb reverse - dùng fams-connect)
  static const String baseUrlLocalDevice =
      'http://10.0.14.210:8080'; // Real device via WiFi

  // --- THIET LAP KET NOI (Team FAMS) ---
  // Bat TRUE neu dung fams-connect (USB), bat FALSE neu dung Ngrok
  static const bool useUsbMode = true;

  // Current Backend URL
  static String get baseUrl {
    if (Platform.isIOS) {
      return baseUrlNgrok; // iOS luon dung ngrok
    }

    // Android: Dung USB (Localhost) neu bat useUsbMode, nguoc lai dung Ngrok
    return useUsbMode ? baseUrlUsb : baseUrlNgrok;
  }

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
  static const String studentSemesterSchedule =
      '/api/v1/timetable/student'; // + /{id}/semester?semesterCode=X
  static const String lecturerSemesterSchedule =
      '/api/v1/timetable/lecturer'; // + /{id}/semester?semesterCode=X
  static const String attendanceConfig = '/api/v1/attendance-config';
  static const String checkIn = '/api/v1/attendance/check-in';

  // Schedule Request Endpoints
  static const String lecturerRequests = '/api/v1/lecturer/requests';
  static const String lecturerClasses = '/api/v1/lecturer/classes';
  static const String roomsAvailability = '/api/v1/rooms/availability';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Storage Keys
  static const String keyToken = 'auth_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUser = 'user_data';
  static const String keyIsLoggedIn = 'is_logged_in';

  // WebSocket URL
  static String get wsUrl => '${baseUrl.replaceFirst('http', 'ws')}/ws';

  // Chat Endpoints
  static const String chatGroups = '/api/v1/chat-groups';
  static const String chatMessages = '/api/v1/chat-messages';

  // Academic Request Endpoints (Student)
  static const String academicRequests = '/api/v1/academic-requests';
  static const String academicRequestTypes = '/api/v1/academic-requests/types';
  static const String academicRequestMyRequests =
      '/api/v1/academic-requests/my-requests';

  // News Endpoints
  static const String publishedNews = '/api/v1/news';

  // AI Chat Endpoints
  static const String aiChatSessions = '/api/chat/sessions';
  static const String aiChatMessages = '/api/chat/sessions/{id}/messages';
  static const String aiChatSend = '/api/chat/sessions/{id}/send';
  static const String aiChatUpload = '/api/chat/sessions/{id}/upload';
}
