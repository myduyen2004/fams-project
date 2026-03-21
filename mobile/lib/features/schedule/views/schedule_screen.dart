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

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
        child: Column(
          children: [
            // 1. Header with Semester Selector
            Padding(
              padding: EdgeInsets.fromLTRB(24.w, 28.h, 24.w, 10.h),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Kì học',
                        style: TextStyle(fontSize: 13.sp, color: Colors.grey[500], fontWeight: FontWeight.w600),
                      ),
                      SizedBox(height: 8.h),
                      GestureDetector(
                        onTap: () => _showSemesterPicker(context, controller),
                        child: Row(
                          children: [
                            Obx(() => Text(
                              controller.selectedSemester.value?.code ?? 'CHỌN KỲ',
                              style: TextStyle(fontSize: 22.sp, fontWeight: FontWeight.w900, color: const Color(0xFF2D3436)),
                            )),
                            SizedBox(width: 4.w),
                            Icon(SolarIconsOutline.altArrowDown, color: Colors.grey[800], size: 24.sp),
                          ],
                        ),
                      ),
                    ],
                  ),
                  Obx(() => GestureDetector(
                    onTap: controller.isSavingToCalendar.value 
                        ? null 
                        : () => controller.saveAllSemesterToCalendar(),
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                      decoration: BoxDecoration(
                        color: controller.isSavingToCalendar.value 
                            ? AppColors.primaryOrange.withOpacity(0.6) 
                            : AppColors.primaryOrange,
                        borderRadius: BorderRadius.circular(14.r),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryOrange.withOpacity(0.2),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: controller.isSavingToCalendar.value
                          ? SizedBox(
                              width: 16.sp,
                              height: 16.sp,
                              child: const CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              'Lưu vào lịch',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13.sp),
                            ),
                    ),
                  )),
                ],
              ),
            ),

            // 2. Redesigned Calendar
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.w),
              child: const ScheduleCalendar(),
            ),

            SizedBox(height: 10.h),

            // 3. Section Title and Slot Count Badge
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Obx(() => Text(
                    controller.isLecturer ? 'Lịch dạy' : 'Lịch học',
                    style: TextStyle(
                      fontSize: 24.sp,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF2D3436),
                      letterSpacing: -0.5,
                    ),
                  )),
                  Obx(() => Container(
                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF0E0),
                      borderRadius: BorderRadius.circular(20.r),
                    ),
                    child: Text(
                      '${controller.selectedDaySlots.length} Slot',
                      style: TextStyle(
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.w900,
                        fontSize: 12.sp,
                      ),
                    ),
                  )),
                ],
              ),
            ),

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
                  padding: EdgeInsets.fromLTRB(24.w, 8.h, 24.w, 20.h),
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
