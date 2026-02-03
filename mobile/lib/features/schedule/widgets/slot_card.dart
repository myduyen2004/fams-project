import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../models/schedule_model.dart';
import 'package:add_2_calendar/add_2_calendar.dart';

import 'package:get/get.dart';
import '../controllers/schedule_controller.dart';
import '../views/slot_detail_screen.dart';

class SlotCard extends StatelessWidget {
  final TimetableSlot slot;

  const SlotCard({super.key, required this.slot});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ScheduleController>();
    
    return Obx(() {
      final isActive = controller.activeSlot.value?.id == slot.id;
      final isNext = controller.nextSlot.value?.id == slot.id;

      if (isActive) {
        return _buildActiveCard(context, controller);
      } else if (isNext) {
        return _buildStatusCard(context, controller, isNext: true);
      } else {
        return _buildStatusCard(context, controller, isNext: false);
      }
    });
  }

  Widget _buildActiveCard(BuildContext context, ScheduleController controller) {
    return GestureDetector(
      onTap: () => Get.to(() => SlotDetailScreen(slot: slot)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.primaryOrange, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryOrange.withOpacity(0.4),
              blurRadius: 25,
              spreadRadius: 2,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Đang diễn ra',
              style: GoogleFonts.roboto(
                color: AppColors.primaryOrange,
                fontWeight: FontWeight.w900,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              slot.courseCode ?? 'COURSE',
              style: GoogleFonts.roboto(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF2D3436),
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: controller.activeProgress.value,
                      backgroundColor: const Color(0xFFF1F2F6),
                      color: AppColors.primaryOrange,
                      minHeight: 8,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Obx(() => Text(
                  'Còn ${controller.timeLeftStr.value}',
                  style: GoogleFonts.roboto(
                    color: AppColors.primaryOrange,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                )),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoItem(Icons.access_time_filled_rounded, "${_formatTime(slot.startTime)} - ${_formatTime(slot.endTime)}"),
            const SizedBox(height: 8),
            _buildInfoItem(Icons.people_alt_rounded, slot.className ?? 'N/A'),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoItem(Icons.location_on_rounded, slot.roomCode ?? 'Online'),
                const SizedBox(width: 8),
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F2F6),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('s', style: TextStyle(color: Color(0xFF74B9FF), fontWeight: FontWeight.w900, fontSize: 9)),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          slot.lecturerName ?? 'N/A',
                          style: const TextStyle(color: Color(0xFF2D3436), fontWeight: FontWeight.w800, fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(BuildContext context, ScheduleController controller, {required bool isNext}) {
    return GestureDetector(
      onTap: () => Get.to(() => SlotDetailScreen(slot: slot)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: isNext ? Colors.white : Colors.white.withOpacity(0.6),
          borderRadius: BorderRadius.circular(20),
          boxShadow: isNext ? [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ] : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Slot ${slot.slotNumber ?? ''}',
                  style: GoogleFonts.roboto(
                    color: AppColors.primaryOrange,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    letterSpacing: 0.3,
                  ),
                ),
                if (isNext) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Tiếp theo',
                      style: GoogleFonts.roboto(
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.w500,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  slot.courseCode ?? 'COURSE',
                  style: GoogleFonts.roboto(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF2D3436), letterSpacing: -0.3),
                ),
                Row(
                  children: [
                    _buildCalendarButton(),
                  ],
                )
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoItem(Icons.meeting_room_rounded, slot.roomCode ?? 'Online'),
            const SizedBox(height: 8),
            _buildInfoItem(Icons.people_alt_rounded, slot.className ?? 'N/A'),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildInfoItem(Icons.access_time_filled_rounded, "${_formatTime(slot.startTime)} - ${_formatTime(slot.endTime)}"),
                const SizedBox(width: 8),
                Container(width: 1.5, height: 14, color: const Color(0xFFE9EEF5)),
                const SizedBox(width: 8),
                Icon(Icons.person_rounded, size: 15, color: const Color(0xFFB2BEC3)),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    slot.lecturerName ?? 'N/A',
                    style: const TextStyle(color: Color(0xFFB2BEC3), fontSize: 12, fontWeight: FontWeight.w800),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String? time) {
    if (time == null) return 'N/A';
    final parts = time.split(':');
    if (parts.length >= 2) {
      return "${parts[0]}:${parts[1]}";
    }
    return time;
  }

  Widget _buildInfoItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: const Color(0xFFB2BEC3)),
        const SizedBox(width: 8),
        Text(
          text,
          style: GoogleFonts.roboto(
            fontSize: 12,
            color: const Color(0xFF2D3436),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildSmallBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFE9EEF5),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: const TextStyle(color: Color(0xFFB2BEC3), fontSize: 10, fontWeight: FontWeight.w900),
      ),
    );
  }

  Widget _buildCalendarButton() {
    return InkWell(
      onTap: () => _addToCalendar(slot),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.primaryOrange),
      ),
    );
  }

  void _addToCalendar(TimetableSlot slot) {
    if (slot.startTime == null || slot.endTime == null || slot.date == null) return;
    
    // Parse date and time
    // Assuming slot.date is in ISO format (yyyy-MM-dd) or DateTime object
    // And slot.startTime is "HH:mm:ss" or "HH:mm"
    
    try {
      final date = DateTime.parse(slot.date!.toString());
      final startParts = slot.startTime!.split(':');
      final endParts = slot.endTime!.split(':');
      
      final start = DateTime(
        date.year, 
        date.month, 
        date.day, 
        int.parse(startParts[0]), 
        int.parse(startParts[1])
      );
      
      final end = DateTime(
        date.year, 
        date.month, 
        date.day, 
        int.parse(endParts[0]), 
        int.parse(endParts[1])
      );

      final event = Event(
        title: "${slot.courseCode} - ${slot.courseName ?? ''}",
        description: "Class: ${slot.className}\nLecturer: ${slot.lecturerName}\nRoom: ${slot.roomCode}",
        location: slot.roomCode ?? 'Online',
        startDate: start,
        endDate: end,
        iosParams: const IOSParams(
          reminder: Duration(minutes: 15),
        ),
        androidParams: const AndroidParams(
          emailInvites: [],
        ),
      );

      Add2Calendar.addEvent2Cal(event);
    } catch (e) {
      print("Error adding to calendar: $e");
      Get.snackbar("Lỗi", "Không thể thêm vào lịch", snackPosition: SnackPosition.BOTTOM);
    }
  }
}
