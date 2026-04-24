import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/chat_models.dart';
import '../../lecturer/models/class_section_model.dart';

/// Chat API Service — mirrors web's chatGroupService.ts
class ChatService {
  final ApiService _api = ApiService();

  /// POST /api/v1/chat-groups/class/{className}
  Future<ChatGroup> createGroupForClass(String className) async {
    final response = await _api.post('${ApiConstants.chatGroups}/class/$className');
    return ChatGroup.fromJson(response.data);
  }

  /// GET /api/v1/chat-groups
  Future<List<ChatGroup>> getMyGroups() async {
    final response = await _api.get(ApiConstants.chatGroups);
    final List data = response.data is List ? response.data : [];
    return data.map((g) => ChatGroup.fromJson(g)).toList();
  }

  /// GET /api/v1/chat-groups/{id}
  Future<ChatGroup> getGroupById(int groupId) async {
    final response = await _api.get('${ApiConstants.chatGroups}/$groupId');
    return ChatGroup.fromJson(response.data);
  }

  /// GET /api/v1/chat-groups/class/{className}/exists
  Future<bool> checkGroupExists(String className) async {
    try {
      final response = await _api.get(
        '${ApiConstants.chatGroups}/class/$className/exists',
      );
      return response.data['exists'] ?? false;
    } catch (_) {
      return false;
    }
  }

  /// GET /api/v1/chat-groups/{id}/messages?page=&size=
  Future<List<ChatMessage>> getMessages(
    int groupId, {
    int page = 0,
    int size = 100,
  }) async {
    final response = await _api.get(
      '${ApiConstants.chatGroups}/$groupId/messages',
      queryParameters: {'page': page, 'size': size},
    );
    // Backend returns PageResponse with content[]
    final data = response.data;
    List content;
    if (data is Map && data.containsKey('content')) {
      content = data['content'] as List;
    } else if (data is List) {
      content = data;
    } else {
      content = [];
    }
    return content.map((m) => ChatMessage.fromJson(m)).toList();
  }

  /// POST /api/v1/chat-messages/{groupId}
  Future<ChatMessage> sendMessage(
    int groupId,
    String content, {
    String type = 'TEXT',
    int? replyToId,
  }) async {
    final body = <String, dynamic>{'content': content, 'type': type};
    if (replyToId != null) {
      body['replyToId'] = replyToId;
    }
    final response = await _api.post(
      '${ApiConstants.chatMessages}/$groupId',
      data: body,
    );
    return ChatMessage.fromJson(response.data);
  }

  /// POST /api/v1/chat-messages/{groupId}/upload (multipart)
  Future<ChatMessage> uploadAndSendFile(
    int groupId,
    File file, {
    int? replyToId,
  }) async {
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
      if (replyToId != null) 'replyToId': replyToId,
    });
    final response = await _api.post(
      '${ApiConstants.chatMessages}/$groupId/upload',
      data: formData,
    );
    return ChatMessage.fromJson(response.data);
  }

  /// DELETE /api/v1/chat-messages/{groupId}/{messageId}
  Future<void> deleteMessage(int groupId, int messageId) async {
    await _api.delete('${ApiConstants.chatMessages}/$groupId/$messageId');
  }

  /// POST /api/v1/chat-messages/groups/{groupId}/read
  Future<void> markAsRead(int groupId) async {
    await _api.post('${ApiConstants.chatMessages}/groups/$groupId/read');
  }

  /// POST /api/v1/chat-messages/{groupId}/{messageId}/toggle-reaction?emoji=
  Future<ChatMessage> toggleReaction(
    int groupId,
    int messageId,
    String emoji,
  ) async {
    final response = await _api.post(
      '${ApiConstants.chatMessages}/$groupId/$messageId/toggle-reaction?emoji=${Uri.encodeQueryComponent(emoji)}',
    );
    return ChatMessage.fromJson(response.data);
  }

  /// GET /api/v1/students/{studentCode}/info (maps to the info endpoint in StudentGradeController)
  Future<Enrollment> getStudentInfo(String studentCode) async {
    final response = await _api.get('/api/v1/students/$studentCode/info');
    return Enrollment.fromJson(response.data);
  }
}
