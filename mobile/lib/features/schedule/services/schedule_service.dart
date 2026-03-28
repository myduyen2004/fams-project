import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/schedule_model.dart';

class ScheduleService {
  final ApiService _apiService = ApiService();

  Future<WeeklyTimetable?> getStudentSchedule(String studentId, {DateTime? date}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (date != null) {
        queryParams['date'] = DateFormat('yyyy-MM-dd').format(date);
      }

      final response = await _apiService.get(
        '${ApiConstants.studentSchedule}/$studentId',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        return WeeklyTimetable.fromJson(response.data);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  Future<WeeklyTimetable?> getLecturerSchedule(String lecturerId, {DateTime? date}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (date != null) {
        queryParams['date'] = DateFormat('yyyy-MM-dd').format(date);
      }

      final response = await _apiService.get(
        '${ApiConstants.lecturerSchedule}/$lecturerId',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        return WeeklyTimetable.fromJson(response.data);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  Future<List<Semester>> getSemesters() async {
    try {
      debugPrint('[ScheduleService] Fetching active semesters from: /api/v1/semesters/active');
      final response = await _apiService.get('/api/v1/semesters/active');
      
      if (response.statusCode == 200) {
        debugPrint('[ScheduleService] Fetch semesters success: ${response.data}');
        return (response.data as List).map((i) => Semester.fromJson(i)).toList();
      }
      debugPrint('[ScheduleService] Fetch semesters failed with status: ${response.statusCode}');
      return [];
    } catch (e) {
      debugPrint('[ScheduleService] Fetch semesters CRITICAL error: $e');
      rethrow;
    }
  }

  /// Get all slots for a student in a semester (for calendar export)
  Future<List<TimetableSlot>> getStudentSemesterSlots(String studentId, String semesterCode) async {
    try {
      final response = await _apiService.get(
        '${ApiConstants.studentSchedule}/$studentId/semester',
        queryParameters: {'semesterCode': semesterCode},
      );

      if (response.statusCode == 200) {
        return (response.data as List).map((i) => TimetableSlot.fromJson(i)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get all slots for a lecturer in a semester (for calendar export)
  Future<List<TimetableSlot>> getLecturerSemesterSlots(String lecturerId, String semesterCode) async {
    try {
      final response = await _apiService.get(
        '${ApiConstants.lecturerSchedule}/$lecturerId/semester',
        queryParameters: {'semesterCode': semesterCode},
      );

      if (response.statusCode == 200) {
        return (response.data as List).map((i) => TimetableSlot.fromJson(i)).toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  Future<AttendanceConfig> getAttendanceConfig() async {
    try {
      final response = await _apiService.get(ApiConstants.attendanceConfig);
      if (response.statusCode == 200) {
        return AttendanceConfig.fromJson(response.data);
      }
      return AttendanceConfig.defaultConfig();
    } catch (e) {
      return AttendanceConfig.defaultConfig();
    }
  }

  Future<dynamic> getStudentSubmission(int assignmentId) async {
    try {
      final response = await _apiService.get('/api/student/assignments/$assignmentId/submission');
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      debugPrint('[ScheduleService] Fetch submission failed: $e');
      return null;
    }
  }
}
