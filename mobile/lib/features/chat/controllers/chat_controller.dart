import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../models/chat_models.dart';
import '../services/chat_service.dart';
import '../services/websocket_service.dart';
import '../../auth/controllers/auth_controller.dart';

/// Chat Controller — manages all chat state (mirrors MessagesPage.tsx state)
class ChatController extends GetxController {
  final ChatService _chatService = ChatService();
  final WebSocketService _wsService = WebSocketService();

  // ── Reactive State ──
  final groups = <ChatGroup>[].obs;
  final filteredGroups = <ChatGroup>[].obs;
  final messages = <ChatMessage>[].obs;
  final selectedGroup = Rxn<ChatGroup>();
  final isLoadingGroups = false.obs;
  final isLoadingMessages = false.obs;
  final isSending = false.obs;
  final searchTerm = ''.obs;
  final isUnreadOnly = false.obs;
  final typingUsers = <String>[].obs;
  final replyingTo = Rxn<ChatMessage>();
  final selectedFile = Rxn<File>();
  final totalUnreadCount = 0.obs;

  Timer? _typingTimer;
  Timer? _markAsReadDebounce;

  int get _currentUserId {
    try {
      final authController = Get.find<AuthController>();
      return int.tryParse(authController.currentUser.value?.id ?? '0') ?? 0;
    } catch (_) {
      return 0;
    }
  }

  @override
  void onInit() {
    super.onInit();
    loadGroups();

    // React to search/filter changes
    ever(searchTerm, (_) => _applyFilters());
    ever(isUnreadOnly, (_) => _applyFilters());
  }

  @override
  void onClose() {
    _wsService.disconnect();
    _typingTimer?.cancel();
    _markAsReadDebounce?.cancel();
    super.onClose();
  }

  // ── Groups ──

  Future<void> loadGroups() async {
    isLoadingGroups.value = true;
    try {
      final result = await _chatService.getMyGroups();
      groups.assignAll(result);
      _applyFilters();
      _updateTotalUnread();
      _initWebSocket();
    } catch (e) {
      debugPrint('Failed to load groups: $e');
    } finally {
      isLoadingGroups.value = false;
    }
  }

  void _applyFilters() {
    var filtered = groups.toList();

    // Search
    final term = searchTerm.value.toLowerCase();
    if (term.isNotEmpty) {
      filtered = filtered.where((g) {
        return g.name.toLowerCase().contains(term) ||
            g.className.toLowerCase().contains(term) ||
            g.lecturerName.toLowerCase().contains(term);
      }).toList();
    }

    // Unread only
    if (isUnreadOnly.value) {
      filtered = filtered.where((g) => g.unreadCount > 0).toList();
    }

    // Sort by last message time
    filtered.sort((a, b) {
      final aTime = a.lastMessage?.sentAt ?? a.createdAt;
      final bTime = b.lastMessage?.sentAt ?? b.createdAt;
      return bTime.compareTo(aTime);
    });

    filteredGroups.assignAll(filtered);
  }

  void _updateTotalUnread() {
    totalUnreadCount.value = groups.fold(0, (sum, g) => sum + g.unreadCount);
  }

  // ── WebSocket ──

  void _initWebSocket() {
    _wsService.connect(
      onConnected: () {
        // Subscribe to all groups
        for (final group in groups) {
          _wsService.subscribeToGroup(
            group.id,
            onMessage: (data) => _handleNewMessage(data, group.id),
            onReadReceipt: (data) => _handleReadReceipt(data, group.id),
            onDelete: (data) => _handleDelete(data, group.id),
          );
        }
        // Subscribe to user notifications
        _wsService.subscribeToNotifications((data) {
          _handleNotification(data);
        });
      },
      onError: (error) {
        debugPrint('[Chat] WebSocket error: $error');
      },
    );
  }

