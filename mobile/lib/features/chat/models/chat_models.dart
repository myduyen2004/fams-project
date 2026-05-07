/// Chat data models — mirrors web TypeScript interfaces

class ChatMember {
  final int id;
  final String code;
  final String fullName;
  final String role;
  final String? avatarUrl;

  ChatMember({
    required this.id,
    required this.code,
    required this.fullName,
    required this.role,
    this.avatarUrl,
  });

  factory ChatMember.fromJson(Map<String, dynamic> json) {
    print('DEBUG: ChatMember.fromJson raw: $json');
    return ChatMember(
      id: int.tryParse(json['userId']?.toString() ?? '0') ?? 0,
      code: json['code']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      avatarUrl: json['avatar']?.toString(),
    );
  }
}

class LastMessage {
  final String senderName;
  final String content;
  final String type;
  final String sentAt;
  final bool deleted;

  LastMessage({
    required this.senderName,
    required this.content,
    required this.type,
    required this.sentAt,
    this.deleted = false,
  });

  factory LastMessage.fromJson(Map<String, dynamic> json) {
    return LastMessage(
      senderName: json['senderName']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      type: json['type']?.toString() ?? 'TEXT',
      sentAt: json['sentAt']?.toString() ?? '',
      deleted: json['deleted'] ?? false,
    );
  }
}

class ChatGroup {
  final int id;
  final String name;
  final String className;
  final String type;
  final String lecturerName;
  final int memberCount;
  final String createdAt;
  final LastMessage? lastMessage;
  final List<ChatMember>? members;
  int unreadCount;
  int? firstUnreadMessageId;

  ChatGroup({
    required this.id,
    required this.name,
    required this.className,
    required this.type,
    required this.lecturerName,
    required this.memberCount,
    required this.createdAt,
    this.lastMessage,
    this.members,
    this.unreadCount = 0,
    this.firstUnreadMessageId,
  });

  factory ChatGroup.fromJson(Map<String, dynamic> json) {
    return ChatGroup(
      id: int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? '',
      className: json['className']?.toString() ?? '',
      type: json['type']?.toString() ?? 'CLASS',
      lecturerName: json['lecturerName']?.toString() ?? '',
      memberCount: int.tryParse(json['memberCount']?.toString() ?? '0') ?? 0,
      createdAt: json['createdAt']?.toString() ?? '',
      lastMessage: json['lastMessage'] != null
          ? LastMessage.fromJson(json['lastMessage'] as Map<String, dynamic>)
          : null,
      members: json['members'] != null
          ? (json['members'] as List)
                .map((m) => ChatMember.fromJson(m as Map<String, dynamic>))
                .toList()
          : [],
      unreadCount: int.tryParse(json['unreadCount']?.toString() ?? '0') ?? 0,
      firstUnreadMessageId: json['firstUnreadMessageId'] != null
          ? int.tryParse(json['firstUnreadMessageId'].toString())
          : null,
    );
  }
}

class ReadReceipt {
  final int userId;
  final String fullName;
  final String? avatarUrl;

  ReadReceipt({required this.userId, required this.fullName, this.avatarUrl});

  factory ReadReceipt.fromJson(Map<String, dynamic> json) {
    return ReadReceipt(
      userId: int.tryParse(json['userId']?.toString() ?? '0') ?? 0,
      fullName: json['fullName'] ?? '',
      avatarUrl: json['avatar'],
    );
  }
}

class MessageReaction {
  final String emoji;
  final int count;
  final bool reactedByMe;

  MessageReaction({
    required this.emoji,
    required this.count,
    required this.reactedByMe,
  });

  factory MessageReaction.fromJson(Map<String, dynamic> json) {
    return MessageReaction(
      emoji: json['emoji']?.toString() ?? '',
      count: int.tryParse(json['count']?.toString() ?? '0') ?? 0,
      reactedByMe: json['reactedByMe'] == true,
    );
  }
}

class ChatMessage {
  final int id;
  final int groupId;
  final int senderId;
  final String senderName;
  final String senderRole;
  final String? senderAvatarUrl;
  final String content;
  final String type; // TEXT, IMAGE, FILE, LINK, IMAGE_GROUP
  final String? attachmentUrl;
  final String? attachmentName;
  final bool isOwn;
  final String sentAt;
  bool deleted;
  final int? replyToId;
  final String? replyToContent;
  final String? replyToSenderName;
  final String? replyToType;
  final List<ChatMessage>? imageMessages; // For IMAGE_GROUP
  final List<MessageReaction> reactions;
  final bool isSending;
  List<ReadReceipt> readBy;

  ChatMessage({
    required this.id,
    required this.groupId,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    this.senderAvatarUrl,
    required this.content,
    required this.type,
    this.attachmentUrl,
    this.attachmentName,
    required this.isOwn,
    required this.sentAt,
    this.deleted = false,
    this.replyToId,
    this.replyToContent,
    this.replyToSenderName,
    this.replyToType,
    this.imageMessages,
    this.reactions = const [],
    this.isSending = false,
    List<ReadReceipt>? readBy,
  }) : readBy = readBy ?? [];

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final bool isDeleted = json['isDeleted'] ?? false;
    return ChatMessage(
      id: int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      groupId: int.tryParse(json['groupId']?.toString() ?? '0') ?? 0,
      senderId: int.tryParse(json['senderId']?.toString() ?? '0') ?? 0,
      senderName: json['senderName'] ?? '',
      senderRole: json['senderRole'] ?? '',
      senderAvatarUrl: json['senderAvatar'],
      content: isDeleted ? 'Tin nhắn đã được thu hồi' : (json['content'] ?? ''),
      type: json['type'] ?? 'TEXT',
      attachmentUrl: json['attachmentUrl'],
      attachmentName: json['attachmentName'],
      isOwn: json['isOwn'] ?? false,
      sentAt: json['sentAt'] ?? '',
      deleted: isDeleted,
      replyToId: json['replyToId'] != null
          ? int.tryParse(json['replyToId'].toString())
          : null,
      replyToContent: json['replyToContent'],
      replyToSenderName: json['replyToSenderName'],
      replyToType: json['replyToType'],
      reactions: json['reactions'] != null
          ? (json['reactions'] as List)
                .map((r) => MessageReaction.fromJson(r as Map<String, dynamic>))
                .toList()
          : const [],
      isSending: json['isSending'] == true,
      readBy: json['readers'] != null
          ? (json['readers'] as List)
                .map((r) => ReadReceipt.fromJson(r))
                .toList()
          : [],
    );
  }
}
