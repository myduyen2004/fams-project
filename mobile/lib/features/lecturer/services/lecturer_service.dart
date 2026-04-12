import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/class_section_model.dart';
import '../models/attendance_session_model.dart';

class LecturerService {
  final ApiService _apiService = ApiService();

  /// Get classes for a lecturer in a semester
  Future<List<ClassSection>> getClasses(
    String semesterCode,
    String lecturerId,
  ) async {
    try {
      print(
        '[LecturerService] getClasses: /api/v1/class-sections/semester/$semesterCode?lecturerId=$lecturerId',
      );
      final response = await _apiService.get(
        '/api/v1/class-sections/semester/$semesterCode',
        queryParameters: {
          'lecturerId': lecturerId,
          'size': '100', // Get all classes
        },
      );

      print('[LecturerService] Response status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = response.data;
        print('[LecturerService] Response data type: ${data.runtimeType}');
        // Handle paginated response
        if (data is Map && data.containsKey('content')) {
          final list = data['content'] as List;
          print(
            '[LecturerService] Found ${list.length} classes in paginated response',
          );
          return list.map((item) => ClassSection.fromJson(item)).toList();
        } else if (data is List) {
          print(
            '[LecturerService] Found ${data.length} classes in list response',
          );
          return data.map((item) => ClassSection.fromJson(item)).toList();
        }
      }
      print('[LecturerService] Unexpected status code or empty data');
      return [];
    } catch (e) {
      print('[LecturerService] Error in getClasses: $e');
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

  /// Create a chat group for a class
  Future<Map<String, dynamic>> createChatGroup(String className) async {
    try {
      final response = await _apiService.post(
        '/api/v1/chat-groups/class/$className',
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data as Map<String, dynamic>;
      }
      throw 'Không thể tạo nhóm chat (Status: ${response.statusCode})';
    } catch (e) {
      rethrow;
    }
  }

  /// Get public lecturer profile
  Future<Map<String, dynamic>> getLecturerProfile(int lecturerId) async {
    try {
      final response = await _apiService.get('/api/auth/user/$lecturerId/profile');
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      throw 'Không thể tải thông tin giảng viên';
    } catch (e) {
      print('[LecturerService] Error in getLecturerProfile: $e');
      rethrow;
    }
  }

  /// Get attendance detail for a specific slot
  Future<SessionDetailResponse> getSlotAttendanceDetail(int slotId) async {
    try {
      final response = await _apiService.get(
        '/api/v1/attendance/session/slot/$slotId',
      );

      if (response.statusCode == 200) {
        return SessionDetailResponse.fromJson(response.data);
      }
      throw 'Không thể tải dữ liệu điểm danh (Status: ${response.statusCode})';
    } catch (e) {
      print('[LecturerService] Error in getSlotAttendanceDetail: $e');
      rethrow;
    }
  }
}
