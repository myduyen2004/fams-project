import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../auth/controllers/auth_controller.dart';
import 'edit_profile_screen.dart';
import 'profile_screen.dart'; // For HeaderCurveClipper

class PersonalInfoScreen extends StatelessWidget {
  const PersonalInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();

    return Obx(() {
      final user = authController.currentUser.value;

      return Scaffold(
        backgroundColor: const Color(0xFFF9FAFB),
        body: Stack(
          children: [
            // 1. Curved Background
            ClipPath(
              clipper: HeaderCurveClipper(),
              child: Container(
                height: 250.h,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0xFFE3F2FD),
                      const Color(0xFFF1F8E9).withOpacity(0.5),
                    ],
                  ),
                ),
              ),
            ),

            CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                // 2. Standardized Header with Edit Button
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(20.w, 60.h, 20.w, 15.h),
                  sliver: SliverToBoxAdapter(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            GestureDetector(
                              onTap: () => Get.back(),
                              child: Container(
                                padding: EdgeInsets.all(8.r),
                                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                                child: Icon(SolarIconsOutline.altArrowLeft, color: const Color(0xFF1E2A3A), size: 24.sp),
                              ),
                            ),
                            SizedBox(width: 16.w),
                            Text(
                              'Thông tin cá nhân',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 22.sp,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF1E2A3A),
                              ),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: () => Get.to(() => const EditProfileScreen()),
                          child: Container(
                            padding: EdgeInsets.all(10.r),
                            decoration: const BoxDecoration(color: Color(0xFFF26F21), shape: BoxShape.circle),
                            child: Icon(SolarIconsOutline.pen, color: Colors.white, size: 18.sp),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // 3. Centered Name & Role
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      SizedBox(height: 10.h),
                      Text(
                        user?.fullName ?? "N/A",
                        style: GoogleFonts.plusJakartaSans(fontSize: 22.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A)),
                      ),
                      Text(
                        user?.isStudent == true ? "Sinh viên" : "Giảng viên",
                        style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, fontWeight: FontWeight.w600, color: Colors.grey.shade400),
                      ),
                    ],
                  ),
                ),

                // 4. Details Blocks
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(20.w, 30.h, 20.w, 50.h),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _buildSectionTitle("THÔNG TIN LIÊN HỆ"),
                      SizedBox(height: 12.h),
                      _buildInfoGroup([
                        _buildInfoItem(SolarIconsOutline.letter, "Email", user?.email ?? "N/A"),
                        _buildInfoItem(SolarIconsOutline.phone, "Số điện thoại", user?.phone ?? "Chưa cập nhật"),
                        _buildInfoItem(SolarIconsOutline.calendar, "Ngày sinh", user?.dob != null ? "${user!.dob!.day}/${user!.dob!.month}/${user!.dob!.year}" : "Chưa cập nhật"),
                      ]),

                      SizedBox(height: 30.h),
                      _buildSectionTitle("THÔNG TIN HỌC TẬP"),
                      SizedBox(height: 12.h),
                      _buildInfoGroup([
                        _buildInfoItem(SolarIconsOutline.userId, user?.isStudent == true ? "Mã số sinh viên" : "Mã số giảng viên", user?.username ?? "N/A"),
                        if (user?.isStudent == true) ...[
                          _buildInfoItem(SolarIconsOutline.diploma, "Ngành học", user?.major ?? "N/A"),
                          _buildInfoItem(SolarIconsOutline.courseUp, "Chuyên ngành", user?.specialization ?? "Chưa cập nhật"),
                          _buildInfoItem(SolarIconsOutline.squareAcademicCap, "Chuyên ngành hẹp", user?.subSpecialization ?? "Chưa cập nhật"),
                        ] else
                          _buildInfoItem(SolarIconsOutline.structure, "Khoa/Bộ môn", user?.department ?? "N/A"),
                      ]),
                    ]),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    });
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 12.sp,
        fontWeight: FontWeight.w800,
        color: const Color(0xFF1E2A3A).withOpacity(0.4),
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildInfoGroup(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 18.h),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(8.r),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12.r)),
            child: Icon(icon, color: const Color(0xFF1E2A3A).withOpacity(0.6), size: 20.sp),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                SizedBox(height: 2.h),
                Text(
                  value,
                  style: GoogleFonts.plusJakartaSans(fontSize: 15.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E2A3A)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
