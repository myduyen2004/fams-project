import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/schedule_request_model.dart';

/// Service for Schedule Request API calls
class ScheduleRequestService {
  final ApiService _apiService = ApiService();

  /// Get paginated list of requests for current lecturer
  Future<ScheduleRequestPage?> getMyRequests({int page = 0, int size = 10}) async {
    try {
      final response = await _apiService.get(
        ApiConstants.lecturerRequests,
        queryParameters: {
          'page': page,
          'size': size,
        },
      );

      if (response.statusCode == 200) {
        return ScheduleRequestPage.fromJson(response.data);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }

  /// Get request detail by ID
  Future<ScheduleRequest?> getRequestById(int id) async {
    try {
      final response = await _apiService.get(
        '${ApiConstants.lecturerRequests}/$id',
      );

      if (response.statusCode == 200) {
        return ScheduleRequest.fromJson(response.data);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }
}
