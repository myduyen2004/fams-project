import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../models/notification_model.dart';
import '../services/notification_service.dart';
import '../../auth/controllers/auth_controller.dart';
import '../services/fcm_service.dart';

class NotificationController extends GetxController {
  final NotificationService _notificationService = NotificationService();
  
  final RxList<NotificationModel> notifications = <NotificationModel>[].obs;
  final RxInt unreadCount = 0.obs;
  final RxBool isLoading = false.obs;
  
  @override
  void onInit() {
    super.onInit();
    
    // Set up listener for authentication status
    final authController = Get.find<AuthController>();
    
    // Listen for authentication changes
    ever(authController.isAuthenticated, (bool authenticated) {
      if (authenticated) {
        debugPrint('NotificationController: User authenticated, fetching notifications...');
        fetchNotifications();
        fetchUnreadCount();
      } else {
        notifications.clear();
        unreadCount.value = 0;
      }
    });

    // Initial fetch if already authenticated
    if (authController.isAuthenticated.value) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }

  Future<void> onNewPushNotification() async {
    await Future.wait([fetchNotifications(), fetchUnreadCount()]);
  }

  Future<void> fetchNotifications() async {
    final authController = Get.find<AuthController>();
    if (!authController.isAuthenticated.value) return;

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
    final authController = Get.find<AuthController>();
    if (!authController.isAuthenticated.value) return;

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
          notifications.refresh(); // Trigger Obx UI update
          unreadCount.value = (unreadCount.value - 1).clamp(0, 999);
        }
      }
      
      if (Get.isRegistered<FcmService>()) {
        await FcmService.to.updateUnreadBadge(unreadCount.value);
        await FcmService.to.cancelNotification(id);
      }
      
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
      
      if (Get.isRegistered<FcmService>()) {
        await FcmService.to.updateUnreadBadge(0);
        await FcmService.to.cancelAllNotifications();
      }
      
    } catch (e) {
      print('Error marking all as read: $e');
    }
  }
}
