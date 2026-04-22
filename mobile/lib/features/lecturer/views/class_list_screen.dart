import 'package:flutter/material.dart';
import 'dart:ui'; // For ImageFilter
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../controllers/class_list_controller.dart';
import '../models/class_section_model.dart';
import 'student_list_screen.dart';
import '../../../core/constants/app_colors.dart';
import '../../home/controllers/home_controller.dart';
import 'widgets/animated_status_badge.dart';

class ClassListScreen extends StatelessWidget {
  ClassListScreen({super.key});

  final ClassListController controller = Get.put(ClassListController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              const Color(0xFFFEF3DE),
              Colors.white,
            ],
            stops: const [0.0, 0.3],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              _buildHeader(context),

              // Class List
              Expanded(
                child: Obx(() {
                  if (controller.isLoading.value &&
                      controller.classes.isEmpty) {
                    return const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primaryOrange,
                      ),
                    );
                  }

                  if (controller.errorMessage.value.isNotEmpty) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            controller.errorMessage.value,
                            style: GoogleFonts.plusJakartaSans(color: Colors.red),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: controller.fetchClasses,
                            child: const Text('Thử lại'),
                          ),
                        ],
                      ),
                    );
                  }

                  if (controller.classes.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(SolarIconsOutline.box, size: 64.sp, color: Colors.grey.shade300),
                          SizedBox(height: 16.h),
                          Text(
                            'Không có lớp học',
                            style: GoogleFonts.plusJakartaSans(
                              color: Colors.grey[600],
                              fontSize: 16.sp,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: controller.fetchClasses,
                    color: AppColors.primaryOrange,
                    child: ListView.builder(
                      padding: EdgeInsets.fromLTRB(20.w, 10.h, 20.w, 40.h),
                      physics: const BouncingScrollPhysics(),
                      itemCount: controller.classes.length,
                      itemBuilder: (context, index) {
                        return _buildClassCard(
                          controller.classes[index],
                          index + 1,
                        );
                      },
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 8.h),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title Row
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  Get.find<HomeController>().changeTab(0);
                  Get.back();
                },
                child: Container(
                  padding: EdgeInsets.all(10.r),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14.r),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: Icon(
                    SolarIconsOutline.altArrowLeft,
                    color: Colors.black87,
                    size: 22.sp,
                  ),
                ),
              ),
              SizedBox(width: 16.w),
              Expanded(
                child: Text(
                  'Danh sách lớp',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 22.sp,
                    fontWeight: FontWeight.w800,
                    color: Colors.black87,
                  ),
                ),
              ),
            ],
          ),

          SizedBox(height: 18.h),

          // Semester Pill Selector
          _buildSemesterPill(context),
        ],
      ),
    );
  }

  Widget _buildSemesterPill(BuildContext context) {
    ScheduleController? scheduleController;
    try {
      scheduleController = Get.find<ScheduleController>();
    } catch (_) {
      return Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30.r),
          boxShadow: [
             BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(SolarIconsOutline.calendar, color: AppColors.primaryOrange, size: 18.sp),
            SizedBox(width: 10.w),
            Text(
              'Học kỳ: SPRING 2026',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14.sp,
                fontWeight: FontWeight.w700,
                color: AppColors.primaryOrange,
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      onTap: () => _showSemesterPicker(context, scheduleController!),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 12.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(30.r),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5)),
          ],
          border: Border.all(color: Colors.white, width: 2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(SolarIconsOutline.calendar, color: AppColors.primaryOrange, size: 18.sp),
            SizedBox(width: 10.w),
            Obx(
              () => Text(
                'Học kỳ: ${scheduleController?.selectedSemester.value?.name ?? 'Chọn kỳ'}',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryOrange,
                ),
              ),
            ),
            SizedBox(width: 8.w),
            Icon(SolarIconsOutline.altArrowDown, color: AppColors.primaryOrange, size: 18.sp),
          ],
        ),
      ),
    );
  }

  void _showSemesterPicker(BuildContext context, ScheduleController scheduleController) {
    if (scheduleController.semesters.isEmpty) {
      Get.snackbar(
        'Thông báo',
        'Không tìm thấy danh sách học kỳ.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.orange.withOpacity(0.9),
        colorText: Colors.white,
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(30.r)),
      ),
      builder: (context) {
        return Container(
          padding: EdgeInsets.all(24.r),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40.w,
                height: 4.h,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2.r),
                ),
              ),
              SizedBox(height: 24.h),
              Text(
                'Chọn học kỳ',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.w800,
                ),
              ),
              SizedBox(height: 20.h),
              Obx(
                () => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: scheduleController.semesters.map((semester) {
                    final isSelected =
                        scheduleController.selectedSemester.value?.code ==
                        semester.code;
                    return ListTile(
                      contentPadding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 4.h),
                      title: Text(
                        semester.name,
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected ? AppColors.primaryOrange : Colors.black87,
                        ),
                      ),
                      trailing: isSelected
                          ? Icon(SolarIconsBold.verifiedCheck, color: AppColors.primaryOrange, size: 22.sp)
                          : null,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
                      onTap: () {
                        scheduleController.selectedSemester.value = semester;
                        controller.fetchClasses();
                        Get.back();
                      },
                    );
                  }).toList(),
                ),
              ),
              SizedBox(height: 20.h),
            ],
          ),
        );
      },
    );
  }

  Widget _buildClassCard(ClassSection classSection, int index) {
    return GestureDetector(
      onTap: () {
        controller.selectClass(classSection);
        Get.to(() => StudentListScreen(classSection: classSection));
      },
      child: Container(
        margin: EdgeInsets.only(bottom: 14.h),
        padding: EdgeInsets.all(16.r),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24.r),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 15,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Number Badge
            Container(
              width: 32.h,
              height: 32.h,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(10.r),
              ),
              child: Center(
                child: Text(
                  '$index',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey[600],
                  ),
                ),
              ),
            ),
            SizedBox(width: 14.w),

            // Class Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _extractClassCode(classSection.className),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w800,
                      color: Colors.black87,
                    ),
                  ),
                  SizedBox(height: 4.h),
                  Text(
                    '${classSection.courseCode} - ${classSection.courseName}',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13.sp,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Animated Status Badge
            AnimatedStatusBadge(classSection: classSection),

            SizedBox(width: 8.w),
            Icon(SolarIconsOutline.altArrowRight, color: Colors.grey.shade300, size: 18.sp),
          ],
        ),
      ),
    );
  }

  String _extractClassCode(String className) {
    if (className.contains('-')) {
      return className.split('-').first;
    }
    return className;
  }
}

