/// Request type labels mapping
/// Based on web REQUEST_TYPE_LABELS

class RequestTypeLabels {
  RequestTypeLabels._();

  static const Map<String, String> labels = {
    'RESCHEDULE': 'Đổi lịch',
    'CANCEL': 'Hủy lịch',
    'SWAP': 'Đổi lịch',
    'ROOM_CHANGE': 'Đổi phòng',
  };

  static String getLabel(String type) {
    return labels[type] ?? type;
  }
}
