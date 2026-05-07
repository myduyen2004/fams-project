import 'dart:convert';
import 'dart:io';
import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:dio/dio.dart';
import 'package:get/get.dart';
import 'package:fams_mobile/core/services/api_service.dart';
import 'package:fams_mobile/core/constants/app_routes.dart';
import 'package:fams_mobile/features/chat/controllers/chat_controller.dart';
import 'package:fams_mobile/features/chat/views/chat_detail_screen.dart';
import 'package:fams_mobile/features/notification/controllers/notification_controller.dart';
import 'package:fams_mobile/features/notification/models/notification_model.dart';
import 'package:fams_mobile/features/notification/services/notification_service.dart';
import 'package:fams_mobile/features/notification/views/notification_detail_screen.dart';
import 'package:fams_mobile/features/notification/views/notification_list_screen.dart';
import 'package:fams_mobile/features/auth/controllers/auth_controller.dart';
import 'package:fams_mobile/features/news/controllers/news_controller.dart';
import 'package:fams_mobile/features/news/views/news_detail_screen.dart';

class FcmService extends GetxService {
  static FcmService get to => Get.find();

  // Use a getter to avoid accessing instance before Firebase.initializeApp()
  FirebaseMessaging get _messaging => FirebaseMessaging.instance;
  final ApiService _apiService = ApiService();
  final NotificationService _notificationService = NotificationService();
  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<FcmService> init() async {
    await _initializeLocalNotifications();
    await _requestPermissions();
    await _setupInteractions();
    return this;
  }

  Future<void> _initializeLocalNotifications() async {
    const initializationSettingsAndroid = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const initializationSettingsDarwin = DarwinInitializationSettings(
      requestSoundPermission: true,
      requestBadgePermission: true,
      requestAlertPermission: true,
    );

    const initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsDarwin,
    );

