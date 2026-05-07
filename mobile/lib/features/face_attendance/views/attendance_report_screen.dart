import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:solar_icons/solar_icons.dart';
import '../controllers/attendance_report_controller.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../models/attendance_report_model.dart';
import '../../../core/constants/app_routes.dart';

class AttendanceReportScreen extends StatelessWidget {
  const AttendanceReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(AttendanceReportController());
    final scheduleController = Get.find<ScheduleController>();

    const Color orangePrimary = Color(0xFFF26F21);
    const Color textMain = Color(0xFF1E2A3A);
    const Color textSub = Color(0xFF64748B);

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark 
            ? Theme.of(context).scaffoldBackgroundColor 
            : null,
        gradient: Theme.of(context).brightness == Brightness.dark 
            ? null 
            : const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFFEF3DE),
                  Colors.white,
                ],
                stops: [0.0, 0.3],
              ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Column(
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(16.w, 60.h, 16.w, 15.h),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(SolarIconsOutline.altArrowLeft, color: textMain, size: 24.sp),
                    onPressed: () => Get.back(),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        'Báo cáo điểm danh',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 20.sp,
                          fontWeight: FontWeight.w800,
                          color: textMain,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(width: 48.w),
                ],
              ),
            ),
            _buildSemesterChips(controller, scheduleController, orangePrimary, textSub),
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value) {
                  return const Center(child: CircularProgressIndicator(color: orangePrimary));
                }

                final summary = controller.summary.value;
                if (summary == null || summary.classSummaries.isEmpty) {
                  return _buildEmptyState(textMain, textSub);
                }

                return ListView.builder(
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                  itemCount: summary.classSummaries.length,
                  itemBuilder: (context, index) {
                    return _buildCircularProgressCard(summary.classSummaries[index], orangePrimary, textMain, textSub);
                  },
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSemesterChips(AttendanceReportController controller, ScheduleController scheduleController, Color orange, Color textSub) {
    return Container(
      height: 55.h,
      padding: EdgeInsets.symmetric(vertical: 10.h),
      child: Obx(() {
        return ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: EdgeInsets.symmetric(horizontal: 16.w),
          itemCount: scheduleController.semesters.length,
          itemBuilder: (context, index) {
            final sem = scheduleController.semesters[index];
            final isSelected = controller.selectedSemesterCode.value == sem.code;

            return GestureDetector(
              onTap: () => controller.selectedSemesterCode.value = sem.code,
              child: Container(
                margin: EdgeInsets.only(right: 10.w),
                padding: EdgeInsets.symmetric(horizontal: 16.w),
                decoration: BoxDecoration(
                  color: isSelected ? orange : Colors.white,
                  borderRadius: BorderRadius.circular(12.r),
                  border: Border.all(
                    color: isSelected ? orange : const Color(0xFFE2E8F0),
                    width: 1,
                  ),
                  boxShadow: isSelected ? [
                    BoxShadow(
                      color: orange.withOpacity(0.2),
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                    ),
                  ] : [],
                ),
                alignment: Alignment.center,
                child: Text(
                  sem.name,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11.sp,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected ? Colors.white : textSub,
                  ),
                ),
              ),
            );
          },
        );
      }),
    );
  }

  Widget _buildCircularProgressCard(ClassAttendanceSummary item, Color orange, Color textMain, Color textSub) {
    Color statusColor = const Color(0xFF10B981); // Green (Safe)
    if (item.absentPercentage > 15) {
      statusColor = const Color(0xFFEF4444); // Red (Danger)
    } else if (item.absentPercentage > 10) {
      statusColor = const Color(0xFFF59E0B); // Amber (Warning)
    }

    return GestureDetector(
      onTap: () => Get.toNamed(AppRoutes.studentAttendanceDetail, arguments: item.className),
      child: Container(
        margin: EdgeInsets.only(bottom: 12.h, left: 16.w, right: 16.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
            BoxShadow(
              color: textMain.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16.r),
          child: IntrinsicHeight(
            child: Row(
              children: [
                // 1. Middle Info area
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 14.h),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badge: Code
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 3.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(6.r),
                          ),
                          child: Text(
                            item.courseCode,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 9.sp,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFC2410C),
                            ),
                          ),
                        ),
                        
                        SizedBox(height: 8.h),
                        
                        // Course Title (Smaller font)
                        Text(
                          item.courseName,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.5.sp,
                            fontWeight: FontWeight.w800,
                            color: textMain,
                            height: 1.2,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        
                        SizedBox(height: 12.h),
                        
                        // Row: Class name and Status (Smaller font)
                        Row(
                          children: [
                            Icon(SolarIconsBold.usersGroupRounded, size: 12.sp, color: textSub.withOpacity(0.4)),
                            SizedBox(width: 5.w),
                            Expanded(
                              child: Text(
                                item.className,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10.5.sp,
                                  fontWeight: FontWeight.w700,
                                  color: textSub,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            SizedBox(width: 10.w),
                            Icon(SolarIconsBold.calendar, size: 12.sp, color: textSub.withOpacity(0.4)),
                            SizedBox(width: 5.w),
                            Text(
                              '${item.presentCount + item.excusedAbsentCount} / ${item.totalSlots}',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10.5.sp,
                                fontWeight: FontWeight.w800,
                                color: textSub,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                
                // 2. Right Circular Chart (Precise Green)
                Padding(
                  padding: EdgeInsets.only(right: 16.w),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 48.w,
                        height: 48.h,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            CircularProgressIndicator(
                              value: item.attendancePercentage / 100,
                              strokeWidth: 4.5,
                              backgroundColor: const Color(0xFFF1F5F9),
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)), // Green
                            ),
                            Center(
                              child: Padding(
                                padding: EdgeInsets.all(4.w),
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    '${item.attendancePercentage.toString().replaceAll(RegExp(r"\.0$"), "")}%',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 10.sp,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF10B981),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 6.h),
                      Text(
                        'ATTENDANCE',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 8.sp,
                          fontWeight: FontWeight.w800,
                          color: textSub.withOpacity(0.4),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, Color textSub) {
    return Padding(
      padding: EdgeInsets.only(bottom: 2.h),
      child: RichText(
        text: TextSpan(
          style: GoogleFonts.plusJakartaSans(
            fontSize: 10.sp,
            color: textSub,
            height: 1.2,
          ),
          children: [
            TextSpan(text: label),
            TextSpan(
              text: value,
              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF475569)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(Color textMain, Color textSub) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(SolarIconsBold.clipboardList, size: 60.sp, color: textSub.withOpacity(0.2)),
          SizedBox(height: 16.h),
          Text(
            'No attendance records',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14.sp,
              fontWeight: FontWeight.w700,
              color: textSub,
            ),
          ),
        ],
      ),
    );
  }
}
