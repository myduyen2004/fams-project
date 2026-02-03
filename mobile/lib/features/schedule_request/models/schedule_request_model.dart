/// Model classes for Schedule Request feature
/// Based on web ScheduleRequest interface

class ScheduleRequest {
  final int id;
  final String className;
  final String originalSlotInfo;
  final int? originalSlotNumber;
  final String requestedSlotInfo;
  final int? requestedSlotNumber;
  final String type;
  final String typeLabel;
  final String reason;
  final String status;
  final String statusLabel;
  final String createdAt;
  final String? approverNote;
  final String? originalRoomName;
  final String? requestedRoomName;
  final String? requestedDate;
  final String? file;
  final String? approverName;
  final String? approvedAt;

  ScheduleRequest({
    required this.id,
    required this.className,
    required this.originalSlotInfo,
    this.originalSlotNumber,
    required this.requestedSlotInfo,
    this.requestedSlotNumber,
    required this.type,
    required this.typeLabel,
    required this.reason,
    required this.status,
    required this.statusLabel,
    required this.createdAt,
    this.approverNote,
    this.originalRoomName,
    this.requestedRoomName,
    this.requestedDate,
    this.file,
    this.approverName,
    this.approvedAt,
  });

  factory ScheduleRequest.fromJson(Map<String, dynamic> json) {
    return ScheduleRequest(
      id: json['id'] ?? 0,
      className: json['className'] ?? '',
      originalSlotInfo: json['originalSlotInfo'] ?? '',
      originalSlotNumber: json['originalSlotNumber'],
      requestedSlotInfo: json['requestedSlotInfo'] ?? '',
      requestedSlotNumber: json['requestedSlotNumber'],
      type: json['type'] ?? '',
      typeLabel: json['typeLabel'] ?? '',
      reason: json['reason'] ?? '',
      status: json['status'] ?? '',
      statusLabel: json['statusLabel'] ?? '',
      createdAt: json['createdAt'] ?? '',
      approverNote: json['approverNote'],
      originalRoomName: json['originalRoomName'],
      requestedRoomName: json['requestedRoomName'],
      requestedDate: json['requestedDate'],
      file: json['file'],
      approverName: json['approverName'],
      approvedAt: json['approvedAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'className': className,
      'originalSlotInfo': originalSlotInfo,
      'originalSlotNumber': originalSlotNumber,
      'requestedSlotInfo': requestedSlotInfo,
      'requestedSlotNumber': requestedSlotNumber,
      'type': type,
      'typeLabel': typeLabel,
      'reason': reason,
      'status': status,
      'statusLabel': statusLabel,
      'createdAt': createdAt,
      'approverNote': approverNote,
      'originalRoomName': originalRoomName,
      'requestedRoomName': requestedRoomName,
      'requestedDate': requestedDate,
      'file': file,
      'approverName': approverName,
      'approvedAt': approvedAt,
    };
  }
}

class ScheduleRequestPage {
  final List<ScheduleRequest> content;
  final int totalPages;
  final int totalElements;
  final int size;
  final int number;

  ScheduleRequestPage({
    required this.content,
    required this.totalPages,
    required this.totalElements,
    required this.size,
    required this.number,
  });

  factory ScheduleRequestPage.fromJson(Map<String, dynamic> json) {
    return ScheduleRequestPage(
      content: (json['content'] as List? ?? [])
          .map((e) => ScheduleRequest.fromJson(e))
          .toList(),
      totalPages: json['totalPages'] ?? 0,
      totalElements: json['totalElements'] ?? 0,
      size: json['size'] ?? 10,
      number: json['number'] ?? 0,
    );
  }
}
