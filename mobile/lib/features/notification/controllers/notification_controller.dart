import 'package:get/get.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';
import '../services/notification_polling_service.dart';

class NotificationController extends GetxController {
  final NotificationService _notificationService = NotificationService();
  final NotificationPollingService _pollingService = NotificationPollingService();
  
  final RxList<NotificationModel> notifications = <NotificationModel>[].obs;
  final RxInt unreadCount = 0.obs;
  final RxBool isLoading = false.obs;
  
  @override
  void onInit() {
    super.onInit();
    // Listen to polling stream
    _pollingService.unreadCountStream.listen((count) {
      unreadCount.value = count;
    });
    
    // Start polling when controller is initialized
    // Usually called after login
    startPolling();
    fetchNotifications(); // Load initial list
  }
  
  @override
  void onClose() {
    stopPolling();
    super.onClose();
  }
  
  void startPolling() {
    _pollingService.startPolling();
    fetchUnreadCount(); // Fetch immediately
  }
  
  void stopPolling() {
    _pollingService.stopPolling();
  }

  Future<void> fetchNotifications() async {
    try {
      isLoading.value = true;
      final result = await _notificationService.getNotifications();
      notifications.assignAll(result);
    } catch (e) {
      print('Error fetching notifications: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> fetchUnreadCount() async {
    try {
      final count = await _notificationService.getUnreadCount();
      unreadCount.value = count;
    } catch (e) {
      print('Error fetching unread count: $e');
    }
  }

  Future<void> markAsRead(int id) async {
    try {
      await _notificationService.markAsRead(id);
      
      // Update local state
      final index = notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        final notification = notifications[index];
        if (!notification.isRead) {
          notifications[index] = notification.copyWith(isRead: true);
          unreadCount.value = (unreadCount.value - 1).clamp(0, 999);
        }
      }
      
      // Refresh badge (System Badge)
      _pollingService.refresh();
      
      // Cancel system notification if exists
      _pollingService.cancelNotification(id);
      
    } catch (e) {
      print('Error marking as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _notificationService.markAllAsRead();
      
      // Update local state
      notifications.value = notifications.map((n) {
        return n.copyWith(isRead: true);
      }).toList();
      unreadCount.value = 0;
      
      // Refresh badge (System Badge)
      _pollingService.refresh();
      
    } catch (e) {
      print('Error marking all as read: $e');
    }
  }
}
