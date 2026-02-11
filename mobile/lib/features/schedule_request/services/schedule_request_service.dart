import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/schedule_request_model.dart';
import '../models/create_request_models.dart';

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

  /// Get list of classes for current lecturer
  Future<List<String>> getClasses() async {
    try {
      final response = await _apiService.get(ApiConstants.lecturerClasses);
      if (response.statusCode == 200) {
        return List<String>.from(response.data);
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get slots for a specific class
  Future<List<ClassSlot>> getSlotsForClass(String className) async {
    try {
      final response = await _apiService.get(
        '${ApiConstants.lecturerClasses}/$className/slots',
      );
      if (response.statusCode == 200) {
        return (response.data as List)
            .map((json) => ClassSlot.fromJson(json))
            .toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Get room availability for a specific date and slot
  Future<List<RoomAvailability>> getRoomAvailability(String date, int slotNumber) async {
    try {
      final response = await _apiService.get(
        ApiConstants.roomsAvailability,
        queryParameters: {
          'date': date,
          'slotNumber': slotNumber,
        },
      );
      if (response.statusCode == 200) {
        return (response.data as List)
            .map((json) => RoomAvailability.fromJson(json))
            .toList();
      }
      return [];
    } catch (e) {
      rethrow;
    }
  }

  /// Create a new schedule request
  Future<ScheduleRequest?> createRequest(CreateRequestPayload payload) async {
    try {
      final response = await _apiService.post(
        ApiConstants.lecturerRequests,
        data: payload.toJson(),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return ScheduleRequest.fromJson(response.data);
      }
      return null;
    } catch (e) {
      rethrow;
    }
  }
  /// Check for conflicts (Lecturer, Pending Request, Student)
  Future<ConflictCheckResponse?> checkConflicts(
      String className, String date, int slotNumber, int originalSlotId) async {
    try {
      final response = await _apiService.get(
        '/api/lecturer/check-conflicts',
        queryParameters: {
          'className': className,
          'date': date,
          'slotNumber': slotNumber,
          'originalSlotId': originalSlotId,
        },
      );
      if (response.statusCode == 200) {
        return ConflictCheckResponse.fromJson(response.data);
      }
      return null;
    } catch (e) {
      // Return empty response on error (assume no conflict to avoid blocking)
      return ConflictCheckResponse(conflicts: [], hasConflict: false);
    }
  }
}