  void _handleNewMessage(Map<String, dynamic> data, int groupId) {
    var msg = ChatMessage.fromJson(data);
    // Recalculate isOwn locally
    msg = _setOwnFlag(msg);

    // Update group's last message
    final groupIdx = groups.indexWhere((g) => g.id == groupId);
    if (groupIdx != -1) {
      groups[groupIdx] = ChatGroup(
        id: groups[groupIdx].id,
        name: groups[groupIdx].name,
        className: groups[groupIdx].className,
        type: groups[groupIdx].type,
        lecturerName: groups[groupIdx].lecturerName,
        memberCount: groups[groupIdx].memberCount,
        createdAt: groups[groupIdx].createdAt,
        lastMessage: LastMessage(
          senderName: msg.senderName,
          content: msg.content, // content is already masked by model if deleted
          type: msg.type,
          sentAt: msg.sentAt,
          deleted: msg.deleted,
        ),
        members: groups[groupIdx].members,
        unreadCount: selectedGroup.value?.id == groupId
            ? 0
            : groups[groupIdx].unreadCount + 1,
        firstUnreadMessageId: groups[groupIdx].firstUnreadMessageId,
      );
      groups.refresh();
      _applyFilters();
      _updateTotalUnread();
    }

    // If viewing this group, add message
    if (selectedGroup.value?.id == groupId) {
      // Remove optimistic message if it's our own
      if (msg.isOwn) {
        messages.removeWhere((m) => m.id < 0 && m.content == msg.content);
      }
      messages.insert(0, msg);

      // Clear typing for sender
      typingUsers.remove(msg.senderName);

      // Mark as read
      _triggerMarkAsRead(groupId);
    }
  }

  void _handleReadReceipt(Map<String, dynamic> data, int groupId) {
    if (selectedGroup.value?.id != groupId) return;

    final List<dynamic>? messageIdsRaw = data['messageIds'];
    final Map<String, dynamic>? readerRaw = data['reader'];

    if (messageIdsRaw == null || readerRaw == null) return;

    final List<int> messageIds = messageIdsRaw
        .map((id) => int.tryParse(id.toString()) ?? 0)
        .toList();
    final reader = ReadReceipt.fromJson(readerRaw);

    bool changed = false;
    for (int i = 0; i < messages.length; i++) {
      if (messageIds.contains(messages[i].id)) {
        final m = messages[i];
        // Check if already in list
        final alreadyRead = m.readBy.any((r) => r.userId == reader.userId);
        if (!alreadyRead) {
          messages[i] = ChatMessage(
            id: m.id,
            groupId: m.groupId,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.senderRole,
            senderAvatarUrl: m.senderAvatarUrl,
            content: m.content,
            type: m.type,
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            isOwn: m.isOwn,
            sentAt: m.sentAt,
            deleted: m.deleted,
            replyToId: m.replyToId,
            replyToContent: m.replyToContent,
            replyToSenderName: m.replyToSenderName,
            replyToType: m.replyToType,
            readBy: [...m.readBy, reader],
          );
          changed = true;
        }
      }
    }

    if (changed) {
      messages.refresh();
    }
  }

