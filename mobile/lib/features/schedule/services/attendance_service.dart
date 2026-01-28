import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';

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
}
