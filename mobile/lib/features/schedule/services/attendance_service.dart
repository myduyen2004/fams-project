import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../../face_attendance/models/attendance_report_model.dart';

class AttendanceService {
  final ApiService _apiService = ApiService();

  Future<bool> checkIn({
    required String qrCode,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final response = await _apiService.post(
        ApiConstants.checkIn,
        data: {
          'qrCode': qrCode,
          'latitude': latitude,
          'longitude': longitude,
        },
      );

      if (response.statusCode == 200) {
        return true;
      }
      return false;
    } catch (e) {
      // Handle error (e.g., show toast)
      rethrow;
    }
  }

  Future<StudentAttendanceSummaryResponse> getStudentAttendanceSummary({String? semesterCode}) async {
    try {
      final response = await _apiService.get(
        ApiConstants.studentAttendanceReport,
        queryParameters: semesterCode != null ? {'semesterCode': semesterCode} : null,
      );

      if (response.statusCode == 200) {
        return StudentAttendanceSummaryResponse.fromJson(response.data);
      }
      throw Exception('Failed to load attendance summary');
    } catch (e) {
      rethrow;
    }
  }

  Future<IndividualAttendanceDetail> getStudentAttendanceDetail(String className) async {
    try {
      final response = await _apiService.get(
        ApiConstants.studentAttendanceDetail.replaceFirst('{className}', className),
      );

      if (response.statusCode == 200) {
        return IndividualAttendanceDetail.fromJson(response.data);
      }
      throw Exception('Failed to load attendance detail');
    } catch (e) {
      rethrow;
    }
  }
}
