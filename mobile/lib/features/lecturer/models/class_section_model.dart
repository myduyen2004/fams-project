/// Models for lecturer class list feature

class ClassSection {
  final String className;
  final String courseCode;
  final String courseName;
  final String semesterCode;
  final String semesterName;
  final String? lecturerName;
  final String? enrollmentInfo; // e.g., "28 / 30"
  final int? slots;
  final String status; // UPCOMING, ONGOING, FINISHED
  final bool hasChatGroup;
  final int? chatGroupId;

  ClassSection({
    required this.className,
    required this.courseCode,
    required this.courseName,
    required this.semesterCode,
    required this.semesterName,
    this.lecturerName,
    this.enrollmentInfo,
    this.slots,
    required this.status,
    this.hasChatGroup = false,
    this.chatGroupId,
  });

  factory ClassSection.fromJson(Map<String, dynamic> json) {
    return ClassSection(
      className: json['className'] ?? '',
      courseCode: json['courseCode'] ?? '',
      courseName: json['courseName'] ?? '',
      semesterCode: json['semesterCode'] ?? '',
      semesterName: json['semesterName'] ?? '',
      lecturerName: json['lecturerName'],
      enrollmentInfo: json['enrollmentInfo'],
      slots: json['slots'] != null
          ? int.tryParse(json['slots'].toString())
          : null,
      status: json['status'] ?? 'ONGOING',
      hasChatGroup: json['hasChatGroup'] ?? false,
      chatGroupId: json['chatGroupId'] != null
          ? int.tryParse(json['chatGroupId'].toString())
          : null,
    );
  }

  /// Translated status for display
  String get displayStatus {
    switch (status) {
      case 'ONGOING':
        return 'ĐANG DẠY';
      case 'UPCOMING':
        return 'SẮP TỚI';
      case 'FINISHED':
        return 'KẾT THÚC';
      default:
        return status;
    }
  }

  /// Check status for styling
  bool get isOngoing => status == 'ONGOING';
  bool get isUpcoming => status == 'UPCOMING';
  bool get isFinished => status == 'FINISHED';
}

class Enrollment {
  final int id;
  final String className;
  final String studentCode;
  final String studentName;
  final String? avatar;
  final String status;
  final String? email;
  final String? phone;
  final String? dob;
  final String? major;
  final String? specialization;
  final String? subSpecialization;

  Enrollment({
    required this.id,
    required this.className,
    required this.studentCode,
    required this.studentName,
    this.avatar,
    required this.status,
    this.email,
    this.phone,
    this.dob,
    this.major,
    this.specialization,
    this.subSpecialization,
  });

  factory Enrollment.fromJson(Map<String, dynamic> json) {
    return Enrollment(
      id: int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      className: json['className'] ?? '',
      studentCode: json['studentCode'] ?? '',
      studentName: json['studentName'] ?? '',
      avatar: json['avatar'],
      status: json['status'] ?? 'ACTIVE',
      email: json['email'],
      phone: json['phone'],
      dob: json['dob'],
      major: json['major'],
      specialization: json['specialization'],
      subSpecialization: json['subSpecialization'],
    );
  }
}
