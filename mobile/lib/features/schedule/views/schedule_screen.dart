import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/schedule_controller.dart';
import '../widgets/schedule_calendar.dart';
import '../widgets/slot_card.dart';
import 'qr_scanner_screen.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';

import '../../../core/widgets/app_background.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  late ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToActiveSlot() {
    if (!_scrollController.hasClients) return;
    
    final controller = Get.find<ScheduleController>();
    if (controller.selectedDaySlots.isEmpty) return;

    // ✨ Prioritize the slot requested from Home Screen
    final targetSlot = controller.requestedScrollSlot.value ?? 
                       controller.activeSlot.value ?? 
                       controller.nextSlot.value;
    
    if (targetSlot == null) return;

    final index = controller.selectedDaySlots.indexOf(targetSlot);
    if (index == -1) return;

    // Reset requested slot so we don't keep jumping back on every build
    controller.requestedScrollSlot.value = null;

    // Typical SlotCard height is around 120-140px. Let's aim for a middle-ground.
    final double estimateItemHeight = 145.h; // Responsive height
    final offset = (index * estimateItemHeight).clamp(0.0, _scrollController.position.maxScrollExtent);

    _scrollController.animateTo(
      offset,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final ScheduleController controller = Get.put(ScheduleController());

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFFFEF3DE), // Peach-like light orange
            Colors.white,
          ],
          stops: const [0.0, 0.3], // Soft fade 
        ),
      ),
      child: Column(
        children: [
          // 1. Redesigned Top Header
          Padding(
            padding: EdgeInsets.fromLTRB(24.w, 32.h, 24.w, 4.h), // Reduced padding
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => _showSemesterPicker(context, controller),
                  child: Icon(SolarIconsOutline.altArrowDown, color: AppColors.primaryOrange, size: 24.sp),
                ),
                SizedBox(width: 12.w),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _showSemesterPicker(context, controller),
                    child: Obx(() => Text(
                      controller.selectedSemester.value?.name.toUpperCase() ?? 'KỲ HỌC',
                      style: GoogleFonts.beVietnamPro(
                        fontSize: 14.sp, // Even smaller
                        fontWeight: FontWeight.w600, // Even lighter
                        color: AppColors.primaryOrange.withOpacity(0.9),
                        letterSpacing: -0.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    )),
                  ),
                ),
                Obx(() => Text(
                  '${controller.selectedDate.value.year}',
                  style: GoogleFonts.beVietnamPro(
                    fontSize: 13.sp, 
                    fontWeight: FontWeight.w700, 
                    color: Colors.grey[400],
                  ),
                )),
                SizedBox(width: 8.w),
                GestureDetector(
                  onTap: () => _showYearPicker(context, controller),
                  child: Icon(SolarIconsBold.calendar, color: AppColors.primaryOrange, size: 24.sp),
                ),
              ],
            ),
          ),
                    // 3. New Title Section (Moved up)
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Obx(() => Text(
                      _getWeekdayNameAllCaps(controller.selectedDate.value.weekday),
                      style: GoogleFonts.beVietnamPro(
                        fontSize: 10.sp, // Smaller caps text
                        fontWeight: FontWeight.w600, // Even lighter
                        color: AppColors.primaryOrange.withOpacity(0.6),
                        letterSpacing: 2.0,
                      ),
                    )),
                    SizedBox(height: 4.h),
                    Obx(() => Text(
                      '${controller.isLecturer ? 'Lịch dạy' : 'Lịch học'} ${controller.selectedDate.value.year}',
                      style: GoogleFonts.beVietnamPro(
                        fontSize: 20.sp, // Even more compact
                        fontWeight: FontWeight.w700, // Bold but not heavy
                        color: const Color(0xFF2D3436).withOpacity(0.85),
                        letterSpacing: -0.2,
                      ),
                    )),
                  ],
                ),
                Obx(() => GestureDetector(
                  onTap: controller.isSavingToCalendar.value 
                      ? null 
                      : () => controller.saveAllSemesterToCalendar(),
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.primaryOrange,
                          const Color(0xFFE05200), // Original matching orange
                        ],
                      ),
                      borderRadius: BorderRadius.circular(16.r), // More square
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primaryOrange.withOpacity(0.3),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (controller.isSavingToCalendar.value)
                          SizedBox(
                            width: 16.sp,
                            height: 16.sp,
                            child: const CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        else ...[
                          Icon(SolarIconsBold.bookmark, color: Colors.white, size: 16.sp),
                          SizedBox(width: 8.w),
                          Text(
                            'Lưu',
                            style: GoogleFonts.beVietnamPro(
                              color: Colors.white, 
                              fontWeight: FontWeight.w700, // Lighter 
                              fontSize: 13.sp
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                )),
              ],
            ),
          ),
 
          // 2. Calendar (Moved down)
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 2.w),
            child: const ScheduleCalendar(),
          ),

          // 3.5 Attendance Statistics
          Obx(() {
            if (controller.selectedDaySlots.isEmpty) return const SizedBox.shrink();
            
            final now = controller.currentTime.value;
            int presentCount = 0;
            int absentCount = 0;

            for (var slot in controller.selectedDaySlots) {
              if (slot.attendanceStatus == 'PRESENT') {
                presentCount++;
              } else if (slot.attendanceStatus == 'ABSENT') {
                absentCount++;
              } else if (slot.startTime != null) {
                // If not marked, check if it should be marked as absent (time passed threshold)
                // Using the threshold from config
                try {
                  final startParts = slot.startTime!.split(':');
                  final slotStart = DateTime(
                    slot.date.year, slot.date.month, slot.date.day,
                    int.parse(startParts[0]), int.parse(startParts[1]),
                  );
                  final threshold = slot.absentThresholdMinutes ?? controller.attendanceConfig.value.absentThresholdMinutes;
                  final limitTime = slotStart.add(Duration(minutes: threshold));
                  
                  if (now.isAfter(limitTime)) {
                    absentCount++;
                  }
                } catch (_) {}
              }
            }
            
            return Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                   Text(
                     'Có mặt: ',
                     style: GoogleFonts.beVietnamPro(fontSize: 11.sp, fontWeight: FontWeight.w600, color: const Color(0xFF2D3436)),
                   ),
                   Container(
                     padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 1.h),
                     decoration: BoxDecoration(color: const Color(0xFF27AE60), borderRadius: BorderRadius.circular(10.r)),
                     child: Text('$presentCount', style: TextStyle(fontSize: 11.sp, color: Colors.white, fontWeight: FontWeight.bold)),
                   ),
                   SizedBox(width: 12.w),
                   Text(
                     'Vắng mặt: ',
                     style: GoogleFonts.beVietnamPro(fontSize: 11.sp, fontWeight: FontWeight.w600, color: const Color(0xFF2D3436)),
                   ),
                   Container(
                     padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 1.h),
                     decoration: BoxDecoration(color: const Color(0xFFFF4757), borderRadius: BorderRadius.circular(10.r)),
                     child: Text('$absentCount', style: TextStyle(fontSize: 11.sp, color: Colors.white, fontWeight: FontWeight.bold)),
                   ),
                ],
              ),
            );
          }),

          // 4. Slots List
          Expanded(
            child: Obx(() {
              if (controller.isLoading.value) {
                return const Center(
                  child: CircularProgressIndicator(color: AppColors.primaryOrange),
                );
              }

              if (controller.selectedDaySlots.isEmpty) {
                final isNotPublished = controller.errorStatusCode.value == 403;
                
                return Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 40.w),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isNotPublished ? SolarIconsBroken.lock : SolarIconsBroken.calendar, 
                          size: 80.sp, 
                          color: Colors.grey[200]
                        ),
                        SizedBox(height: 16.h),
                        Text(
                          isNotPublished && !controller.isLecturer
                            ? 'Lịch học học kỳ này chưa được công bố.'
                            : controller.isLecturer
                              ? 'Không có lịch dạy trong ngày này!'
                              : 'Nghỉ ngơi thôi, hông có lịch học đâu!',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey[400], 
                            fontSize: 15.sp, 
                            fontStyle: FontStyle.italic
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              // Auto scroll after build when slots change or loading finishes
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _scrollToActiveSlot();
              });

              return ListView.builder(
                controller: _scrollController,
                padding: EdgeInsets.fromLTRB(24.w, 8.h, 24.w, 100.h), // Increased bottom padding for floating navbar
                physics: const BouncingScrollPhysics(),
                itemCount: controller.selectedDaySlots.length,
                itemBuilder: (context, index) {
                  final slot = controller.selectedDaySlots[index];
                  return SlotCard(slot: slot);
                },
              );
            }),
          ),
        ],
      ),
    );
  }

  String _getWeekdayNameAllCaps(int weekday) {
    switch (weekday) {
      case 1: return 'THỨ HAI';
      case 2: return 'THỨ BA';
      case 3: return 'THỨ TƯ';
      case 4: return 'THỨ NĂM';
      case 5: return 'THỨ SÁU';
      case 6: return 'THỨ BẢY';
      case 7: return 'CHỦ NHẬT';
      default: return '';
    }
  }

  void _showYearPicker(BuildContext context, ScheduleController controller) {
    // Mock year picker
    Get.bottomSheet(
      Container(
        padding: EdgeInsets.all(24.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20.r),
            topRight: Radius.circular(20.r),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Chọn năm',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 18.sp,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF2D3436),
              ),
            ),
            SizedBox(height: 20.h),
            Wrap(
              spacing: 12.w,
              runSpacing: 12.h,
              children: List.generate(5, (index) {
                final year = DateTime.now().year - 2 + index;
                final isSelected = controller.selectedDate.value.year == year;
                return GestureDetector(
                  onTap: () {
                    final current = controller.selectedDate.value;
                    controller.selectDate(DateTime(year, current.month, current.day));
                    Get.back();
                  },
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 10.h),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primaryOrange : Colors.grey[100],
                      borderRadius: BorderRadius.circular(12.r),
                    ),
                    child: Text(
                      year.toString(),
                      style: GoogleFonts.plusJakartaSans(
                        color: isSelected ? Colors.white : Colors.grey[600],
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                );
              }),
            ),
            SizedBox(height: 20.h),
          ],
        ),
      ),
    );
  }

  void _showSemesterPicker(BuildContext context, ScheduleController controller) {
    if (controller.semesters.isEmpty) {
      Get.snackbar(
        'Thông báo',
        'Không tìm thấy danh sách học kỳ. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.orange.withOpacity(0.9),
        colorText: Colors.white,
      );
      return;
    }

    Get.bottomSheet(
      Container(
        padding: EdgeInsets.all(24.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(topLeft: Radius.circular(24.r), topRight: Radius.circular(24.r)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Chọn học kỳ',
              style: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.bold, color: const Color(0xFF2D3436)),
            ),
            const SizedBox(height: 20),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: controller.semesters.length,
                itemBuilder: (context, index) {
                  final sem = controller.semesters[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      sem.name,
                      style: TextStyle(
                        fontSize: 14.sp,
                        fontWeight: controller.selectedSemester.value?.code == sem.code ? FontWeight.bold : FontWeight.normal,
                        color: controller.selectedSemester.value?.code == sem.code ? AppColors.primaryOrange : const Color(0xFF2D3436),
                      ),
                    ),
                    subtitle: Text(sem.code, style: TextStyle(color: Colors.grey[500], fontSize: 12.sp)),
                    onTap: () {
                      controller.selectedSemester.value = sem;
                      Get.back();
                    },
                    trailing: controller.selectedSemester.value?.code == sem.code 
                      ? Icon(SolarIconsBold.checkCircle, color: AppColors.primaryOrange, size: 20.sp) 
                      : null,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