  void _handleDelete(Map<String, dynamic> data, int groupId) {
    final messageId = data['messageId'] ?? data['id'];
    if (messageId == null) return;

    if (selectedGroup.value?.id == groupId) {
      final idx = messages.indexWhere((m) => m.id == messageId);
      if (idx != -1) {
        messages[idx] = ChatMessage(
          id: messages[idx].id,
          groupId: messages[idx].groupId,
          senderId: messages[idx].senderId,
          senderName: messages[idx].senderName,
          senderRole: messages[idx].senderRole,
          senderAvatarUrl: messages[idx].senderAvatarUrl,
          content: 'Tin nhắn đã được thu hồi',
          type: messages[idx].type,
          attachmentUrl: messages[idx].attachmentUrl,
          attachmentName: messages[idx].attachmentName,
          isOwn: messages[idx].isOwn,
          sentAt: messages[idx].sentAt,
          deleted: true,
          replyToId: messages[idx].replyToId,
          replyToContent: messages[idx].replyToContent,
          replyToSenderName: messages[idx].replyToSenderName,
          replyToType: messages[idx].replyToType,
          readBy: messages[idx].readBy,
        );
        messages.refresh();
      }
    }

    // Also update group's last message if it matches
    final groupIdx = groups.indexWhere((g) => g.id == groupId);
    if (groupIdx != -1) {
      final group = groups[groupIdx];
      // Only update if it IS the last message (not a perfect check if IDs aren't sequential/fetched, but usually okay)
      // For now, simpler: re-fetch group list or just update if we have enough info
      if (group.lastMessage != null) {
        // If we don't know the sender or type, we might need more info from data
        final senderName = data['senderName'] ?? group.lastMessage!.senderName;
        groups[groupIdx] = ChatGroup(
          id: group.id,
          name: group.name,
          className: group.className,
          type: group.type,
          lecturerName: group.lecturerName,
          memberCount: group.memberCount,
          createdAt: group.createdAt,
          lastMessage: LastMessage(
            senderName: senderName,
            content: 'Tin nhắn đã được thu hồi',
            type: group.lastMessage!.type,
            sentAt: group.lastMessage!.sentAt,
            deleted: true,
          ),
          members: group.members,
          unreadCount: group.unreadCount,
          firstUnreadMessageId: group.firstUnreadMessageId,
        );
        groups.refresh();
        _applyFilters();
      }
    }
  }

  void _handleNotification(Map<String, dynamic> data) {
    if (data['type'] == 'READ_UPDATE') {
      final groupId = int.tryParse(data['groupId'].toString());
      if (groupId != null) {
        final idx = groups.indexWhere((g) => g.id == groupId);
        if (idx != -1) {
          groups[idx] = ChatGroup(
            id: groups[idx].id,
            name: groups[idx].name,
            className: groups[idx].className,
            type: groups[idx].type,
            lecturerName: groups[idx].lecturerName,
            memberCount: groups[idx].memberCount,
            createdAt: groups[idx].createdAt,
            lastMessage: groups[idx].lastMessage,
            members: groups[idx].members,
            unreadCount: 0,
            firstUnreadMessageId: null,
          );
          groups.refresh();
          _applyFilters();
          _updateTotalUnread();
        }
      }
    } else {
      // Refresh groups for other notification types
      loadGroups();
    }
  }

  // ── Select Group ──

  Future<void> selectGroup(ChatGroup group) async {
    selectedGroup.value = group;
    messages.clear();
    typingUsers.clear();
    replyingTo.value = null;

    // Subscribe to typing for this group
    _wsService.subscribeToTyping(group.id, (data) {
      final senderName = data['senderName'] as String? ?? '';
      final senderId = data['senderId'];
      if (senderId != _currentUserId && senderName.isNotEmpty) {
        if (!typingUsers.contains(senderName)) {
          typingUsers.add(senderName);
        }
        // Clear after 3 seconds
        _typingTimer?.cancel();
        _typingTimer = Timer(const Duration(seconds: 3), () {
          typingUsers.remove(senderName);
        });
      }
    });

    await loadMessages(group.id);
    _triggerMarkAsRead(group.id);
  }

  void clearSelectedGroup() {
    if (selectedGroup.value != null) {
      _wsService.unsubscribeFromTyping(selectedGroup.value!.id);
    }
    selectedGroup.value = null;
    messages.clear();
    typingUsers.clear();
    replyingTo.value = null;
    selectedFile.value = null;
  }

  // ── Files ──

  void selectFile(File file) {
    selectedFile.value = file;
  }

  void clearSelectedFile() {
    selectedFile.value = null;
  }

  // ── Messages ──

