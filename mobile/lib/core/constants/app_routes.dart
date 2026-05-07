/// App Routes - GetX Navigation Routes
class AppRoutes {
  AppRoutes._();

  static const String splash = '/';
  static const String login = '/login';
  static const String forgotPassword = '/forgot-password';
  static const String otpVerification = '/otp-verification';
  static const String resetPassword = '/reset-password';
  static const String home = '/home';
  static const String changePasswordRequired = '/change-password-required';

  // Lecturer Routes
  static const String lecturerRequests = '/lecturer/requests';
  static const String lecturerRequestDetail = '/lecturer/requests/:id';
  static const String lecturerCreateRequest = '/lecturer/requests/create';
  static const String lecturerClasses = '/lecturer/classes';

  // Student Academic Request Routes
  static const String studentAcademicRequests = '/student/academic-requests';
  static const String studentAcademicRequestCreate = '/student/academic-requests/create';

  // AI Chat Route
  static const String aiChat = '/ai-chatbot';

  // Attendance Report Routes
  static const String studentAttendanceReport = '/student/attendance-report';
  static const String studentAttendanceDetail = '/student/attendance-detail';

  // Student Grade Routes
  static const String studentGradeSemester = '/student/grade-semester';
  static const String studentGradeDetail = '/student/grade-detail';
}
