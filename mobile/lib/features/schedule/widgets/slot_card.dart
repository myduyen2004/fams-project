import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../models/schedule_model.dart';
import 'package:add_2_calendar/add_2_calendar.dart';

import 'package:get/get.dart';
import '../../auth/controllers/auth_controller.dart';
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

      return GestureDetector(
        onTap: () => Get.to(() => SlotDetailScreen(slot: slot)),
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            // ONLY active slot gets the orange border and glow
            border: isActive 
                ? Border.all(color: AppColors.primaryOrange, width: 1.5)
                : null,
            boxShadow: [
              if (isActive)
                BoxShadow(
                  color: AppColors.primaryOrange.withOpacity(0.3),
                  blurRadius: 20,
                  spreadRadius: 1,
                  offset: const Offset(0, 4),
                )
              else
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Always show Slot Number
              Text(
                'Slot ${slot.slotNumber ?? '?' }',
                style: GoogleFonts.inter(
                  color: AppColors.primaryOrange,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 4),
              IntrinsicHeight(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Text(
                        slot.courseCode ?? 'COURSE',
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF2D3436),
                          letterSpacing: -0.5,
                          height: 1.0, // Remove line height internal padding
                        ),
                      ),
                    ),
                    if (Get.find<AuthController>().currentUser.value?.role != 'LECTURER') 
                      _buildSmallBadge(_getAttendanceStatusText(slot, controller)),
                  ],
                ),
              ),
              
              // If active, show progress bar
              if (isActive) ...[
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
                          minHeight: 6,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Còn ${controller.timeLeftStr.value}',
                      style: GoogleFonts.inter(
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
              
              const SizedBox(height: 16),
              
              // Unified Information Layout: Phòng -> Lớp -> Giờ -> GV
              _buildInfoItem(Icons.location_on_rounded, slot.roomCode ?? 'Online'),
              const SizedBox(height: 8),
              _buildInfoItem(Icons.people_alt_rounded, slot.className ?? 'N/A'),
              const SizedBox(height: 8),
              _buildInfoItem(Icons.access_time_filled_rounded, "${_formatTime(slot.startTime)} - ${_formatTime(slot.endTime)}"),
              const SizedBox(height: 8),
              _buildInfoItem(Icons.person_rounded, slot.lecturerName ?? 'N/A'),
            ],
          ),
        ),
      );
    });
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
          style: GoogleFonts.inter(
            fontSize: 12,
            color: const Color(0xFF2D3436),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildSmallBadge(String status) {
    Color bgColor = const Color(0xFFE9EEF5);
    Color textColor = const Color(0xFFB2BEC3);
    
    if (status == 'Có mặt') {
      bgColor = const Color(0xFFE8F5E9);
      textColor = const Color(0xFF27AE60);
    } else if (status == 'Vắng') {
      bgColor = const Color(0xFFFFEBEE);
      textColor = const Color(0xFFE53935);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: TextStyle(color: textColor, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.2),
      ),
    );
  }

  String _getAttendanceStatusText(TimetableSlot slot, ScheduleController controller) {
    if (slot.attendanceStatus == 'PRESENT') return 'Có mặt';
    if (slot.attendanceStatus == 'ABSENT') return 'Vắng';

    if (slot.startTime == null || slot.date == null) {
      return 'Chưa điểm danh';
    }

    try {
      final now = controller.currentTime.value;
      final startParts = slot.startTime!.split(':');
      final startDate = DateTime(
        slot.date.year,
        slot.date.month,
        slot.date.day,
        int.parse(startParts[0]),
        int.parse(startParts[1]),
      );

      final threshold = slot.absentThresholdMinutes ?? controller.attendanceConfig.value.absentThresholdMinutes;
      final limitTime = startDate.add(Duration(minutes: threshold));

      if (now.isAfter(limitTime)) {
        return 'Vắng';
      }
      return 'Chưa điểm danh';
    } catch (e) {
      return 'Chưa điểm danh';
    }
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