    await _notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (response) async {
        if (response.payload == null || response.payload!.isEmpty) {
          return;
        }

        try {
          final payload = jsonDecode(response.payload!) as Map<String, dynamic>;
          await _handleNotificationClick(payload);
        } catch (e) {
          debugPrint('Error handling local notification payload: $e');
        }
      },
    );
  }

  Future<void> _requestPermissions() async {
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    print('User granted permission: ${settings.authorizationStatus}');
  }

  Future<void> _setupInteractions() async {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      print('Got a message whilst in the foreground!');
      print('Message data: ${message.data}');

      if (message.notification != null ||
          message.data['title'] != null ||
          message.data['body'] != null) {
        print('Message also contained a notification: ${message.notification}');
        if (!_shouldSuppressForegroundNotification(message.data)) {
          await _showLocalNotification(
            id: _resolveNotificationId(message.data),
            title: message.notification?.title ??
                message.data['title']?.toString() ??
                'Thông báo',
            body: message.notification?.body ??
                message.data['body']?.toString() ??
                '',
            payload: jsonEncode(message.data),
          );
        }
      }

      await _refreshNotificationState();
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) async {
      print('A new onMessageOpenedApp event was published!');
      await _handleNotificationClick(message.data);
    });

    RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      await _handleNotificationClick(initialMessage.data);
    }

    _messaging.onTokenRefresh.listen((token) async {
      await _registerToken(token);
    });
  }

  bool _shouldSuppressForegroundNotification(Map<String, dynamic> data) {
    if (data['type'] == 'CHAT' && data['groupId'] != null) {
      final groupId = int.tryParse(data['groupId'].toString());
      if (groupId == null || !Get.isRegistered<ChatController>()) {
        return false;
      }

      return Get.find<ChatController>().selectedGroup.value?.id == groupId;
    }

    return false;
  }

  int _resolveNotificationId(Map<String, dynamic> data) {
    if (data['groupId'] != null) {
      return int.tryParse(data['groupId'].toString()) ??
          DateTime.now().millisecondsSinceEpoch % 100000;
    }

    if (data['notificationId'] != null) {
      return int.tryParse(data['notificationId'].toString()) ??
          DateTime.now().millisecondsSinceEpoch % 100000;
    }

    return DateTime.now().millisecondsSinceEpoch % 100000;
  }

  Future<void> _handleNotificationClick(Map<String, dynamic> data) async {
    if (data['type'] == 'CHAT' && data['groupId'] != null) {
      final groupId = int.tryParse(data['groupId'].toString());
      if (groupId == null) return;

      // Ensure we are on Home screen, Message tab (index 2)
      Get.offAllNamed(AppRoutes.home, arguments: 2);

      // Wait a bit for controllers to initialize if coming from terminated state
      await Future.delayed(const Duration(milliseconds: 500));

      try {
        final chatController = Get.find<ChatController>();

        // If groups not loaded, load them
        if (chatController.groups.isEmpty) {
          await chatController.loadGroups();
        }

        // Find the group
        final group = chatController.groups.firstWhereOrNull(
          (g) => g.id == groupId,
        );
        if (group != null) {
          await chatController.selectGroup(group);
          Get.to(
            () => const ChatDetailScreen(),
            transition: Transition.cupertino,
          );
        }
      } catch (e) {
        print('Error navigating to chat room: $e');
      }
      return;
    }

    // Navigate to news detail when tapping a NEWS notification
    if (data['type'] == 'NEWS' && data['newsId'] != null) {
      final newsId = int.tryParse(data['newsId'].toString());
      if (newsId != null) {
        await _waitForAppReady();
        try {
          // Go to home screen (tab 0 - home tab)
          Get.offAllNamed(AppRoutes.home, arguments: 0);
          await Future.delayed(const Duration(milliseconds: 500));

          // Ensure NewsController is available and fetch the news by id
          late final NewsController newsController;
          if (Get.isRegistered<NewsController>()) {
            newsController = Get.find<NewsController>();
          } else {
            newsController = Get.put(NewsController());
          }

          final news = await newsController.getNewsById(newsId);
          if (news != null) {
            Get.to(
              () => NewsDetailScreen(news: news),
              transition: Transition.cupertino,
            );
          }
        } catch (e) {
          debugPrint('Error navigating to news detail from push: $e');
        }
        return;
      }
    }

    await _waitForAppReady();

    final notificationId = int.tryParse(
      data['notificationId']?.toString() ?? '',
    );
    if (notificationId != null) {
      try {
        final NotificationModel? notification =
            await _notificationService.getNotificationById(notificationId);
        if (notification != null) {
          if (!notification.isRead) {
            await _notificationService.markAsRead(notificationId);
          }

          if (Get.isRegistered<NotificationController>()) {
            await Get.find<NotificationController>().onNewPushNotification();
          }

          Get.to(() => const NotificationListScreen());
          await Future.delayed(const Duration(milliseconds: 300));
          Get.to(() => NotificationDetailScreen(notification: notification));
          await syncUnreadBadge();
          return;
        }
      } catch (e) {
        debugPrint('Error opening notification detail from push: $e');
      }
    } else {
      Get.toNamed(AppRoutes.home);
    }
  }

  Future<void> _waitForAppReady() async {
    int attempts = 0;
    const maxAttempts = 100;
    while (attempts < maxAttempts) {
      try {
        final authController = Get.find<AuthController>();
        if (authController.isAuthenticated.value &&
            authController.isInitialized.value) {
          if (Get.currentRoute == AppRoutes.home) {
            break;
          }
        }
      } catch (_) {}

      await Future.delayed(const Duration(milliseconds: 50));
      attempts++;
    }

    await Future.delayed(const Duration(milliseconds: 300));
  }

  Future<void> _showLocalNotification({
    required int id,
    required String title,
    required String body,
    required String payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'fams_notifications',
      'FAMS Notifications',
      channelDescription: 'Foreground notifications for FAMS',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
    );
    const details = NotificationDetails(android: androidDetails);

    await _notificationsPlugin.show(id, title, body, details, payload: payload);
  }

  Future<void> _refreshNotificationState() async {
    if (Get.isRegistered<NotificationController>()) {
      await Get.find<NotificationController>().onNewPushNotification();
      return;
    }

    await syncUnreadBadge();
  }

  Future<void> updateUnreadBadge(int count) async {
    if (await AppBadgePlus.isSupported()) {
      await AppBadgePlus.updateBadge(count);
    }
  }

  Future<void> syncUnreadBadge() async {
    final count = await _notificationService.getUnreadCount();
    await updateUnreadBadge(count);
  }

  Future<void> cancelNotification(int id) async {
    await _notificationsPlugin.cancel(id);
  }

  Future<void> cancelAllNotifications() async {
    await _notificationsPlugin.cancelAll();
  }

  Future<void> _registerToken(String token) async {
    try {
      final response = await _apiService.post(
        '/api/v1/device-tokens/register',
        data: {
          'token': token,
          'platform': Platform.isAndroid ? 'android' : 'ios',
          'deviceId': 'mobile_device',
        },
      );
      print(
        'Device token registered successfully. status=${response.statusCode}, tokenLength=${token.length}',
      );
    } on DioException catch (e) {
      print(
        'Error registering device token (dio): status=${e.response?.statusCode}, data=${e.response?.data}, message=${e.message}',
      );
    } catch (e) {
      print('Error registering device token: $e');
    }
  }

  Future<String?> _getTokenWithRetry({int maxAttempts = 5}) async {
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      final token = await _messaging.getToken();
      if (token != null && token.isNotEmpty) {
        if (attempt > 1) {
          print('FCM token acquired on attempt $attempt');
        }
        return token;
      }

      // FCM token may not be available immediately right after app/login startup.
      await Future.delayed(const Duration(seconds: 1));
    }

    return null;
  }

  Future<void> registerDeviceToken() async {
    try {
      String? token = await _getTokenWithRetry();
      if (token != null) {
        print('FCM Token: $token');
        await _registerToken(token);
      } else {
        print(
          'FCM token is null after retries; skip registering device token for now',
        );
      }
    } catch (e) {
      print('Error registering device token: $e');
    }
  }

  Future<void> unregisterDeviceToken() async {
    try {
      String? token = await _getTokenWithRetry(maxAttempts: 2);
      if (token != null) {
        final response = await _apiService.post(
          '/api/v1/device-tokens/unregister',
          data: {'token': token},
        );
        print(
          'Device token unregistered successfully. status=${response.statusCode}, tokenLength=${token.length}',
        );
      } else {
        print('Skip unregistering device token because token is null');
      }
    } on DioException catch (e) {
      print(
        'Error unregistering device token (dio): status=${e.response?.statusCode}, data=${e.response?.data}, message=${e.message}',
      );
    } catch (e) {
      print('Error unregistering device token: $e');
    }
  }
}
