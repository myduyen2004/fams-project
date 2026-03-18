import 'dart:io';
import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../models/ai_chat_models.dart';

class AiChatService {
  final ApiService _api = ApiService();

  Future<List<AiChatSession>> getSessions() async {
    final response = await _api.get(ApiConstants.aiChatSessions);
    final List data = response.data is List ? response.data : [];
    return data.map((s) => AiChatSession.fromJson(s)).toList();
  }

  Future<AiChatSession> createSession() async {
    final response = await _api.post(ApiConstants.aiChatSessions);
    return AiChatSession.fromJson(response.data);
  }

  Future<List<AiChatMessage>> getMessages(int sessionId) async {
    final path = ApiConstants.aiChatMessages.replaceFirst(
      '{id}',
      sessionId.toString(),
    );
    final response = await _api.get(path);
    final List data = response.data is List ? response.data : [];
    return data.map((m) => AiChatMessage.fromJson(m)).toList();
  }

  Future<AiChatResponse> sendMessage(
    int sessionId,
    String message, {
    String? routingModel,
    String? answerModel,
  }) async {
    final path = ApiConstants.aiChatSend.replaceFirst(
      '{id}',
      sessionId.toString(),
    );
    final body = {
      'message': message,
      if (routingModel != null) 'routingModel': routingModel,
      if (answerModel != null) 'answerModel': answerModel,
    };
    final response = await _api.post(path, data: body);
    return AiChatResponse.fromJson(response.data);
  }

  Future<AiChatResponse> uploadFile(
    int sessionId,
    File file, {
    String? routingModel,
    String? answerModel,
  }) async {
    final path = ApiConstants.aiChatUpload.replaceFirst(
      '{id}',
      sessionId.toString(),
    );
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
      if (routingModel != null) 'routingModel': routingModel,
      if (answerModel != null) 'answerModel': answerModel,
    });
    final response = await _api.post(path, data: formData);
    return AiChatResponse.fromJson(response.data);
  }

  Future<void> deleteSession(int sessionId) async {
    final path = '${ApiConstants.aiChatSessions}/$sessionId';
    await _api.delete(path);
  }
}
