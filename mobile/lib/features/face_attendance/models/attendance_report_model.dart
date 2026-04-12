class StudentAttendanceSummaryResponse {
  final String studentName;
  final String studentCode;
  final String semesterName;
  final List<ClassAttendanceSummary> classSummaries;

  StudentAttendanceSummaryResponse({
    required this.studentName,
    required this.studentCode,
    required this.semesterName,
    required this.classSummaries,
  });

  factory StudentAttendanceSummaryResponse.fromJson(Map<String, dynamic> json) {
    return StudentAttendanceSummaryResponse(
      studentName: json['studentName'] ?? '',
      studentCode: json['studentCode'] ?? '',
      semesterName: json['semesterName'] ?? '',
      classSummaries: (json['classSummaries'] as List?)
              ?.map((i) => ClassAttendanceSummary.fromJson(i))
              .toList() ??
          [],
    );
  }
}

class ClassAttendanceSummary {
  final String className;
  final String courseCode;
  final String courseName;
  final String lecturerName;
  final int totalSlots;
  final int totalSessionsHeld;
  final int presentCount;
  final int unexcusedAbsentCount;
  final int excusedAbsentCount;
  final double attendancePercentage;
  final double absentPercentage;
  final DateTime? startDate;
  final DateTime? endDate;

  ClassAttendanceSummary({
    required this.className,
    required this.courseCode,
    required this.courseName,
    required this.lecturerName,
    required this.totalSlots,
    required this.totalSessionsHeld,
    required this.presentCount,
    required this.unexcusedAbsentCount,
    required this.excusedAbsentCount,
    required this.attendancePercentage,
    required this.absentPercentage,
    this.startDate,
    this.endDate,
  });

  factory ClassAttendanceSummary.fromJson(Map<String, dynamic> json) {
    return ClassAttendanceSummary(
      className: json['className'] ?? '',
      courseCode: json['courseCode'] ?? '',
      courseName: json['courseName'] ?? '',
      lecturerName: json['lecturerName'] ?? '',
      totalSlots: json['totalSlots'] ?? 0,
      totalSessionsHeld: json['totalSessionsHeld'] ?? 0,
      presentCount: json['presentCount'] ?? 0,
      unexcusedAbsentCount: json['unexcusedAbsentCount'] ?? 0,
      excusedAbsentCount: json['excusedAbsentCount'] ?? 0,
      attendancePercentage: (json['attendancePercentage'] as num?)?.toDouble() ?? 0.0,
      absentPercentage: (json['absentPercentage'] as num?)?.toDouble() ?? 0.0,
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate']) : null,
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
    );
  }
}

class IndividualAttendanceDetail {
  final String className;
  final String courseCode;
  final String courseName;
  final List<IndividualSlotAttendance> slots;

  IndividualAttendanceDetail({
    required this.className,
    required this.courseCode,
    required this.courseName,
    required this.slots,
  });

  factory IndividualAttendanceDetail.fromJson(Map<String, dynamic> json) {
    return IndividualAttendanceDetail(
      className: json['className'] ?? '',
      courseCode: json['courseCode'] ?? '',
      courseName: json['courseName'] ?? '',
      slots: (json['slots'] as List?)
              ?.map((i) => IndividualSlotAttendance.fromJson(i))
              .toList() ??
          [],
    );
  }
}

class IndividualSlotAttendance {
  final int? slotId;
  final int? slotIndex;
  final DateTime? date;
  final String? startTime;
  final String? endTime;
  final String? roomCode;
  final String status; // 'PRESENT', 'ABSENT', 'EXCUSED', 'FUTURE'
  final String lecturerName;

  IndividualSlotAttendance({
    this.slotId,
    this.slotIndex,
    this.date,
    this.startTime,
    this.endTime,
    this.roomCode,
    required this.status,
    required this.lecturerName,
  });

  factory IndividualSlotAttendance.fromJson(Map<String, dynamic> json) {
    return IndividualSlotAttendance(
      slotId: json['slotId'],
      slotIndex: json['slotIndex'],
      date: json['date'] != null ? DateTime.parse(json['date']) : null,
      startTime: json['startTime'],
      endTime: json['endTime'],
      roomCode: json['roomCode'],
      status: json['status'] ?? 'FUTURE',
      lecturerName: json['lecturerName'] ?? '',
    );
  }
}
