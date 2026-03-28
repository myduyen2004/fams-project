import 'package:flutter/foundation.dart';
import '../../../core/services/api_service.dart';
import '../models/student_grade_model.dart';

/// Service for Student Grade API calls
/// Uses the same endpoints as the web frontend:
/// - GET /api/v1/students/{studentId}/courses
/// - GET /api/v1/students/{studentId}/grades?className=X
class StudentGradeService {
  final ApiService _apiService = ApiService();

  /// Get list of courses the student is enrolled in
  /// Response fields: courseId, courseCode, courseName, className,
  ///                  semesterId, semesterCode, semesterName
  Future<List<StudentCourseOption>> getMyCourses(String studentId) async {
    try {
      final response = await _apiService.get(
        '/api/v1/students/$studentId/courses',
      );
      if (response.statusCode == 200) {
        final rawList = response.data;
        // Handle both List and Map-wrapped response
        final List<dynamic> list =
            rawList is List ? rawList : (rawList['content'] as List? ?? []);
        debugPrint('[StudentGradeService] getMyCourses => ${list.length} items');
        return list
            .map((e) => StudentCourseOption.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      debugPrint(
          '[StudentGradeService] getMyCourses bad status: ${response.statusCode}');
    } catch (e) {
      debugPrint('[StudentGradeService] getMyCourses error: $e');
    }
    return [];
  }

  /// Get detailed grade breakdown for a specific class
  /// Response: StudentGradeDetailResponse JSON
  Future<StudentGradeDetailResponse?> getGradeDetail(
      String studentId, String className) async {
    try {
      final response = await _apiService.get(
        '/api/v1/students/$studentId/grades',
        queryParameters: {'className': className},
      );
      debugPrint(
          '[StudentGradeService] getGradeDetail status: ${response.statusCode}');
      if (response.statusCode == 200 &&
          response.data is Map<String, dynamic>) {
        return StudentGradeDetailResponse.fromJson(
            response.data as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('[StudentGradeService] getGradeDetail error: $e');
    }
    return null;
  }
}
