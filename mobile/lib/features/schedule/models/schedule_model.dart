import 'package:intl/intl.dart';

class TimetableSlot {
  final int? id;
  final String? className;
  final String? courseCode;
  final String? courseName;
  final String? lecturerName;
  final String? roomCode;
  final String? roomName;
  final DateTime date;
  final int dayOfWeek;
  final int slotNumber;
  final String? startTime;
  final String? endTime;
  final String? status;
  final String? attendanceStatus;

  TimetableSlot({
    this.id,
    this.className,
    this.courseCode,
    this.courseName,
    this.lecturerName,
    this.roomCode,
    this.roomName,
    required this.date,
    required this.dayOfWeek,
    required this.slotNumber,
    this.startTime,
    this.endTime,
    this.status,
    this.attendanceStatus,
  });

  factory TimetableSlot.fromJson(Map<String, dynamic> json) {
    return TimetableSlot(
      id: json['id'],
      className: json['className'],
      courseCode: json['courseCode'],
      courseName: json['courseName'],
      lecturerName: json['lecturerName'],
      roomCode: json['roomCode'],
      roomName: json['roomName'],
      date: json['date'] != null ? DateTime.parse(json['date']) : DateTime.now(),
      dayOfWeek: json['dayOfWeek'] ?? 0,
      slotNumber: json['slotNumber'] ?? 0,
      startTime: json['startTime'],
      endTime: json['endTime'],
      status: json['status'],
      attendanceStatus: json['attendanceStatus'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'className': className,
      'courseCode': courseCode,
      'courseName': courseName,
      'lecturerName': lecturerName,
      'roomCode': roomCode,
      'roomName': roomName,
      'date': DateFormat('yyyy-MM-dd').format(date),
      'dayOfWeek': dayOfWeek,
      'slotNumber': slotNumber,
      'startTime': startTime,
      'endTime': endTime,
      'status': status,
      'attendanceStatus': attendanceStatus,
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

  Semester({
    required this.code,
    required this.name,
    this.startDate,
    this.endDate,
    required this.isPublished,
  });

  factory Semester.fromJson(Map<String, dynamic> json) {
    return Semester(
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      startDate: json['startDate'] != null ? DateTime.parse(json['startDate']) : null,
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
      isPublished: json['isPublished'] ?? false,
    );
  }
}
