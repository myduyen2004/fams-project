class StudentAttendanceResponse {
  final int studentId;
  final String studentCode;
  final String fullName;
  final String? avatarUrl;
  final String status;
  final String? checkInMethod;
  final String? checkInTime;
  final String? capturedFaceUrl;

  StudentAttendanceResponse({
    required this.studentId,
    required this.studentCode,
    required this.fullName,
    this.avatarUrl,
    required this.status,
    this.checkInMethod,
    this.checkInTime,
    this.capturedFaceUrl,
  });

  factory StudentAttendanceResponse.fromJson(Map<String, dynamic> json) {
    return StudentAttendanceResponse(
      studentId: json['studentId'] ?? 0,
      studentCode: json['studentCode'] ?? '',
      fullName: json['fullName'] ?? '',
      avatarUrl: json['avatarUrl'],
      status: json['status'] ?? 'NOT_STARTED',
      checkInMethod: json['checkInMethod'],
      checkInTime: json['checkInTime'],
      capturedFaceUrl: json['capturedFaceUrl'],
    );
  }

  /// Display status in Vietnamese
  String get displayStatus {
    switch (status) {
      case 'PRESENT':
        return 'Có mặt';
      case 'ABSENT':
        return 'Vắng mặt';
      case 'EXCUSED':
        return 'Vắng có phép';
      default:
        return 'Chưa điểm danh';
    }
  }
}

class SessionDetailResponse {
  final int sessionId;
  final int slotId;
  final String courseCode;
  final String courseName;
  final String className;
  final String roomCode;
  final String lecturerName;
  final String status;
  final String? openedAt;
  final String? closedAt;
  final String? date;
  final String? startTime;
  final String? endTime;
  final int totalStudents;
  final int presentCount;
  final List<StudentAttendanceResponse> students;

  SessionDetailResponse({
    required this.sessionId,
    required this.slotId,
    required this.courseCode,
    required this.courseName,
    required this.className,
    required this.roomCode,
    required this.lecturerName,
    required this.status,
    this.openedAt,
    this.closedAt,
    this.date,
    this.startTime,
    this.endTime,
    required this.totalStudents,
    required this.presentCount,
    required this.students,
  });

  factory SessionDetailResponse.fromJson(Map<String, dynamic> json) {
    return SessionDetailResponse(
      sessionId: json['sessionId'] ?? 0,
      slotId: json['slotId'] ?? 0,
      courseCode: json['courseCode'] ?? '',
      courseName: json['courseName'] ?? '',
      className: json['className'] ?? '',
      roomCode: json['roomCode'] ?? '',
      lecturerName: json['lecturerName'] ?? '',
      status: json['status'] ?? '',
      openedAt: json['openedAt'],
      closedAt: json['closedAt'],
      date: json['date'],
      startTime: json['startTime'],
      endTime: json['endTime'],
      totalStudents: json['totalStudents'] ?? 0,
      presentCount: json['presentCount'] ?? 0,
      students: (json['students'] as List? ?? [])
          .map((item) => StudentAttendanceResponse.fromJson(item))
          .toList(),
    );
  }
}
