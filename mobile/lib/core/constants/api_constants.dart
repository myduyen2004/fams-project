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
  // Chọn 1 trong 3 chế độ kết nối bằng cách bật TRUE cho biến tương ứng:
  static const bool useNgrok = false;   // Dùng Ngrok
  static const bool useUsb = true;     // Dùng máy thật qua USB (Cần chạy adb reverse)
  // Nếu cả 2 trên đều FALSE -> Mặc định dùng cho Android Emulator (10.0.2.2)

  // Current Backend URL
  static String get baseUrl {
    if (Platform.isIOS) {
      return baseUrlNgrok; // iOS luôn dùng ngrok (hoặc local IP máy tính)
    }

    // Android:
    if (useUsb) {
      // Phải chạy lệnh: adb reverse tcp:8080 tcp:8080
      return baseUrlUsb; 
    }
    
    if (useNgrok) {
      return baseUrlNgrok;
    }

    // Mặc định cho Emulator
    return baseUrlLocal;
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
  static const String studentAttendanceReport = '/api/v1/attendance/student/report';
  static const String studentAttendanceDetail = '/api/v1/attendance/student/class/{className}/detail';

  // Schedule Request Endpoints
  static const String lecturerRequests = '/api/v1/lecturer/requests';
  static const String lecturerClasses = '/api/v1/lecturer/classes';
  static const String lecturerCheckConflicts = '/api/v1/lecturer/check-conflicts';
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
