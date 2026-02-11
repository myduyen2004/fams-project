/// Models for Create Request feature

/// Represents a class slot from the API
class ClassSlot {
  final int id;
  final int slotNumber;
  final int roomId;
  final String roomName;
  final String date;
  final int dayOfWeek;

  ClassSlot({
    required this.id,
    required this.slotNumber,
    required this.roomId,
    required this.roomName,
    required this.date,
    required this.dayOfWeek,
  });

  factory ClassSlot.fromJson(Map<String, dynamic> json) {
    return ClassSlot(
      id: json['id'] ?? 0,
      slotNumber: json['slotNumber'] ?? 0,
      roomId: json['roomId'] ?? 0,
      roomName: json['roomName'] ?? '',
      date: json['date'] ?? '',
      dayOfWeek: json['dayOfWeek'] ?? 0,
    );
  }
}

/// Represents a room with availability status
class RoomAvailability {
  final int id;
  final String name;
  final int floor;
  final int capacity;
  final String building;
  final String status;
  final bool isAvailable;

  RoomAvailability({
    required this.id,
    required this.name,
    required this.floor,
    required this.capacity,
    required this.building,
    required this.status,
    required this.isAvailable,
  });

  factory RoomAvailability.fromJson(Map<String, dynamic> json) {
    return RoomAvailability(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      floor: json['floor'] ?? 0,
      capacity: json['capacity'] ?? 0,
      building: json['building'] ?? '',
      status: json['status'] ?? '',
      isAvailable: json['isAvailable'] ?? false,
    );
  }
}

/// Payload for creating a schedule request
class CreateRequestPayload {
  final int originalSlotId;
  final String type;
  final String reason;
  final String? requestedDate;
  final int? requestedSlotTypeId;
  final int? requestedRoomId;
  final String? file; // JSON string of URLs

  CreateRequestPayload({
    required this.originalSlotId,
    required this.type,
    required this.reason,
    this.requestedDate,
    this.requestedSlotTypeId,
    this.requestedRoomId,
    this.file,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'originalSlotId': originalSlotId,
      'type': type,
      'reason': reason,
    };
    if (requestedDate != null) map['requestedDate'] = requestedDate;
    if (requestedSlotTypeId != null) map['requestedSlotTypeId'] = requestedSlotTypeId;
    if (requestedRoomId != null) map['requestedRoomId'] = requestedRoomId;
    if (file != null) map['file'] = file;
    return map;
  }
}

/// Represents a conflict item (Student, Lecturer, Pending Request)
class ConflictItem {
  final String type;
  final String message;
  final int? count;

  ConflictItem({
    required this.type,
    required this.message,
    this.count,
  });

  factory ConflictItem.fromJson(Map<String, dynamic> json) {
    return ConflictItem(
      type: json['type'] ?? '',
      message: json['message'] ?? '',
      count: json['count'],
    );
  }
}

/// Represents the response for conflict check API
class ConflictCheckResponse {
  final List<ConflictItem> conflicts;
  final bool hasConflict;

  ConflictCheckResponse({
    required this.conflicts,
    required this.hasConflict,
  });

  factory ConflictCheckResponse.fromJson(Map<String, dynamic> json) {
    return ConflictCheckResponse(
      conflicts: (json['conflicts'] as List? ?? [])
          .map((item) => ConflictItem.fromJson(item))
          .toList(),
      hasConflict: json['hasConflict'] ?? false,
    );
  }
}
