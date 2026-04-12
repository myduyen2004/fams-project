import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/schedule_controller.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';

class ScheduleCalendar extends StatefulWidget {
  const ScheduleCalendar({super.key});

  @override
  State<ScheduleCalendar> createState() => _ScheduleCalendarState();
}

class _ScheduleCalendarState extends State<ScheduleCalendar> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final ScheduleController controller = Get.find<ScheduleController>();

    return Obx(() {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Calendar Navigator
          Container(
            padding: EdgeInsets.symmetric(horizontal: 0.w).copyWith(bottom: 18.h), // Reduced bottom padding for indicators
            child: Row(
              children: [
                IconButton(
                  onPressed: () => _changeWeek(controller, -7),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: Icon(SolarIconsOutline.altArrowLeft, color: AppColors.primaryOrange, size: 18.sp),
                ),
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: List.generate(7, (index) => _buildDayCard(controller, index)),
                  ),
                ),
                IconButton(
                  onPressed: () => _changeWeek(controller, 7),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  icon: Icon(SolarIconsOutline.altArrowRight, color: AppColors.primaryOrange, size: 18.sp),
                ),
              ],
            ),
          ),
        ],
      );
    });
  }

  Widget _buildDayCard(ScheduleController controller, int index) {
    final now = controller.selectedDate.value;
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final date = monday.add(Duration(days: index));
    final isSelected = _isSameDay(date, controller.selectedDate.value);
    final isToday = _isSameDay(date, DateTime.now());
    
    final Color textColor = const Color(0xFF264653);

    final hasSchedule = controller.weeklyTimetable.value?.days.any((d) => 
      _isSameDay(d.date, date) && d.slots.isNotEmpty
    ) ?? false;

    return Flexible(
      child: GestureDetector(
        onTap: () => controller.selectDate(date),
        behavior: HitTestBehavior.opaque,
        child: AnimatedScale(
          scale: isSelected ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 200),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // 1. Weekday Title
              Text(
                _getDayName(date.weekday),
                style: GoogleFonts.plusJakartaSans(
                   fontSize: 11.sp, // Reduced from 13
                   color: isSelected ? Theme.of(context).colorScheme.onSurface : Theme.of(context).colorScheme.onSurface.withOpacity(0.35),
                   fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                   letterSpacing: 0.5,
                ),
              ),
              SizedBox(height: 16.h), // Reduced from 22
              // 2. Date Number with optional circle/dot
              Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none, // Allow indicator to be positioned outside
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOutCubic,
                    width: 28.sp, // Reduced from 32
                    height: 28.sp,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primaryOrange : Colors.transparent,
                      shape: BoxShape.circle,
                      border: isSelected 
                          ? null 
                          : (isToday 
                              ? Border.all(color: AppColors.primaryOrange, width: 1.5) 
                              : null),
                    ),
                    child: Text(
                      date.day.toString(),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.sp, // Reduced from 15
                        color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      ),
                    ),
                  ),
                  // Bottom Indicator for active day
                  Positioned(
                    bottom: -15.h, // Positioned below the number
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOutCubic,
                      width: isSelected ? 18.w : 0.0, // Reduced from 22
                      height: 3.h, // Reduced from 3.5
                      decoration: BoxDecoration(
                        color: AppColors.primaryOrange,
                        borderRadius: BorderRadius.circular(10.r),
                      ),
                    ),
                  ),
                  // Dot for has schedule
                  if (hasSchedule && !isSelected)
                    Positioned(
                      bottom: -8.h,
                      child: Container(
                        width: 4.sp,
                        height: 4.sp,
                        decoration: BoxDecoration(
                          color: AppColors.primaryOrange.withOpacity(0.5),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _changeWeek(ScheduleController controller, int days) {
    controller.selectDate(controller.selectedDate.value.add(Duration(days: days)));
  }

  String _getDayName(int weekday) {
    switch (weekday) {
      case 1: return 'T2';
      case 2: return 'T3';
      case 3: return 'T4';
      case 4: return 'T5';
      case 5: return 'T6';
      case 6: return 'T7';
      case 7: return 'CN';
      default: return '';
    }
  }

  String _formatFullDate(DateTime date) {
    final weekdayStr = date.weekday == 7 ? 'Chủ nhật' : 'Thứ ${date.weekday + 1}';
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year;
    return '$weekdayStr, ngày $day tháng $month năm $year';
  }

  bool _isSameDay(DateTime d1, DateTime d2) {
    return d1.year == d2.year && d1.month == d2.month && d1.day == d2.day;
  }
}
