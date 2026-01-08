class AppConfig {
  static const String appName = 'FAMS Mobile';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String baseUrl = 'http://10.0.2.2:8080/api'; // Android emulator
  // static const String baseUrl = 'http://localhost:8080/api'; // iOS simulator
  // static const String baseUrl = 'https://api.fams-edu.online/api'; // Production
  
  // Timeouts
  static const int connectTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000;
  
  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String userDataKey = 'user_data';
  static const String refreshTokenKey = 'refresh_token';
}
