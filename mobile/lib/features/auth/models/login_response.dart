/// Login Response Model
class LoginResponse {
  final String token;
  final String? refreshToken;
  final Map<String, dynamic> user;

  LoginResponse({
    required this.token,
    this.refreshToken,
    required this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      token: json['token'] ?? json['accessToken'] ?? '',
      refreshToken: json['refreshToken'],
      user: json['user'] ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'refreshToken': refreshToken,
      'user': user,
    };
  }
}
