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

  Future<List<Semester>> getSemesters() async {
    try {
      final response = await _apiService.get('/api/v1/semesters/active');
      if (response.statusCode == 200) {
        return (response.data as List).map((i) => Semester.fromJson(i)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
