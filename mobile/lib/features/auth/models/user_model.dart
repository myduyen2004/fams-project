/// User Model
class User {
  final String id;
  final String fullName;
  final String username;
  final String email;
  final String role; // LECTURER or STUDENT
  final String? avatarUrl;

  User({
    required this.id,
    required this.fullName,
    required this.username,
    required this.email,
    required this.role,
    this.avatarUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      avatarUrl: json['avatarUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'username': username,
      'email': email,
      'role': role,
      'avatarUrl': avatarUrl,
    };
  }

  bool get isLecturer => role.toUpperCase() == 'LECTURER';
  bool get isStudent => role.toUpperCase() == 'STUDENT';
}