  ChatMessage _setOwnFlag(ChatMessage msg) {
    return ChatMessage(
      id: msg.id,
      groupId: msg.groupId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      senderAvatarUrl: msg.senderAvatarUrl,
      content: msg.content,
      type: msg.type,
      attachmentUrl: msg.attachmentUrl,
      attachmentName: msg.attachmentName,
      isOwn: msg.senderId == _currentUserId,
      sentAt: msg.sentAt,
      deleted: msg.deleted,
      replyToId: msg.replyToId,
      replyToContent: msg.replyToContent,
      replyToSenderName: msg.replyToSenderName,
      replyToType: msg.replyToType,
      readBy: msg.readBy,
    );
  }

  Future<void> loadMessages(int groupId) async {
    isLoadingMessages.value = true;
    try {
      final result = await _chatService.getMessages(groupId);
      // API returns newest first; maintain this order and set identity
      messages.assignAll(result.map((m) => _setOwnFlag(m)).toList());
    } catch (e) {
      debugPrint('Failed to load messages: $e');
    } finally {
      isLoadingMessages.value = false;
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty || selectedGroup.value == null) return;

    final groupId = selectedGroup.value!.id;
    final replyId = replyingTo.value?.id;

    // Detect link
    final isLink = RegExp(r'https?://\S+').hasMatch(content.trim());
    final type = isLink ? 'LINK' : 'TEXT';

    // Optimistic UI
    final optimisticMsg = ChatMessage(
      id: -DateTime.now().millisecondsSinceEpoch,
      groupId: groupId,
      senderId: _currentUserId,
      senderName: 'Bạn',
      senderRole: '',
      content: content.trim(),
      type: type,
      isOwn: true,
      sentAt: DateTime.now().toIso8601String(),
      replyToId: replyId,
      replyToContent: replyingTo.value?.content,
      replyToSenderName: replyingTo.value?.senderName,
    );
    messages.insert(0, optimisticMsg);
    replyingTo.value = null;

    try {
      await _chatService.sendMessage(
        groupId,
        content.trim(),
        type: type,
        replyToId: replyId,
      );
    } catch (e) {
      // Remove optimistic message on failure
      messages.removeWhere((m) => m.id == optimisticMsg.id);
      debugPrint('Failed to send message: $e');
    }
  }

  Future<void> sendFile(File file) async {
    if (selectedGroup.value == null) return;

    final groupId = selectedGroup.value!.id;
    final replyId = replyingTo.value?.id;

    isSending.value = true;
    replyingTo.value = null;
    clearSelectedFile();

    try {
      await _chatService.uploadAndSendFile(groupId, file, replyToId: replyId);
    } catch (e) {
      debugPrint('Failed to upload file: $e');
    } finally {
      isSending.value = false;
    }
  }

  Future<void> deleteMessage(int messageId) async {
    if (selectedGroup.value == null) return;
    final groupId = selectedGroup.value!.id;

    try {
      await _chatService.deleteMessage(groupId, messageId);
    } catch (e) {
      debugPrint('Failed to delete message: $e');
    }
  }

  void setReplyTo(ChatMessage message) {
    replyingTo.value = message;
  }

  void cancelReply() {
    replyingTo.value = null;
  }

  // ── Typing ──

  void sendTypingIndicator() {
    if (selectedGroup.value != null) {
      _wsService.sendTyping(selectedGroup.value!.id);
    }
  }

  // ── Mark as Read ──

  void _triggerMarkAsRead(int groupId) {
    _markAsReadDebounce?.cancel();
    _markAsReadDebounce = Timer(const Duration(seconds: 2), () async {
      try {
        await _chatService.markAsRead(groupId);
        // Update local unread count
        final idx = groups.indexWhere((g) => g.id == groupId);
        if (idx != -1) {
          groups[idx].unreadCount = 0;
          groups.refresh();
          _applyFilters();
          _updateTotalUnread();
        }
      } catch (e) {
        debugPrint('Failed to mark as read: $e');
      }
    });
  }
}
