import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../models/schedule_model.dart';
import 'package:add_2_calendar/add_2_calendar.dart';

import 'package:get/get.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/schedule_controller.dart';
import '../views/slot_detail_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';

class SlotCard extends StatefulWidget {
  final TimetableSlot slot;

  const SlotCard({super.key, required this.slot});

  @override
  State<SlotCard> createState() => _SlotCardState();
}

class _SlotCardState extends State<SlotCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheduleController = Get.find<ScheduleController>();
    
    return Obx(() {
      final isActive = scheduleController.activeSlot.value?.id == widget.slot.id;
      final isLecturer = Get.find<AuthController>().currentUser.value?.isLecturer ?? false;
      final attendanceStatus = isLecturer 
          ? _getLecturerStatusText(widget.slot, scheduleController)
          : _getAttendanceStatusText(widget.slot, scheduleController);
      
      return GestureDetector(
        onTap: () => Get.to(() => SlotDetailScreen(slot: widget.slot)),
        child: AnimatedBuilder(
          animation: _animation,
          builder: (context, child) {
            return Container(
              margin: EdgeInsets.only(bottom: 24.h),
              padding: EdgeInsets.all(20.w),
              decoration: BoxDecoration(
                color: isActive 
                    ? const Color(0xFFFEF4E8).withOpacity(Theme.of(context).brightness == Brightness.dark ? _animation.value * 0.1 : _animation.value) 
                    : Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(24.r),
                border: Border.all(
                  color: isActive ? const Color(0xFFFDE4C8).withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.1 : 1.0) : (Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.grey[100]!),
                  width: 1.w,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isActive 
                        ? AppColors.primaryOrange.withOpacity(0.2 * _animation.value) 
                        : Colors.black.withOpacity(0.2),
                    blurRadius: isActive ? 45.r : 35.r,
                    spreadRadius: isActive ? 2.r : 0,
                    offset: Offset(0, 12.h),
                  ),
                ],
              ),
              child: child,
            );
          },
          child: IntrinsicHeight(
            child: Row(
              children: [
                // 1. Time Column
                SizedBox(
                  width: 68.w,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'SLOT ${widget.slot.slotNumber ?? '?' }',
                        style: GoogleFonts.plusJakartaSans(
                          color: isActive ? AppColors.primaryOrange : Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          fontWeight: FontWeight.w700,
                          fontSize: 10.sp,
                          letterSpacing: 0.5,
                        ),
                      ),
                      SizedBox(height: 8.h),
                      Text(
                        _formatTime(widget.slot.startTime),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18.sp,
                          fontWeight: FontWeight.w800,
                          color: isActive ? const Color(0xFFB35A00) : Theme.of(context).colorScheme.onSurface,
                          height: 1.0,
                        ),
                      ),
                      SizedBox(height: 4.h),
                      Text(
                        _formatTime(widget.slot.endTime),
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12.sp,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Vertical Divider
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16.w),
                  child: VerticalDivider(
                    color: isActive ? const Color(0xFFFDE4C8).withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 1.0) : (Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : Colors.grey[200]),
                    thickness: 1,
                  ),
                ),
                
                // 2. Info Column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Status & Meta info
                      Row(
                        children: [
                          _buildStatusTag(attendanceStatus),
                          SizedBox(width: 8.w),
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Text(
                                '${widget.slot.roomCode ?? "Online"} • ${widget.slot.className?.split('-').first ?? "N/A"}',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12.sp,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                ),
                              ),
                            ),
                          ),
                          if (isActive)
                            Icon(SolarIconsOutline.feed, color: AppColors.primaryOrange, size: 16.sp),
                        ],
                      ),
                      SizedBox(height: 10.h),
                      
                      // Subject Name
                      Text(
                        '${widget.slot.courseCode}: ${widget.slot.courseName ?? ""}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context).colorScheme.onSurface,
                          letterSpacing: -0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      
                      SizedBox(height: 12.h),
                      
                      // Teacher & Action
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 28.sp,
                                height: 28.sp,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : Colors.grey[100],
                                  border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.grey[200]!, width: 1),
                                  image: widget.slot.lecturerAvatar != null && widget.slot.lecturerAvatar!.isNotEmpty
                                      ? DecorationImage(
                                          image: NetworkImage(widget.slot.lecturerAvatar!),
                                          fit: BoxFit.cover,
                                        )
                                      : null,
                                ),
                                child: widget.slot.lecturerAvatar == null || widget.slot.lecturerAvatar!.isEmpty
                                    ? Icon(SolarIconsOutline.user, size: 16.sp, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4))
                                    : null,
                              ),
                              SizedBox(width: 8.w),
                              Text(
                                widget.slot.lecturerName != null ? 'GV. ${widget.slot.lecturerName}' : 'N/A',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12.sp,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _buildStatusTag(String attendanceStatus) {
    String text = 'CHƯA ĐIỂM DANH';
    Color color = const Color(0xFF636E72);
    Color bgColor = const Color(0xFFF1F2F6);
    
    if (attendanceStatus == 'Có mặt') {
      text = 'CÓ MẶT';
      color = const Color(0xFF27AE60);
      bgColor = const Color(0xFFE8F5E9);
    } else if (attendanceStatus == 'Vắng') {
      text = 'VẮNG';
      color = const Color(0xFFE53935);
      bgColor = const Color(0xFFFFEBEE);
    } else if (attendanceStatus == 'Đang diễn ra') {
      text = 'ĐANG DIỄN RA';
      color = const Color(0xFFF2994A);
      bgColor = const Color(0xFFFFF4E8);
    } else if (attendanceStatus == 'Chưa diễn ra') {
      text = 'CHƯA DIỄN RA';
      color = const Color(0xFF2D9CDB);
      bgColor = const Color(0xFFE3F2FD);
    } else if (attendanceStatus == 'Đã kết thúc') {
      text = 'ĐÃ KẾT THÚC';
      color = const Color(0xFF828282);
      bgColor = const Color(0xFFF2F2F2);
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8.r),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 4.sp,
            height: 4.sp,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          SizedBox(width: 6.w),
          Text(
            text,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9.sp,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: 0.5,
            ),
          ),
        ],
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

  String _getAttendanceStatusText(TimetableSlot slot, ScheduleController controller) {
    // 1. If already marked PRESENT
    if (slot.attendanceStatus == 'PRESENT') return 'Có mặt';
    
    // 2. If already marked ABSENT
    if (slot.attendanceStatus == 'ABSENT') return 'Vắng';

    if (slot.startTime == null || slot.date == null) return 'Chưa điểm danh';

    try {
      final now = controller.currentTime.value;
      final startParts = slot.startTime!.split(':');
      final startDate = DateTime(
        slot.date.year, slot.date.month, slot.date.day,
        int.parse(startParts[0]), int.parse(startParts[1]),
      );

      final threshold = slot.absentThresholdMinutes ?? controller.attendanceConfig.value.absentThresholdMinutes;
      final limitTime = startDate.add(Duration(minutes: threshold));

      // 3. If time passed the attendance threshold
      if (now.isAfter(limitTime)) return 'Vắng';
      
      // 4. Before or during attendance window but not yet marked
      return 'Chưa điểm danh';
    } catch (e) {
      return 'Chưa điểm danh';
    }
  }

  String _getLecturerStatusText(TimetableSlot slot, ScheduleController controller) {
    if (slot.startTime == null || slot.endTime == null || slot.date == null) return 'Chưa diễn ra';

    try {
      final now = controller.currentTime.value;
      
      final startParts = slot.startTime!.split(':');
      final endParts = slot.endTime!.split(':');
      
      final start = DateTime(
        slot.date.year, slot.date.month, slot.date.day,
        int.parse(startParts[0]), int.parse(startParts[1]),
      );
      
      final end = DateTime(
        slot.date.year, slot.date.month, slot.date.day,
        int.parse(endParts[0]), int.parse(endParts[1]),
      );

      if (now.isAfter(end)) {
        return 'Đã kết thúc';
      } else if (now.isBefore(start)) {
        return 'Chưa diễn ra';
      } else {
        return 'Đang diễn ra';
      }
    } catch (e) {
      return 'Chưa diễn ra';
    }
  }

  void _addToCalendar(TimetableSlot slot) {
    if (slot.startTime == null || slot.endTime == null || slot.date == null) return;
    try {
      final date = DateTime.parse(slot.date!.toString());
      final startParts = slot.startTime!.split(':');
      final endParts = slot.endTime!.split(':');
      
      final start = DateTime(date.year, date.month, date.day, int.parse(startParts[0]), int.parse(startParts[1]));
      final end = DateTime(date.year, date.month, date.day, int.parse(endParts[0]), int.parse(endParts[1]));

      final event = Event(
        title: "${slot.courseCode}: ${slot.courseName ?? ''}",
        description: "Phòng: ${slot.roomCode}\nGiảng viên: ${slot.lecturerName}",
        location: slot.roomCode ?? 'Online',
        startDate: start,
        endDate: end,
      );

      Add2Calendar.addEvent2Cal(event);
    } catch (e) {
      Get.snackbar("Lỗi", "Không thể thêm vào lịch", snackPosition: SnackPosition.BOTTOM);
    }
  }
}
