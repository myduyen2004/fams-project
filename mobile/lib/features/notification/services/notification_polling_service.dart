import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:get/get.dart';
import '../../auth/controllers/auth_controller.dart';
import 'notification_service.dart';

class NotificationPollingService {
  final NotificationService _notificationService = NotificationService();
  Timer? _timer;
  final _unreadCountController = StreamController<int>.broadcast();
  bool _isPolling = false;
  int _lastUnreadCount = 0;

  // Plugins
  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  // Singleton instance
  static final NotificationPollingService _instance =
      NotificationPollingService._internal();

  factory NotificationPollingService() {
    return _instance;
  }

  NotificationPollingService._internal() {
    _initializeNotifications();
  }

  Future<void> _initializeNotifications() async {
    // Android Init
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS Init
    const DarwinInitializationSettings initializationSettingsDarwin =
        DarwinInitializationSettings(
      requestSoundPermission: true,
      requestBadgePermission: true,
      requestAlertPermission: true,
    );

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsDarwin,
    );

    await _notificationsPlugin.initialize(
      initializationSettings, 
      onDidReceiveNotificationResponse: (response) {
        // Handle notification tap
        if (response.payload != null) {
          Get.toNamed('/notifications'); // Adjust route if needed
        }
      }
    );
  }

  Stream<int> get unreadCountStream => _unreadCountController.stream;

  void startPolling({Duration interval = const Duration(seconds: 15)}) { 
    if (_isPolling) return;
    
    _isPolling = true;
    _fetchUnreadCount(); // Initial fetch
    
    _timer = Timer.periodic(interval, (timer) {
      _fetchUnreadCount();
    });
  }

  void stopPolling() {
    _timer?.cancel();
    _isPolling = false;
  }

  Future<void> _fetchUnreadCount() async {
    if (!_isPolling) return;
    
    // Auth Guard: Only fetch if user is authenticated
    try {
      final authController = Get.find<AuthController>();
      if (!authController.isAuthenticated.value) {
        debugPrint('[NotificationPollingService] Skipping fetch: User not authenticated');
        return;
      }
    } catch (e) {
      debugPrint('[NotificationPollingService] AuthController not found, skipping fetch');
      return;
    }
    
    try {
      final count = await _notificationService.getUnreadCount();
      
      // Update Stream
      _unreadCountController.add(count);
      
      // Update App Badge
      if (await AppBadgePlus.isSupported()) {
        await AppBadgePlus.updateBadge(count);
      }

      // Check if new notifications arrived (simple logic: count increased)
      if (count > _lastUnreadCount) {
        await _showLocalNotification(count);
      }
      
      _lastUnreadCount = count;
      
    } catch (e) {
      print('Polling error: $e');
    }
  }
  
  Future<void> _showLocalNotification(int count) async {
    // Ideally we fetch the latest notification to show its content
    try {
      final notifications = await _notificationService.getNotifications();
      if (notifications.isNotEmpty) {
        final latest = notifications.first;
        
        const AndroidNotificationDetails androidPlatformChannelSpecifics =
            AndroidNotificationDetails(
          'fams_notifications', // channelId
          'FAMS Notifications', // channelName
          channelDescription: 'New updates from FAMS',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
        );
        
        const NotificationDetails platformChannelSpecifics =
            NotificationDetails(android: androidPlatformChannelSpecifics);
            
        await _notificationsPlugin.show(
          latest.id, // Notification ID
          latest.title, // Title
          latest.cleanDescription, // Body (cleaned HTML)
          platformChannelSpecifics,
          payload: 'notification_${latest.id}',
        );
      }
    } catch (e) {
      print('Error showing notification: $e');
    }
  }
  
  // Method to check immediately
  Future<void> refresh() async {
    await _fetchUnreadCount();
  }
  
  // Method to cancel a specific notification from status bar
  Future<void> cancelNotification(int id) async {
    await _notificationsPlugin.cancel(id);
  }

  // Method to cancel all notifications from status bar
  Future<void> cancelAllNotifications() async {
    await _notificationsPlugin.cancelAll();
  }

  void dispose() {
    stopPolling();
    _unreadCountController.close();
  }
}
