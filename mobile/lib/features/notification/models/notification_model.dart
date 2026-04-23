import 'package:intl/intl.dart';

class NotificationModel {
  final int id;
  final String title;
  final String description;
  final String timestamp;
  final bool isRead;
  final String? type;
  final String? senderName;
  final String? senderFullName;
  final String? senderAvatar;
  final List<String> attachmentUrls;

  NotificationModel({
    required this.id,
    required this.title,
    required this.description,
    required this.timestamp,
    required this.isRead,
    this.type,
    this.senderName,
    this.senderFullName,
    this.senderAvatar,
    this.attachmentUrls = const [],
  });

  DateTime? get parsedTimestamp {
    if (timestamp.isEmpty) return null;
    
    // 1. Try ISO8601 (most standard)
    final isoDate = DateTime.tryParse(timestamp);
    if (isoDate != null) return isoDate;

    // 2. Try dd/MM/yyyy HH:mm (current assumption)
    try {
      return DateFormat('dd/MM/yyyy HH:mm').parse(timestamp);
    } catch (_) {}

    // 3. Try yyyy-MM-dd HH:mm:ss (SQL/Common)
    try {
      return DateFormat('yyyy-MM-dd HH:mm:ss').parse(timestamp);
    } catch (_) {}

    return null;
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      timestamp: json['timestamp'] ?? '',
      isRead: json['isRead'] ?? false,
      type: json['type'],
      senderName: json['senderName'],
      senderFullName: json['senderFullName'],
      senderAvatar: json['senderAvatar'],
      attachmentUrls: json['attachmentUrls'] != null
          ? List<String>.from(json['attachmentUrls'])
          : [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'timestamp': timestamp,
      'isRead': isRead,
      'type': type,
      'senderName': senderName,
      'senderFullName': senderFullName,
      'senderAvatar': senderAvatar,
      'attachmentUrls': attachmentUrls,
    };
  }

  NotificationModel copyWith({
    int? id,
    String? title,
    String? description,
    String? timestamp,
    bool? isRead,
    String? type,
    String? senderName,
    String? senderFullName,
    String? senderAvatar,
    List<String>? attachmentUrls,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
      type: type ?? this.type,
      senderName: senderName ?? this.senderName,
      senderFullName: senderFullName ?? this.senderFullName,
      senderAvatar: senderAvatar ?? this.senderAvatar,
      attachmentUrls: attachmentUrls ?? this.attachmentUrls,
    );
  }
  String get cleanDescription {
    if (description.isEmpty) return '';
    
    // 1. Remove hidden spans (specifically for "Đã duyệt" status hidden texts)
    // Matches <span style="display:none;">...</span>
    var text = description.replaceAll(
      RegExp(r'<span[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>.*?<\/span>', caseSensitive: false, multiLine: true), 
      ''
    );

    // 2. Convert HTML line breaks and paragraphs to newlines
    text = text.replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n');
    text = text.replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n');
    text = text.replaceAll(RegExp(r'<p[^>]*>', caseSensitive: false), '');

    // 3. Strip all remaining HTML tags
    text = text.replaceAll(RegExp(r'<[^>]*>'), '');
    
    // 4. Basic HTML entity decoding
    text = text.replaceAll('&nbsp;', ' ')
               .replaceAll('&quot;', '"')
               .replaceAll('&apos;', "'")
               .replaceAll('&lt;', '<')
               .replaceAll('&gt;', '>')
               .replaceAll('&amp;', '&');
               
    return text.trim();
  }

  String get firstLineDescription {
    final text = cleanDescription;
    final lines = text.split('\n');
    for (var line in lines) {
      final trimmed = line.trim();
      if (trimmed.isNotEmpty) return trimmed;
    }
    return text;
  }
}
