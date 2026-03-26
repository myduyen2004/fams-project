class NewsModel {
  final int id;
  final String title;
  final String content;
  final String targetType;
  final String? type;
  final String senderName;
  final String? senderAvatar;
  final String status;
  final String? publishedAt;
  final String createdAt;
  final String? scheduledAt;
  final String? thumbnailImage;
  final List<String> attachmentUrls;

  NewsModel({
    required this.id,
    required this.title,
    required this.content,
    required this.targetType,
    this.type,
    required this.senderName,
    this.senderAvatar,
    required this.status,
    this.publishedAt,
    required this.createdAt,
    this.scheduledAt,
    this.thumbnailImage,
    this.attachmentUrls = const [],
  });

  factory NewsModel.fromJson(Map<String, dynamic> json) {
    return NewsModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      targetType: json['targetType'] ?? 'ALL',
      type: json['type'],
      senderName: json['senderName'] ?? 'Hệ thống',
      senderAvatar: json['senderAvatar'],
      status: json['status'] ?? 'DRAFT',
      publishedAt: json['publishedAt'],
      createdAt: json['createdAt'] ?? '',
      scheduledAt: json['scheduledAt'],
      thumbnailImage: _sanitizeThumbnail(json['thumbnailImage']),
      attachmentUrls: json['attachmentUrls'] != null
          ? List<String>.from(json['attachmentUrls'])
          : [],
    );
  }
  static String? _sanitizeThumbnail(dynamic value) {
    if (value == null) return null;
    final s = value.toString();
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    if (s.startsWith('data:image')) return s;
    if (s.startsWith('/')) return s; // Allow relative API paths like /api/files/download
    // Reject other non-image strings
    return null;
  }
}
