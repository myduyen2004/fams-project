import 'package:flutter/material.dart';
import '../models/create_request_models.dart';
import '../../../core/constants/app_colors.dart';

/// Widget for selecting a room with floor tabs
class RoomSelectionWidget extends StatelessWidget {
  final List<RoomAvailability> rooms;
  final RoomAvailability? selectedRoom;
  final Function(RoomAvailability) onRoomSelect;
  final int activeFloor;
  final Function(int) onFloorChange;
  final bool isLoading;
  final bool hasFilters;
  final String? selectedDate;
  final int? selectedSlot;

  const RoomSelectionWidget({
    super.key,
    required this.rooms,
    required this.selectedRoom,
    required this.onRoomSelect,
    required this.activeFloor,
    required this.onFloorChange,
    required this.isLoading,
    required this.hasFilters,
    this.selectedDate,
    this.selectedSlot,
  });

  List<RoomAvailability> get filteredRooms => 
      rooms.where((r) => r.floor == activeFloor).toList();

  Map<String, int> getFloorStats(int floor) {
    final floorRooms = rooms.where((r) => r.floor == floor).toList();
    final available = floorRooms.where((r) => r.isAvailable).length;
    return {'total': floorRooms.length, 'available': available};
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Chọn phòng học mới',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2D3436),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        hasFilters
                            ? 'Gamma Building • Ngày $selectedDate - Slot $selectedSlot'
                            : 'Chọn ngày và slot để xem phòng trống',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[500],
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (selectedRoom != null)
                  Flexible(
                    flex: 0,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 120),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryOrange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primaryOrange.withOpacity(0.3)),
                      ),
                      child: Text(
                        selectedRoom!.name,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryOrange,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Warning if no filters
          if (!hasFilters)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.amber[700], size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Vui lòng chọn Ngày thay đổi và Slot mới để xem trạng thái phòng trống.',
                      style: TextStyle(fontSize: 12, color: Colors.amber[800]),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),

          // Floor tabs and room grid
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Floor sidebar
              Container(
                width: 70,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(16),
                  ),
                ),
                child: Column(
                  children: [2, 3, 4].map((floor) {
                    final isActive = activeFloor == floor;
                    final stats = getFloorStats(floor);
                    return GestureDetector(
                      onTap: () => onFloorChange(floor),
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isActive ? AppColors.primaryOrange.withOpacity(0.1) : null,
                          borderRadius: BorderRadius.circular(8),
                          border: isActive 
                              ? Border.all(color: AppColors.primaryOrange, width: 2)
                              : null,
                        ),
                        child: Column(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isActive ? AppColors.primaryOrange : Colors.grey[200],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(
                                  'T$floor',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: isActive ? Colors.white : Colors.grey[600],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Tầng $floor',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                color: isActive ? AppColors.primaryOrange : Colors.grey[600],
                              ),
                            ),
                            if (hasFilters)
                              Text(
                                '${stats['available']}/${stats['total']}',
                                style: TextStyle(
                                  fontSize: 8,
                                  color: Colors.green[600],
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),

              // Room grid
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  constraints: const BoxConstraints(maxHeight: 280),
                  child: isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : filteredRooms.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.meeting_room_outlined, 
                                      size: 40, color: Colors.grey[300]),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Không có phòng học',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[400],
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : GridView.builder(
                              shrinkWrap: true,
                              physics: const ClampingScrollPhysics(),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 3,
                                childAspectRatio: 1.0,  // Taller cards to fit content
                                crossAxisSpacing: 6,
                                mainAxisSpacing: 6,
                              ),
                              itemCount: filteredRooms.length,
                              itemBuilder: (context, index) {
                                final room = filteredRooms[index];
                                final isSelected = selectedRoom?.id == room.id;
                                
                                return GestureDetector(
                                  onTap: room.isAvailable ? () => onRoomSelect(room) : null,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? AppColors.primaryOrange.withOpacity(0.1)
                                          : room.isAvailable
                                              ? Colors.white
                                              : Colors.grey[100],
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppColors.primaryOrange
                                            : Colors.grey[200]!,
                                        width: isSelected ? 2 : 1,
                                      ),
                                      boxShadow: room.isAvailable
                                          ? [
                                              BoxShadow(
                                                color: Colors.black.withOpacity(0.03),
                                                blurRadius: 4,
                                                offset: const Offset(0, 2),
                                              ),
                                            ]
                                          : null,
                                    ),
                                    child: Stack(
                                      children: [
                                        Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              // Room name
                                              Flexible(
                                                child: Text(
                                                  room.name,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.bold,
                                                    color: room.isAvailable
                                                        ? const Color(0xFF2D3436)
                                                        : Colors.grey[400],
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              // Status badge
                                              Container(
                                                padding: const EdgeInsets.symmetric(
                                                    horizontal: 4, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: room.isAvailable
                                                      ? Colors.green[50]
                                                      : Colors.grey[200],
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  room.isAvailable ? 'TRỐNG' : 'BẬN',
                                                  style: TextStyle(
                                                    fontSize: 8,
                                                    fontWeight: FontWeight.bold,
                                                    color: room.isAvailable
                                                        ? Colors.green[700]
                                                        : Colors.grey[500],
                                                  ),
                                                ),
                                              ),
                                              // Capacity
                                              Row(
                                                children: [
                                                  Icon(
                                                    Icons.people_outline,
                                                    size: 10,
                                                    color: Colors.grey[400],
                                                  ),
                                                  const SizedBox(width: 2),
                                                  Flexible(
                                                    child: Text(
                                                      '${room.capacity}',
                                                      style: TextStyle(
                                                        fontSize: 9,
                                                        color: Colors.grey[500],
                                                      ),
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (isSelected)
                                          Positioned(
                                            top: -4,
                                            right: -4,
                                            child: Container(
                                              width: 20,
                                              height: 20,
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryOrange,
                                                shape: BoxShape.circle,
                                                border: Border.all(color: Colors.white, width: 2),
                                              ),
                                              child: const Icon(
                                                Icons.check,
                                                size: 12,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ),
            ],
          ),

          // Legend
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: Colors.green[500],
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text('Trống', style: TextStyle(fontSize: 10, color: Colors.grey[600])),
                const SizedBox(width: 16),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text('Bận', style: TextStyle(fontSize: 10, color: Colors.grey[600])),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
