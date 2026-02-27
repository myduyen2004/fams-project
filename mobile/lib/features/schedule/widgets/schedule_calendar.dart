import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/schedule_controller.dart';

class ScheduleCalendar extends StatefulWidget {
  const ScheduleCalendar({super.key});

  @override
  State<ScheduleCalendar> createState() => _ScheduleCalendarState();
}

class _ScheduleCalendarState extends State<ScheduleCalendar> {
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    
    // Initial scroll after build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToSelectedDate(animate: false);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToSelectedDate({bool animate = true}) {
    if (!_scrollController.hasClients) return;
    
    final controller = Get.find<ScheduleController>();
    final date = controller.selectedDate.value;
    final index = date.weekday - 1; // 0 for Monday, 6 for Sunday
    
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = (screenWidth - 110) / 5 + 5; // cardWidth + horizontal margins
    
    final offset = (index * cardWidth).clamp(0.0, _scrollController.position.maxScrollExtent);
    
    if (animate) {
      _scrollController.animateTo(
        offset,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _scrollController.jumpTo(offset);
    }
  }

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
              height: 94,
              child: Obx(() {
                // Subscribe to date changes
                final date = controller.selectedDate.value;
                final _ = controller.weeklyTimetable.value;

                // Trigger scroll when date changes
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _scrollToSelectedDate();
                });

                return ListView.builder(
                  controller: _scrollController,
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
    
    final hasSchedule = controller.weeklyTimetable.value?.days.any((d) => 
      _isSameDay(d.date, date) && d.slots.isNotEmpty
    ) ?? false;

    return GestureDetector(
      onTap: () => controller.selectDate(date),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: (MediaQuery.of(context).size.width - 110) / 5, 
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
