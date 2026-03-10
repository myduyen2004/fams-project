/// User Model
class User {
  final String id;
  final String fullName;
  final String username;
  final String email;
  final String role; // LECTURER or STUDENT
  final String? avatarUrl;
  final bool isPasswordChanged;
  final String? phone;
  final DateTime? dob;

  // Profile Info (display names)
  final String? major;
  final String? specialization;
  final String? subSpecialization;
  final String? department;
  final String? expertise;
  final String? faceDataStatus; // REGISTERED, NOT_REGISTERED, etc.

  // Profile IDs (needed for dependent dropdowns)
  final int? majorId;
  final int? specializationId;
  final int? subSpecializationId;

  User({
    required this.id,
    required this.fullName,
    required this.username,
    required this.email,
    required this.role,
    this.avatarUrl,
    this.isPasswordChanged = true,
    this.phone,
    this.dob,
    this.major,
    this.specialization,
    this.subSpecialization,
    this.department,
    this.expertise,
    this.faceDataStatus,
    this.majorId,
    this.specializationId,
    this.subSpecializationId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      avatarUrl: json['avatar'] ?? json['avatarUrl'],
      isPasswordChanged: json['isPasswordChanged'] ?? true,
      phone: json['phone'],
      dob: json['dob'] != null ? DateTime.tryParse(json['dob'].toString()) : null,
      major: json['major'],
      specialization: json['specialization'],
      subSpecialization: json['subSpecialization'],
      department: json['department'],
      expertise: json['expertise'],
      faceDataStatus: json['faceDataStatus'],
      majorId: json['majorId'] as int?,
      specializationId: json['specializationId'] as int?,
      subSpecializationId: json['subSpecializationId'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'fullName': fullName,
      'username': username,
      'email': email,
      'role': role,
      'avatar': avatarUrl,
      'avatarUrl': avatarUrl,
      'isPasswordChanged': isPasswordChanged,
      'phone': phone,
      'dob': dob?.toIso8601String(),
      'major': major,
      'specialization': specialization,
      'subSpecialization': subSpecialization,
      'department': department,
      'expertise': expertise,
      'faceDataStatus': faceDataStatus,
      'majorId': majorId,
      'specializationId': specializationId,
      'subSpecializationId': subSpecializationId,
    };
  }

  bool get isLecturer => role.toUpperCase() == 'LECTURER';
  bool get isStudent => role.toUpperCase() == 'STUDENT';
  bool get hasFaceRegistered => faceDataStatus?.toUpperCase() == 'REGISTERED';
}
