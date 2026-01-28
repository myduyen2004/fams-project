import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/schedule_controller.dart';

class ScheduleCalendar extends StatelessWidget {
  const ScheduleCalendar({super.key});

  @override
  Widget build(BuildContext context) {
    final ScheduleController controller = Get.find<ScheduleController>();

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          SizedBox(
            width: 40,
            child: IconButton(
              onPressed: () => _changeWeek(controller, -7),
              padding: EdgeInsets.zero,
              icon: Icon(Icons.chevron_left_rounded, color: Colors.orange[400], size: 32),
            ),
          ),
          Expanded(
            child: SizedBox(
              height: 94, // Reduced from 110
              child: Obx(() {
                // Accessing this ensures GetX registers the dependency
                final _ = controller.selectedDate.value;
                return ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: 7, // Allow all 7 days of the week
                  itemBuilder: (context, index) {
                    return _buildDayCard(controller, index);
                  },
                );
              }),
            ),
          ),
          SizedBox(
            width: 40,
            child: IconButton(
              onPressed: () => _changeWeek(controller, 7),
              padding: EdgeInsets.zero,
              icon: const Icon(Icons.chevron_right_rounded, color: AppColors.primaryOrange, size: 32),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayCard(ScheduleController controller, int index) {
    final now = controller.selectedDate.value;
    // Always start from Monday of the current week
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final date = monday.add(Duration(days: index));
    final isSelected = _isSameDay(date, controller.selectedDate.value);

    return GestureDetector(
      onTap: () => controller.selectDate(date),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: (Get.width - 80) / 5, // Width - 2*40(buttons) / 5
        margin: const EdgeInsets.symmetric(horizontal: 0), // Removed horizontal margin to fit perfectly or rely on padding inside
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryOrange : Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: isSelected 
                ? AppColors.primaryOrange.withOpacity(0.3) 
                : Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "${_getDayName(date.weekday)}/${date.month}",
              style: TextStyle(
                fontSize: 10, // Slightly reduced to fit
                color: isSelected ? Colors.white70 : Colors.grey[500],
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              date.day.toString(),
              style: TextStyle(
                fontSize: 20, // Reduced from 22
                color: isSelected ? Colors.white : const Color(0xFF2D3436),
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            // Dot for slots
            Obx(() {
               bool hasSlots = false;
               if (controller.weeklyTimetable.value != null) {
                 final dayData = controller.weeklyTimetable.value!.days.firstWhereOrNull(
                   (d) => _isSameDay(d.date, date),
                 );
                 if (dayData != null && dayData.slots.isNotEmpty) {
                   hasSlots = true;
                 }
               }

               if (hasSlots) {
                 return Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.white : const Color(0xFFF2721E),
                      shape: BoxShape.circle,
                    ),
                 );
               } else {
                 return const SizedBox(height: 6);
               }
            }),
          ],
        ),
      ),
    );
  }

  void _changeWeek(ScheduleController controller, int days) {
    controller.selectDate(controller.selectedDate.value.add(Duration(days: days)));
  }

  String _getDayName(int weekday) {
    switch (weekday) {
      case 1: return 'Thứ 2';
      case 2: return 'Thứ 3';
      case 3: return 'Thứ 4';
      case 4: return 'Thứ 5';
      case 5: return 'Thứ 6';
      case 6: return 'Thứ 7';
      case 7: return 'CN';
      default: return '';
    }
  }

  bool _isSameDay(DateTime d1, DateTime d2) {
    return d1.year == d2.year && d1.month == d2.month && d1.day == d2.day;
  }
}
