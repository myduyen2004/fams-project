class AiChatSession {
  final int id;
  final String title;
  final String status;
  final DateTime createdAt;
  final DateTime lastMessageAt;

  AiChatSession({
    required this.id,
    required this.title,
    required this.status,
    required this.createdAt,
    required this.lastMessageAt,
  });

  factory AiChatSession.fromJson(Map<String, dynamic> json) {
    return AiChatSession(
      id: json['id'] ?? 0,
      title: json['title'] ?? 'New Chat Session',
      status: json['status'] ?? 'ACTIVE',
      createdAt: DateTime.parse(
        json['createdAt'] ?? DateTime.now().toIso8601String(),
      ),
      lastMessageAt: DateTime.parse(
        json['lastMessageAt'] ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}

class AiChatMessage {
  final int id;
  final String content;
  final String role; // 'USER' | 'ASSISTANT'
  final DateTime createdAt;
  final String? redirectPath;

  AiChatMessage({
    required this.id,
    required this.content,
    required this.role,
    required this.createdAt,
    this.redirectPath,
  });

  bool get isUser => role == 'USER';

  factory AiChatMessage.fromJson(Map<String, dynamic> json) {
    return AiChatMessage(
      id: json['id'] ?? 0,
      content: json['content'] ?? '',
      role: json['role'] ?? 'USER',
      createdAt: DateTime.parse(
        json['createdAt'] ?? DateTime.now().toIso8601String(),
      ),
      redirectPath: json['redirectPath'],
    );
  }
}

class ThinkingStep {
  final int stage;
  final String name;
  final String status;
  final String? detail;

  ThinkingStep({
    required this.stage,
    required this.name,
    required this.status,
    this.detail,
  });

  factory ThinkingStep.fromJson(Map<String, dynamic> json) {
    return ThinkingStep(
      stage: json['stage'] ?? 0,
      name: json['name'] ?? '',
      status: json['status'] ?? '',
      detail: json['detail'],
    );
  }
}

class AiChatResponse {
  final String answer;
  final List<ThinkingStep> thinkingSteps;
  final String? redirectPath;

  AiChatResponse({
    required this.answer,
    required this.thinkingSteps,
    this.redirectPath,
  });

  factory AiChatResponse.fromJson(Map<String, dynamic> json) {
    return AiChatResponse(
      answer: json['answer'] ?? '',
      thinkingSteps: json['thinkingSteps'] != null
          ? (json['thinkingSteps'] as List)
                .map((i) => ThinkingStep.fromJson(i))
                .toList()
          : [],
      redirectPath: json['redirectPath'],
    );
  }
}
