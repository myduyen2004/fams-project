import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:get/get.dart';
import 'package:fams_mobile/features/notification/services/notification_polling_service.dart';
import 'package:fams_mobile/core/services/api_service.dart';
import 'package:fams_mobile/core/constants/app_routes.dart';
import 'package:fams_mobile/features/chat/controllers/chat_controller.dart';
import 'package:fams_mobile/features/chat/views/chat_detail_screen.dart';

class FcmService extends GetxService {
  static FcmService get to => Get.find();

  // Use a getter to avoid accessing instance before Firebase.initializeApp()
  FirebaseMessaging get _messaging => FirebaseMessaging.instance;
  final ApiService _apiService = ApiService();

  Future<FcmService> init() async {
    await _requestPermissions();
    await _setupInteractions();
    return this;
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
    // 1. Handling messages when app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Got a message whilst in the foreground!');
      print('Message data: ${message.data}');

      if (message.notification != null) {
        print('Message also contained a notification: ${message.notification}');

        // Use NotificationPollingService to show local notification since we are in foreground
        NotificationPollingService().showImmediateNotification(
          id: message.data['groupId'] != null
              ? int.tryParse(message.data['groupId'].toString()) ??
                    DateTime.now().millisecondsSinceEpoch % 100000
              : DateTime.now().millisecondsSinceEpoch % 100000,
          title: message.notification!.title ?? 'Thông báo',
          body: message.notification!.body ?? '',
          payload: _getPayloadFromData(message.data),
        );
      }
    });

    // 2. Handling notification click when app is in background (not terminated)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('A new onMessageOpenedApp event was published!');
      _handleNotificationClick(message.data);
    });

    // 3. Handling notification click when app was terminated
    RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationClick(initialMessage.data);
    }
  }

  String _getPayloadFromData(Map<String, dynamic> data) {
    if (data['type'] == 'CHAT' && data['groupId'] != null) {
      return 'CHAT_${data['groupId']}';
    }
    return '';
  }

  void _handleNotificationClick(Map<String, dynamic> data) async {
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
    } else {
      Get.toNamed(AppRoutes.home);
    }
  }

  Future<void> registerDeviceToken() async {
    try {
      String? token = await _messaging.getToken();
      if (token != null) {
        print('FCM Token: $token');
        await _apiService.post(
          '/api/v1/device-tokens/register',
          data: {
            'token': token,
            'platform': Platform.isAndroid ? 'android' : 'ios',
            'deviceId': 'mobile_device',
          },
        );
      }
    } catch (e) {
      print('Error registering device token: $e');
    }
  }

  Future<void> unregisterDeviceToken() async {
    try {
      String? token = await _messaging.getToken();
      if (token != null) {
        await _apiService.post(
          '/api/v1/device-tokens/unregister',
          data: {'token': token},
        );
      }
    } catch (e) {
      print('Error unregistering device token: $e');
    }
  }
}
