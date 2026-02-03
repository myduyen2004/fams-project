import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/class_section_model.dart';

class LecturerService {
  final ApiService _apiService = ApiService();

  /// Get classes for a lecturer in a semester
  Future<List<ClassSection>> getClasses(String semesterCode, String lecturerId) async {
    try {
      final response = await _apiService.get(
        '/api/v1/class-sections/semester/$semesterCode',
        queryParameters: {
          'lecturerId': lecturerId,
          'size': '100', // Get all classes
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        // Handle paginated response
        if (data is Map && data.containsKey('content')) {
          return (data['content'] as List)
              .map((item) => ClassSection.fromJson(item))
              .toList();
        } else if (data is List) {
          return data.map((item) => ClassSection.fromJson(item)).toList();
        }
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get students enrolled in a class
  Future<List<Enrollment>> getStudents(String className) async {
    try {
      final response = await _apiService.get(
        '/api/v1/class-sections/$className/enrollments',
      );

      if (response.statusCode == 200) {
        return (response.data as List)
            .map((item) => Enrollment.fromJson(item))
            .toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }
}
