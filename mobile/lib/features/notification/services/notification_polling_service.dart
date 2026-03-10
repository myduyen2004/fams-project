import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:get/get.dart';
import '../models/notification_model.dart';
import '../views/notification_detail_screen.dart';
import '../views/notification_list_screen.dart';
import '../../auth/controllers/auth_controller.dart';
import 'notification_service.dart';
import '../controllers/notification_controller.dart';
class NotificationPollingService {
  final NotificationService _notificationService = NotificationService();
  Timer? _timer;
  final _unreadCountController = StreamController<int>.broadcast();
  final _newNotificationController = StreamController<bool>.broadcast();
  bool _isPolling = false;
  int _lastUnreadCount = 0;

  // Plugins
  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

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

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsDarwin,
        );

    await _notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (response) async {
        if (response.payload == null) return;

        // payload formats:
        // 1. "CHAT_GROUPID" e.g. "CHAT_42"
        // 2. "TYPE_NOTIFID" e.g. "ACADEMIC_123"
        final parts = response.payload!.split('_');
        final type = parts.first;
        final id = int.tryParse(parts.last);

        // Wait for the app to finish splash/init and land on /home
        // This prevents Get.offAllNamed('/home') from wiping our navigation
        await _waitForAppReady();

        if (id != null) {
          if (type == 'CHAT') {
            try {
              // Open chat detail directly
              // We need to find the group object or just its ID
              // GetX makes it easy to find existing controllers
              // For simplicity, we navigate to home then messages then detail if possible,
              // but GetX can just jump to a specific screen if we have the data.

              // Note: We'll need a way for ChatController to handle deep links.
              // For now, let's just go to the chat list or try to jump to details.
              Get.toNamed('/home', arguments: 2); // Tab 2 is Messages
              return;
            } catch (e) {
              debugPrint('Error navigating to chat: $e');
            }
          } else {
            try {
              final NotificationModel? notification =
                  await _notificationService.getNotificationById(id);
              if (notification != null) {
                if (!notification.isRead) {
                  // Fire-and-forget: mark as read on backend without blocking navigation
                  _notificationService.markAsRead(id).catchError((e) {
                    debugPrint('Could not mark as read via service: $e');
                  });
                }
                // Use Get.to() because /notifications is not a registered named route
                Get.to(() => const NotificationListScreen());
                // Wait for the list screen to be fully mounted
                await Future.delayed(const Duration(milliseconds: 300));
                Get.to(() => NotificationDetailScreen(notification: notification));
                return;
              }
            } catch (e) {
              debugPrint('Error fetching notification for deep link: $e');
            }
          }
        }

        // Fallback: open notification list
        Get.to(() => const NotificationListScreen());
      },
    );
  }

  /// Waits until the splash screen has finished and the app
  /// has settled on /home before allowing deep-link navigation.
  Future<void> _waitForAppReady() async {
    int attempts = 0;
    const maxAttempts = 100; // 5 seconds max (100 * 50ms)
    while (attempts < maxAttempts) {
      try {
        final authController = Get.find<AuthController>();
        if (authController.isAuthenticated.value &&
            authController.isInitialized.value) {
          // Also make sure route is /home (splash finished offAllNamed)
          final currentRoute = Get.currentRoute;
          if (currentRoute == '/home') {
            break;
          }
        }
      } catch (_) {}
      await Future.delayed(const Duration(milliseconds: 50));
      attempts++;
    }
    // Extra delay to ensure the home screen is fully built
    await Future.delayed(const Duration(milliseconds: 300));
  }

  /// Show an immediate local notification (e.g. for real-time chat)
  Future<void> showImmediateNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
          'fams_chat_notifications', // channelId
          'FAMS Chat', // channelName
          channelDescription: 'Real-time chat messages',
          importance: Importance.max,
          priority: Priority.high,
          showWhen: true,
          enableVibration: true,
          playSound: true,
        );

    const NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: androidPlatformChannelSpecifics,
    );

    await _notificationsPlugin.show(
      id,
      title,
      body,
      platformChannelSpecifics,
      payload: payload,
    );
  }

  Stream<int> get unreadCountStream => _unreadCountController.stream;
  Stream<bool> get newNotificationStream => _newNotificationController.stream;

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
        debugPrint(
          '[NotificationPollingService] Skipping fetch: User not authenticated',
        );
        return;
      }
    } catch (e) {
      debugPrint(
        '[NotificationPollingService] AuthController not found, skipping fetch',
      );
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
        // Trigger UI refresh
        _newNotificationController.add(true);
        await _showLocalNotification(count);
      }

      _lastUnreadCount = count;
    } catch (e) {
      debugPrint('Polling error: $e');
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
          latest.firstLineDescription, // Body (first line)
          platformChannelSpecifics,
          payload: '${latest.type ?? "notification"}_${latest.id}',
        );
      }
    } catch (e) {
      debugPrint('Error showing notification: $e');
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
    _newNotificationController.close();
  }
}
