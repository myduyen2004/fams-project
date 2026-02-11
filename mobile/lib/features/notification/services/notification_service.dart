import 'package:dio/dio.dart';
import '../../../core/services/api_service.dart';
import '../models/notification_model.dart';

class NotificationService {
  final ApiService _apiService = ApiService();

  /// Get list of notifications
  Future<List<NotificationModel>> getNotifications() async {
    try {
      final response = await _apiService.get('/api/dashboard/notifications');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => NotificationModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('Error fetching notifications: $e');
      rethrow;
    }
  }

  /// Get unread notification count
  Future<int> getUnreadCount() async {
    try {
      final response =
          await _apiService.get('/api/dashboard/notifications/unread-count');
      if (response.statusCode == 200) {
        return response.data['count'] ?? 0;
      }
      return 0;
    } catch (e) {
      print('Error fetching unread count: $e');
      return 0;
    }
  }

  /// Get notification by ID
  Future<NotificationModel?> getNotificationById(int id) async {
    try {
      final response = await _apiService.get('/api/dashboard/notifications/$id');
      if (response.statusCode == 200) {
        return NotificationModel.fromJson(response.data);
      }
      return null;
    } catch (e) {
      print('Error fetching notification detail: $e');
      return null;
    }
  }

  /// Mark notification as read
  Future<void> markAsRead(int id) async {
    try {
      await _apiService.post('/api/dashboard/notifications/$id/read');
    } catch (e) {
      print('Error marking notification as read: $e');
      rethrow;
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    try {
      await _apiService.post('/api/dashboard/notifications/read-all');
    } catch (e) {
      print('Error marking all notifications as read: $e');
      rethrow;
    }
  }
}
