import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../controllers/slot_attendance_controller.dart';
import '../models/attendance_session_model.dart';
import '../../schedule/models/schedule_model.dart';

class SlotAttendanceScreen extends StatefulWidget {
  final TimetableSlot slot;

  const SlotAttendanceScreen({super.key, required this.slot});

  @override
  State<SlotAttendanceScreen> createState() => _SlotAttendanceScreenState();
}

class _SlotAttendanceScreenState extends State<SlotAttendanceScreen> {
  final SlotAttendanceController controller = Get.put(SlotAttendanceController());
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    if (widget.slot.id != null) {
      controller.fetchAttendance(widget.slot.id!);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFFEF3DE),
              Colors.white,
            ],
            stops: [0.0, 0.3],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(context),
              _buildSummaryCard(),
              _buildSearchSection(),
              Expanded(
                child: _buildStudentList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Get.back(),
            icon: Icon(SolarIconsOutline.altArrowLeft, color: AppColors.primaryOrange, size: 28.sp),
          ),
          SizedBox(width: 8.w),
          Text(
            "Danh sách điểm danh",
            style: GoogleFonts.plusJakartaSans(
              fontSize: 20.sp,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF1E2A3A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return Container(
      margin: EdgeInsets.symmetric(horizontal: 20.w, vertical: 8.h),
      padding: EdgeInsets.all(16.r),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(12.r),
            decoration: BoxDecoration(
              color: AppColors.primaryOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16.r),
            ),
            child: Icon(SolarIconsBold.usersGroupRounded, color: AppColors.primaryOrange, size: 24.sp),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.slot.className ?? "N/A",
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF1E2A3A),
                  ),
                ),
                Text(
                  "${widget.slot.courseCode} - Slot ${widget.slot.slotNumber}",
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          Obx(() {
            if (controller.sessionDetail.value == null) return const SizedBox.shrink();
            return Container(
              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(12.r),
              ),
              child: Text(
                "${controller.presentCount}/${controller.totalCount}",
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF2E7D32),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildSearchSection() {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 12.h),
      child: Container(
        height: 52.h,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (val) => controller.searchStudents(val),
          style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, fontWeight: FontWeight.w600),
          decoration: InputDecoration(
            hintText: "Tìm kiếm sinh viên...",
            hintStyle: GoogleFonts.plusJakartaSans(color: Colors.grey.shade400, fontSize: 14.sp),
            prefixIcon: Icon(SolarIconsOutline.magnifier, size: 20.sp, color: AppColors.primaryOrange),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 15.h),
          ),
        ),
      ),
    );
  }

  Widget _buildStudentList() {
    return Obx(() {
      if (controller.isLoading.value) {
        return const Center(child: CircularProgressIndicator(color: AppColors.primaryOrange));
      }

      if (controller.errorMessage.value.isNotEmpty) {
        return _buildErrorState();
      }

      if (controller.filteredStudents.isEmpty) {
        return _buildEmptyState();
      }

      return RefreshIndicator(
        onRefresh: () => controller.fetchAttendance(widget.slot.id!),
        color: AppColors.primaryOrange,
        child: ListView.builder(
          padding: EdgeInsets.fromLTRB(20.w, 8.h, 20.w, 20.h),
          itemCount: controller.filteredStudents.length,
          itemBuilder: (context, index) {
            return _buildStudentCard(controller.filteredStudents[index]);
          },
        ),
      );
    });
  }

  Widget _buildStudentCard(StudentAttendanceResponse student) {
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(12.r),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 50.r,
            height: 50.r,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.primaryOrange.withOpacity(0.2), width: 2),
            ),
            child: ClipOval(
              child: student.avatarUrl != null
                  ? Image.network(
                      student.avatarUrl!.startsWith('http') ? student.avatarUrl! : "${ApiConstants.baseUrl}${student.avatarUrl}",
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => _buildPlaceholderAvatar(),
                    )
                  : _buildPlaceholderAvatar(),
            ),
          ),
          SizedBox(width: 14.w),
          // Name & Code
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1E2A3A),
                  ),
                ),
                Text(
                  student.studentCode,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12.sp,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
          // Status Badge
          _buildStatusBadge(student),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(StudentAttendanceResponse student) {
    Color bgColor;
    Color textColor;
    String text = student.displayStatus;

    switch (student.status) {
      case 'PRESENT':
        bgColor = const Color(0xFFE8F5E9);
        textColor = const Color(0xFF2E7D32);
        break;
      case 'ABSENT':
        bgColor = const Color(0xFFFFEBEE);
        textColor = const Color(0xFFC62828);
        break;
      case 'EXCUSED':
        bgColor = const Color(0xFFE3F2FD);
        textColor = const Color(0xFF1565C0);
        break;
      default:
        bgColor = Colors.grey.shade100;
        textColor = Colors.grey.shade600;
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(10.r),
      ),
      child: Text(
        text,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 11.sp,
          fontWeight: FontWeight.w800,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildPlaceholderAvatar() {
    return Container(
      color: AppColors.primaryOrange.withOpacity(0.1),
      child: Icon(SolarIconsBold.user, color: AppColors.primaryOrange, size: 24.sp),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(40.w),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(SolarIconsOutline.bombEmoji, size: 64.sp, color: Colors.grey.shade300),
            SizedBox(height: 16.h),
            Text(
              controller.errorMessage.value,
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                color: Colors.grey.shade600,
                fontSize: 14.sp,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 24.h),
            ElevatedButton(
              onPressed: () => controller.fetchAttendance(widget.slot.id!),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.r)),
              ),
              child: Text("Thử lại", style: GoogleFonts.plusJakartaSans(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(SolarIconsOutline.ghost, size: 64.sp, color: Colors.grey.shade300),
          SizedBox(height: 16.h),
          Text(
            "Không tìm thấy sinh viên nào",
            style: GoogleFonts.plusJakartaSans(
              color: Colors.grey.shade600,
              fontSize: 15.sp,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
