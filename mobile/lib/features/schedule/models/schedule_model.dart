import 'package:intl/intl.dart';

class TimetableSlot {
  final int? id;
  final String? className;
  final String? courseCode;
  final String? courseName;
  final int? lecturerId;
  final String? lecturerName;
  final int? assignmentId;
  final String? assignmentTitle;
  final String? assignmentDescription;
  final String? assignmentReferenceUrl;
  final String? assignmentReferenceName;
  final DateTime? assignmentDueDate;
  final String? roomCode;
  final String? roomName;
  final DateTime date;
  final int dayOfWeek;
  final int slotNumber;
  final String? startTime;
  final String? endTime;
  final String? status;
  final String? attendanceStatus;
  final DateTime? checkInTime;
  final int? absentThresholdMinutes;
  final String? lecturerAvatar;

  TimetableSlot({
    this.id,
    this.className,
    this.courseCode,
    this.courseName,
    this.lecturerId,
    this.lecturerName,
    this.assignmentId,
    this.assignmentTitle,
    this.assignmentDescription,
    this.assignmentReferenceUrl,
    this.assignmentReferenceName,
    this.assignmentDueDate,
    this.roomCode,
    this.roomName,
    required this.date,
    required this.dayOfWeek,
    required this.slotNumber,
    this.startTime,
    this.endTime,
    this.status,
    this.attendanceStatus,
    this.checkInTime,
    this.absentThresholdMinutes,
    this.lecturerAvatar,
  });

  factory TimetableSlot.fromJson(Map<String, dynamic> json) {
    return TimetableSlot(
      id: json['id'],
      className: json['className'],
      courseCode: json['courseCode'],
      courseName: json['courseName'],
      lecturerId: json['lecturerId'],
      lecturerName: json['lecturerName'],
      assignmentId: json['assignmentId'],
      assignmentTitle: json['assignmentTitle'],
      assignmentDescription: json['assignmentDescription'],
      assignmentReferenceUrl: json['assignmentReferenceUrl'],
      assignmentReferenceName: json['assignmentReferenceName'],
      assignmentDueDate: json['assignmentDueDate'] != null ? DateTime.parse(json['assignmentDueDate']) : null,
      roomCode: json['roomCode'],
      roomName: json['roomName'],
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      dayOfWeek: json['dayOfWeek'] ?? 0,
      slotNumber: json['slotNumber'] ?? 0,
      startTime: json['startTime'],
      endTime: json['endTime'],
      status: json['status'],
      attendanceStatus: json['attendanceStatus'],
      checkInTime: json['checkInTime'] != null ? DateTime.parse(json['checkInTime']) : null,
      absentThresholdMinutes: json['absentThresholdMinutes'],
      lecturerAvatar: json['lecturerAvatar'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'className': className,
      'courseCode': courseCode,
      'courseName': courseName,
      'lecturerId': lecturerId,
      'lecturerName': lecturerName,
      'assignmentId': assignmentId,
      'assignmentTitle': assignmentTitle,
      'assignmentDescription': assignmentDescription,
      'assignmentReferenceUrl': assignmentReferenceUrl,
      'assignmentReferenceName': assignmentReferenceName,
      'assignmentDueDate': assignmentDueDate?.toIso8601String(),
      'roomCode': roomCode,
      'roomName': roomName,
      'date': DateFormat('yyyy-MM-dd').format(date),
      'dayOfWeek': dayOfWeek,
      'slotNumber': slotNumber,
      'startTime': startTime,
      'endTime': endTime,
      'status': status,
      'attendanceStatus': attendanceStatus,
      'absentThresholdMinutes': absentThresholdMinutes,
      'lecturerAvatar': lecturerAvatar,
    };
  }
}

class DailyTimetable {
  final DateTime date;
  final int dayOfWeek;
  final String dayName;
  final List<TimetableSlot> slots;

  DailyTimetable({
    required this.date,
    required this.dayOfWeek,
    required this.dayName,
    required this.slots,
  });

  factory DailyTimetable.fromJson(Map<String, dynamic> json) {
    return DailyTimetable(
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      dayOfWeek: json['dayOfWeek'] ?? 0,
      dayName: json['dayName'] ?? '',
      slots: (json['slots'] as List? ?? [])
          .map((i) => TimetableSlot.fromJson(i))
          .toList(),
    );
  }
}

class WeeklyTimetable {
  final DateTime weekStartDate;
  final DateTime weekEndDate;
  final List<DailyTimetable> days;

  WeeklyTimetable({
    required this.weekStartDate,
    required this.weekEndDate,
    required this.days,
  });

  factory WeeklyTimetable.fromJson(Map<String, dynamic> json) {
    return WeeklyTimetable(
      weekStartDate: json['weekStartDate'] != null
          ? DateTime.parse(json['weekStartDate'])
          : DateTime.now(),
      weekEndDate: json['weekEndDate'] != null
          ? DateTime.parse(json['weekEndDate'])
          : DateTime.now(),
      days: (json['days'] as List? ?? [])
          .map((i) => DailyTimetable.fromJson(i))
          .toList(),
    );
  }
}
class Semester {
  final String code;
  final String name;
  final DateTime? startDate;
  final DateTime? endDate;
  final bool isPublished;
  final String? status;

  Semester({
    required this.code,
    required this.name,
    this.startDate,
    this.endDate,
    required this.isPublished,
    this.status,
  });

  factory Semester.fromJson(Map<String, dynamic> json) {
    try {
      return Semester(
        code: json['code'] ?? '',
        name: json['name'] ?? '',
        startDate: json['startDate'] != null ? DateTime.tryParse(json['startDate']) : null,
        endDate: json['endDate'] != null ? DateTime.tryParse(json['endDate']) : null,
        isPublished: json['isPublished'] ?? false,
        status: json['status'],
      );
    } catch (e) {
      print('Error parsing Semester JSON: $e');
      return Semester(
        code: json['code'] ?? 'ERR',
        name: json['name'] ?? 'Error Parsing',
        isPublished: false,
      );
    }
  }
}

class AttendanceConfig {
  final bool faceRecognitionEnabled;
  final bool wifiLocationEnabled;
  final bool manualEnabled;
  final int absentThresholdMinutes;
  final int maxAttempts;

  AttendanceConfig({
    required this.faceRecognitionEnabled,
    required this.wifiLocationEnabled,
    required this.manualEnabled,
    required this.absentThresholdMinutes,
    required this.maxAttempts,
  });

  factory AttendanceConfig.fromJson(Map<String, dynamic> json) {
    return AttendanceConfig(
      faceRecognitionEnabled: json['faceRecognitionEnabled'] ?? true,
      wifiLocationEnabled: json['wifiLocationEnabled'] ?? true,
      manualEnabled: json['manualEnabled'] ?? true,
      absentThresholdMinutes: json['absentThresholdMinutes'] ?? 15,
      maxAttempts: json['maxAttempts'] ?? 5,
    );
  }

  factory AttendanceConfig.defaultConfig() {
    return AttendanceConfig(
      faceRecognitionEnabled: true,
      wifiLocationEnabled: true,
      manualEnabled: true,
      absentThresholdMinutes: 15,
      maxAttempts: 5,
    );
  }
}
