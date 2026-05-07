import 'package:get/get.dart';
import 'package:flutter/material.dart';
import '../../auth/controllers/auth_controller.dart';
import '../models/ai_chat_models.dart';
import '../services/ai_chat_service.dart';

class AiChatController extends GetxController {
  final AiChatService _chatService = AiChatService();
  final AuthController _authController = Get.find<AuthController>();

  // State
  final RxList<AiChatSession> sessions = <AiChatSession>[].obs;
  final Rx<AiChatSession?> currentSession = Rx<AiChatSession?>(null);
  final RxList<AiChatMessage> messages = <AiChatMessage>[].obs;
  final RxList<ThinkingStep> thinkingSteps = <ThinkingStep>[].obs;
  final RxBool isLoading = false.obs;
  final RxBool isThinking = false.obs;
  final TextEditingController textController = TextEditingController();

  @override
  void onInit() {
    debugPrint('AiChatController: onInit called');
    super.onInit();
    loadSessions();
  }

  String get userRole =>
      _authController.currentUser.value?.role.toUpperCase() ?? '';

  String get chatTitle {
    if (userRole == 'LECTURER') return 'FAMS AI Lecturer';
    if (userRole == 'STUDENT') return 'FAMS AI Student';
    if (userRole == 'ACADEMIC_STAFF') return 'FAMS AI Staff';
    return 'FAMS AI Assistant';
  }

  List<String> get suggestedQuestions {
    if (userRole == 'LECTURER') {
      return [
        'Lịch dạy của tôi hôm nay',
        'Danh sách lớp tôi dạy',
        'Thông tin học kỳ',
      ];
    }
    if (userRole == 'STUDENT') {
      return [
        'Lịch học của tôi hôm nay',
        'Điểm số học kỳ này',
        'Thông tin học kỳ',
      ];
    }
    if (userRole == 'ACADEMIC_STAFF') {
      return [
        'Số sinh viên ngành CNTT',
        'Thống kê điểm số',
        'Thông tin học kỳ',
      ];
    }
    return [
      'Lịch học của tôi hôm nay',
      'Số sinh viên ngành CNTT',
      'Thông tin học kỳ',
    ];
  }

  Future<void> loadSessions() async {
    debugPrint('AiChatController: loadSessions called');
    try {
      isLoading.value = true;
      final data = await _chatService.getSessions();
      debugPrint(
        'AiChatController: Successfully loaded ${data.length} sessions',
      );
      sessions.assignAll(data);
      if (data.isNotEmpty && currentSession.value == null) {
        selectSession(data.first);
      } else if (data.isEmpty) {
        // Tự động tạo session mới nếu chưa có lịch sử
        handleNewChat();
      }
    } catch (e) {
      debugPrint('Error loading AI sessions: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> selectSession(AiChatSession session) async {
    currentSession.value = session;
    try {
      isLoading.value = true;
      final msgs = await _chatService.getMessages(session.id);
      messages.assignAll(msgs.reversed.toList());
      thinkingSteps.clear();
    } catch (e) {
      debugPrint('Error loading AI messages: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> handleNewChat() async {
    try {
      isLoading.value = true;
      final newSession = await _chatService.createSession();
      sessions.insert(0, newSession);
      currentSession.value = newSession;
      messages.clear();
      thinkingSteps.clear();
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Không thể tạo phiên chat mới',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty || currentSession.value == null) return;

    final sessionId = currentSession.value!.id;

    // Add user message locally
    final userMsg = AiChatMessage(
      id: DateTime.now().millisecondsSinceEpoch,
      content: text,
      role: 'USER',
      createdAt: DateTime.now(),
    );
    messages.insert(0, userMsg);

    try {
      isThinking.value = true;
      thinkingSteps.clear();

      final response = await _chatService.sendMessage(sessionId, text);

      // If response contains a redirectPath, add a notice that it's web-only for now
      String finalAnswer = response.answer;
      if (response.redirectPath != null && response.redirectPath!.isNotEmpty) {
        finalAnswer += '\n\n> ⚠️ **Lưu ý:** Tính năng tự động chuyển trang hiện chỉ hỗ trợ trên phiên bản Web. Bạn có thể tự truy cập vào mục tương ứng trên ứng dụng.';
      }

      final assistantMsg = AiChatMessage(
        id: DateTime.now().millisecondsSinceEpoch + 1,
        content: finalAnswer,
        role: 'ASSISTANT',
        createdAt: DateTime.now(),
        redirectPath: response.redirectPath,
      );
      messages.insert(0, assistantMsg);
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Không thể gửi tin nhắn: $e',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    } finally {
      isThinking.value = false;
    }
  }

  Future<void> deleteSession(int sessionId) async {
    try {
      await _chatService.deleteSession(sessionId);
      sessions.removeWhere((s) => s.id == sessionId);
      if (currentSession.value?.id == sessionId) {
        currentSession.value = sessions.isNotEmpty ? sessions.first : null;
        if (currentSession.value != null) {
          selectSession(currentSession.value!);
        } else {
          messages.clear();
        }
      }
    } catch (e) {
      Get.snackbar(
        'Lỗi',
        'Không thể xóa phiên chat',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  @override
  void onClose() {
    textController.dispose();
    super.onClose();
  }
}
