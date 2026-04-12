import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:solar_icons/solar_icons.dart';
import '../controllers/attendance_report_controller.dart';
import '../models/attendance_report_model.dart';

class AttendanceDetailScreen extends StatelessWidget {
  const AttendanceDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<AttendanceReportController>();
    final className = Get.arguments as String;
    const Color textMain = Color(0xFF1E2A3A);
    const Color textSub = Color(0xFF64748B);
    const Color greenPrimary = Color(0xFF10B981);
    const Color orangePrimary = Color(0xFFF26F21);
    const Color greyPrimary = Color(0xFFCBD5E1);

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
            // Custom Header Title Row (Consistency)
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
                        'Chi tiết điểm danh',
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
            
            Expanded(
              child: FutureBuilder<IndividualAttendanceDetail?>(
                future: controller.fetchDetail(className),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: orangePrimary));
                  }

                  if (snapshot.hasError || !snapshot.hasData) {
                    return _buildErrorState();
                  }

                  final detail = snapshot.data!;
                  
                  // Calculate Stats dynamically
                  int present = detail.slots.where((s) => s.status == 'PRESENT').length;
                  int absent = detail.slots.where((s) => s.status == 'ABSENT').length;
                  int future = detail.slots.where((s) => s.status == 'FUTURE').length;
                  int total = detail.slots.length;
                  int attendedTotal = present + absent;

                  return ListView(
                    padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 10.h),
                    children: [
                      // Course Header Title (Minimalist)
                      Padding(
                        padding: EdgeInsets.only(bottom: 20.h, left: 5.w),
                        child: Text(
                          '${detail.courseCode} - ${detail.courseName}',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 18.sp,
                            fontWeight: FontWeight.w800,
                            color: textMain,
                          ),
                        ),
                      ),

                      // Donut Summary Card
                      _buildDonutSummary(detail, present, absent, future, total, greenPrimary, orangePrimary, greyPrimary, textMain, textSub),

                      SizedBox(height: 20.h),

                      // Attendance Legend Row
                      _buildLegendRow(present, absent, future, greenPrimary, orangePrimary, greyPrimary),

                      SizedBox(height: 30.h),

                      // Slots List
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: detail.slots.length,
                        itemBuilder: (context, index) {
                          return _buildSlotItemSimple(detail.slots[index], greenPrimary, orangePrimary, greyPrimary, textMain, textSub);
                        },
                      ),
                      
                      SizedBox(height: 30.h),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDonutSummary(IndividualAttendanceDetail detail, int present, int absent, int future, int total, Color green, Color orange, Color grey, Color textMain, Color textSub) {
    return Container(
      padding: EdgeInsets.all(20.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(
            color: textMain.withOpacity(0.04),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          // Donut Chart
          SizedBox(
            width: 80.w,
            height: 80.w,
            child: Stack(
              fit: StackFit.expand,
              children: [
                CircularProgressIndicator(
                  value: 1.0,
                  strokeWidth: 10,
                  backgroundColor: Colors.transparent,
                  valueColor: AlwaysStoppedAnimation<Color>(orange.withOpacity(0.2)),
                ),
                CircularProgressIndicator(
                  value: total > 0 ? present / total : 0,
                  strokeWidth: 10,
                  backgroundColor: Colors.transparent,
                  valueColor: AlwaysStoppedAnimation<Color>(green),
                ),
                Center(
                  child: Text(
                    '${total > 0 ? ((present / total) * 100).toInt() : 0}',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14.sp,
                      fontWeight: FontWeight.w800,
                      color: textMain.withOpacity(0.6),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          SizedBox(width: 24.w),
          
          // Stats Text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Class name: ',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                          color: textMain,
                        ),
                      ),
                      TextSpan(
                        text: detail.className,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w700,
                          color: textMain,
                        ),
                      ),
                    ],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 8.h),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Attended: ',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w600,
                          color: textMain,
                        ),
                      ),
                      TextSpan(
                        text: '$present/$total',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.sp,
                          fontWeight: FontWeight.w800,
                          color: orange,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegendRow(int present, int absent, int future, Color green, Color orange, Color grey) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildLegendItem(present, 'Present', green),
        _buildLegendItem(absent, 'Absent', orange),
        _buildLegendItem(future, 'Future', grey.withOpacity(0.5)),
      ],
    );
  }

  Widget _buildLegendItem(int count, String label, Color color) {
    return Row(
      children: [
        Container(
          padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(6.r),
          ),
          child: Text(
            '$count',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12.sp,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
        SizedBox(width: 6.w),
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12.sp,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF1E2A3A).withOpacity(0.8),
            fontStyle: FontStyle.italic,
          ),
        ),
      ],
    );
  }

  Widget _buildSlotItemSimple(IndividualSlotAttendance slot, Color green, Color orange, Color grey, Color textMain, Color textSub) {
    final bool isFuture = slot.status == 'FUTURE';
    final bool isPresent = slot.status == 'PRESENT';
    final bool isAbsent = slot.status == 'ABSENT';

    Color statusColor = isPresent ? green : (isAbsent ? orange : grey);
    IconData statusIcon = isPresent ? SolarIconsBold.checkCircle : (isAbsent ? SolarIconsBold.closeCircle : Icons.circle);
    double iconSize = isFuture ? 24.sp : 32.sp;

    return Container(
      padding: EdgeInsets.symmetric(vertical: 20.h, horizontal: 10.w),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: textMain.withOpacity(0.05), width: 1),
        ),
      ),
      child: Row(
        children: [
          // Left: Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Date: ${slot.date != null ? DateFormat('dd/MM/yyyy').format(slot.date!) : 'N/A'} - Slot: ${slot.slotIndex ?? "?"}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15.sp,
                    fontWeight: FontWeight.w600,
                    color: textMain,
                  ),
                ),
                SizedBox(height: 4.h),
                Text(
                  'Lecturer: ${slot.lecturerName ?? "N/A"}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w600,
                    color: textMain,
                  ),
                ),
              ],
            ),
          ),
          
          // Right: Large Icon
          Icon(
            statusIcon,
            size: iconSize,
            color: isFuture ? grey.withOpacity(0.5) : statusColor,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(SolarIconsBold.shieldWarning, size: 64.sp, color: const Color(0xFFCBD5E1)),
          SizedBox(height: 16.h),
          Text(
            'Có lỗi xảy ra khi tải dữ liệu',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF94A3B8),
            ),
          ),
        ],
      ),
    );
  }
}
