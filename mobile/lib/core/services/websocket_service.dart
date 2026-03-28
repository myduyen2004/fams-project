import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../constants/api_constants.dart';
import 'api_service.dart';

/// WebSocket service using STOMP — mirrors web's initWebSocket()
class WebSocketService extends GetxService {
  StompClient? _stompClient;
  final Map<String, void Function(Map<String, dynamic>)> _onMessageCallbacks = {};
  final Map<String, StompUnsubscribe> _subscriptions = {};
  bool _isConnected = false;
  Timer? _reconnectTimer;
  Completer<void>? _connectionCompleter;

  bool get isConnected => _isConnected;

  /// Connect to WebSocket with JWT token
  Future<void> connect({
    Function()? onConnected,
    Function(String error)? onError,
  }) async {
    if (_isConnected) {
      onConnected?.call();
      return;
    }

    if (_connectionCompleter != null && !_connectionCompleter!.isCompleted) {
      return _connectionCompleter!.future.then((_) => onConnected?.call());
    }

    final token = await ApiService().getToken();
    if (token == null) {
      onError?.call('No auth token available');
      return;
    }

    _connectionCompleter = Completer<void>();

    _stompClient = StompClient(
      config: StompConfig(
        url: '${ApiConstants.baseUrl.replaceFirst('http', 'ws')}/ws-native',
        stompConnectHeaders: {'Authorization': 'Bearer $token'},
        webSocketConnectHeaders: {'Authorization': 'Bearer $token'},
        onConnect: (StompFrame frame) {
          _isConnected = true;
          _reconnectTimer?.cancel();
          debugPrint('[WS] Connected');
          
          // Re-subscribe to all topics
          final topics = Map<String, void Function(Map<String, dynamic>)>.from(_onMessageCallbacks);
          _subscriptions.clear();
          topics.forEach((destination, callback) {
            _doSubscribe(destination, callback);
          });

          if (!_connectionCompleter!.isCompleted) _connectionCompleter!.complete();
          onConnected?.call();
        },
        onDisconnect: (StompFrame frame) {
          _isConnected = false;
          debugPrint('[WS] Disconnected');
          _scheduleReconnect(onConnected: onConnected, onError: onError);
        },
        onStompError: (StompFrame frame) {
          _isConnected = false;
          debugPrint('[WS] STOMP Error: ${frame.body}');
          if (!_connectionCompleter!.isCompleted)
            _connectionCompleter!.completeError(frame.body ?? 'STOMP Error');
          onError?.call(frame.body ?? 'STOMP Error');
        },
        onWebSocketError: (dynamic error) {
          _isConnected = false;
          debugPrint('[WS] WebSocket Error: $error');
          if (!_connectionCompleter!.isCompleted) _connectionCompleter!.completeError(error.toString());
          _scheduleReconnect(onConnected: onConnected, onError: onError);
        },
        reconnectDelay: const Duration(seconds: 0),
      ),
    );

    _stompClient!.activate();
    return _connectionCompleter!.future;
  }

  /// Schedule reconnection after 5 seconds
  void _scheduleReconnect({
    Function()? onConnected,
    Function(String)? onError,
  }) {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      debugPrint('[WS] Attempting reconnect...');
      connect(onConnected: onConnected, onError: onError);
    });
  }

  /// Subscribe to a topic
  void subscribe(
    String destination,
    void Function(Map<String, dynamic> data) onMessage,
  ) {
    _onMessageCallbacks[destination] = onMessage;
    if (_stompClient == null || !_isConnected) return;
    _doSubscribe(destination, onMessage);
  }

  void _doSubscribe(String destination, void Function(Map<String, dynamic> data) onMessage) {
    // Unsubscribe existing if any
    _subscriptions[destination]?.call(unsubscribeHeaders: {});

    final unsubscribe = _stompClient!.subscribe(
      destination: destination,
      callback: (StompFrame frame) {
        if (frame.body != null) {
          try {
            final data = jsonDecode(frame.body!) as Map<String, dynamic>;
            onMessage(data);
          } catch (e) {
            debugPrint('[WS] Failed to parse message on $destination: $e');
          }
        }
      },
    );
    _subscriptions[destination] = unsubscribe;
  }

  /// Unsubscribe from a specific destination
  void unsubscribe(String destination) {
    _onMessageCallbacks.remove(destination);
    _subscriptions[destination]?.call(unsubscribeHeaders: {});
    _subscriptions.remove(destination);
  }

  /// Send message to a destination
  void send(String destination, {Map<String, dynamic>? body}) {
    if (_stompClient == null || !_isConnected) return;
    _stompClient!.send(
      destination: destination,
      body: body != null ? jsonEncode(body) : null,
    );
  }

  /// Subscribe to chat topics for a group
  void subscribeToGroup(
    int groupId, {
    required void Function(Map<String, dynamic>) onMessage,
    required void Function(Map<String, dynamic>) onReadReceipt,
    required void Function(Map<String, dynamic>) onDelete,
  }) {
    subscribe('/topic/chat/$groupId', onMessage);
    subscribe('/topic/chat/$groupId/read', onReadReceipt);
    subscribe('/topic/chat/$groupId/delete', onDelete);
  }

  /// Subscribe to typing indicator for a group
  void subscribeToTyping(
    int groupId,
    void Function(Map<String, dynamic>) onTyping,
  ) {
    subscribe('/topic/chat/$groupId/typing', onTyping);
  }

  /// Unsubscribe from typing indicator
  void unsubscribeFromTyping(int groupId) {
    unsubscribe('/topic/chat/$groupId/typing');
  }

  /// Subscribe to user notifications
  void subscribeToNotifications(
    void Function(Map<String, dynamic>) onNotification,
  ) {
    subscribe('/user/queue/chat-notifications', onNotification);
  }

  /// Send typing indicator
  void sendTyping(int groupId) {
    send('/app/chat.typing/$groupId');
  }

  /// Send mark-as-read
  void sendMarkAsRead(int groupId) {
    send('/app/chat.read/$groupId');
  }

  /// Disconnect and clean up
  void disconnect() {
    _reconnectTimer?.cancel();
    for (final unsub in _subscriptions.values) {
      try {
        unsub(unsubscribeHeaders: {});
      } catch (_) {}
    }
    _subscriptions.clear();
    _stompClient?.deactivate();
    _stompClient = null;
    _isConnected = false;
  }
}
