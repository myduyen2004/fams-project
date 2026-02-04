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
          IconButton(
            onPressed: () => _changeWeek(controller, -7),
            icon: Icon(Icons.chevron_left_rounded, color: Colors.orange[400], size: 26),
          ),
          Expanded(
            child: SizedBox(
              height: 94, // Reduced from 110
              child: Obx(() {
                // Accessing this ensures GetX registers the dependency
                final _ = controller.selectedDate.value;
                final __ = controller.weeklyTimetable.value; // Subscribe to schedule updates
                return ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: 7,
                  itemBuilder: (context, index) {
                    return _buildDayCard(controller, index);
                  },
                );
              }),
            ),
          ),
          IconButton(
            onPressed: () => _changeWeek(controller, 7),
            icon: Icon(Icons.chevron_right_rounded, color: Colors.orange[400], size: 26),
          ),
        ],
      ),
    );
  }

  Widget _buildDayCard(ScheduleController controller, int index) {
    final now = controller.selectedDate.value;
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final date = monday.add(Duration(days: index));
    final isSelected = _isSameDay(date, controller.selectedDate.value);
    
    // Check if this day has any slots
    final hasSchedule = controller.weeklyTimetable.value?.days.any((d) => 
      _isSameDay(d.date, date) && d.slots.isNotEmpty
    ) ?? false;

    final double screenWidth = Get.width;
    
    return GestureDetector(
      onTap: () => controller.selectDate(date),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: (Get.width - 110) / 5, 
        margin: const EdgeInsets.symmetric(horizontal: 2.5, vertical: 5),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryOrange : Colors.white,
          borderRadius: BorderRadius.circular(16),
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
              _getDayName(date.weekday),
              style: TextStyle(
                fontSize: 11,
                color: isSelected ? Colors.white70 : Colors.grey[500],
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "${date.day}/${date.month}",
              style: TextStyle(
                fontSize: 16,
                color: isSelected ? Colors.white : const Color(0xFF2D3436),
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            if (hasSchedule)
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : AppColors.primaryOrange,
                  shape: BoxShape.circle,
                ),
              )
            else
              const SizedBox(height: 4),
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
