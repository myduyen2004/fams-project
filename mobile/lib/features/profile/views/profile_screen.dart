import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/constants/app_colors.dart';
import 'personal_info_screen.dart';
import '../../face_recognition/views/face_registration_guide_screen.dart';
import '../../face_recognition/views/view_face_info_screen.dart';
import 'display_mode_screen.dart';
import '../../../../core/controllers/theme_controller.dart';
import '../../notification/views/notification_list_screen.dart';
import '../../notification/controllers/notification_controller.dart';
import 'package:solar_icons/solar_icons.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();

    return Obx(() {
      final user = authController.currentUser.value;
      const Color orangePrimary = Color(0xFFF26F21);

      return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Stack(
          children: [
            // 1. Curved Background
            ClipPath(
              clipper: HeaderCurveClipper(),
              child: Container(
                height: 280.h,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: Theme.of(context).brightness == Brightness.dark 
                      ? [const Color(0xFF1E1E1E), const Color(0xFF121212)]
                      : [const Color(0xFFFEF3DE), Colors.white],
                  ),
                ),
              ),
            ),

            CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                // 2. Top Icon Bar (Bell, History, etc.)
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(20.w, 50.h, 20.w, 10.h),
                  sliver: SliverToBoxAdapter(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        GestureDetector(
                          onTap: () => Get.to(() => const NotificationListScreen()),
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Icon(SolarIconsOutline.bell, color: Theme.of(context).colorScheme.onSurface, size: 26.sp),
                              Obx(() {
                                final notifController = Get.find<NotificationController>();
                                return notifController.unreadCount.value > 0 ? Positioned(
                                  right: 2,
                                  top: 2,
                                  child: Container(
                                    height: 8.h,
                                    width: 8.h,
                                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                  ),
                                ) : const SizedBox.shrink();
                              }),
                            ],
                          ),
                        ),
                        const SizedBox.shrink(), // Keeps Bell on the left
                      ],
                    ),
                  ),
                ),

                // 3. Centered Profile Header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 10.h),
                    child: Column(
                      children: [
                        _buildMainAvatar(context, authController, user?.avatarUrl),
                        SizedBox(height: 16.h),
                        Text(
                          user?.fullName ?? "Người dùng",
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 24.sp,
                            fontWeight: FontWeight.w800,
                            color: Theme.of(context).colorScheme.onSurface,
                            letterSpacing: -0.5,
                          ),
                        ),
                        SizedBox(height: 4.h),
                        Text(
                          "${user?.email ?? 'youremail@domain.com'} | ${user?.phone ?? '+01 234 567 89'}",
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13.sp,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // 4. Menu Groups
                SliverPadding(
                  padding: EdgeInsets.fromLTRB(20.w, 20.h, 20.w, 100.h),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Group 1: Personal Information & Security
                      _buildGroupedMenuCard(context, [
                        _buildMenuListItem(
                          context,
                          onTap: () => Get.to(() => const PersonalInfoScreen()),
                          icon: SolarIconsOutline.userId,
                          title: "Thông tin cá nhân",
                          trailing: Icon(SolarIconsOutline.altArrowRight, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2), size: 20.sp),
                        ),
                        _buildMenuListItem(
                          context,
                          onTap: () => user?.hasFaceRegistered == true 
                              ? Get.to(() => const ViewFaceInfoScreen()) 
                              : Get.to(() => const FaceRegistrationGuideScreen()),
                          icon: SolarIconsOutline.shieldCheck,
                          title: "Xác thực khuôn mặt",
                          trailing: user?.hasFaceRegistered == true 
                              ? Text("ĐÃ XÁC THỰC", style: GoogleFonts.plusJakartaSans(color: Colors.green, fontWeight: FontWeight.w800, fontSize: 12.sp))
                              : Icon(SolarIconsOutline.altArrowRight, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2), size: 20.sp),
                        ),
                        _buildMenuListItem(
                          context,
                          onTap: () {
                            authController.toggleNotifications(!authController.isNotificationsEnabled.value);
                          },
                          icon: SolarIconsOutline.bell,
                          title: "Thông báo",
                          trailing: Transform.scale(
                            scale: 0.8,
                            child: Obx(() => Switch(
                              value: authController.isNotificationsEnabled.value,
                              onChanged: (value) => authController.toggleNotifications(value),
                              activeColor: Colors.white,
                              activeTrackColor: orangePrimary,
                              inactiveTrackColor: Colors.grey.shade300,
                              inactiveThumbColor: Colors.white,
                            )),
                          ),
                        ),
                      ]),

                      SizedBox(height: 16.h),

                      // Group 2: Display Settings
                      _buildGroupedMenuCard(context, [
                        _buildMenuListItem(
                          context,
                          onTap: () => Get.to(() => const DisplayModeScreen()),
                          icon: SolarIconsOutline.widget,
                          title: "Chế độ hiển thị",
                          trailing: Obx(() => Text(ThemeController.to.isDarkMode ? "Tối" : "Sáng", style: GoogleFonts.plusJakartaSans(color: orangePrimary, fontWeight: FontWeight.w800, fontSize: 13.sp))),
                        ),
                      ]),

                      SizedBox(height: 16.h),

                      // Group 4: Logout
                      _buildGroupedMenuCard(context, [
                        _buildMenuListItem(
                          context,
                          onTap: () => authController.logout(),
                          icon: SolarIconsOutline.logout,
                          title: "Đăng xuất tài khoản",
                          isDestructive: true,
                          trailing: Icon(SolarIconsOutline.altArrowRight, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2), size: 20.sp),
                        ),
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

  Widget _buildMainAvatar(BuildContext context, AuthController authController, String? avatarUrl) {
    return Center(
      child: Stack(
        children: [
          Container(
            padding: EdgeInsets.all(4.r),
            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
            child: Container(
              width: 120.r,
              height: 120.r,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : const Color(0xFFFEF3DE),
              ),
              child: ClipOval(
                child: avatarUrl != null && avatarUrl.isNotEmpty
                    ? Image.network(avatarUrl, fit: BoxFit.cover)
                    : Icon(SolarIconsBold.user, size: 60.sp, color: AppColors.primaryOrange.withOpacity(0.2)),
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            right: 5.w,
            child: GestureDetector(
              onTap: () => Get.to(() => const PersonalInfoScreen()),
              child: Container(
                padding: EdgeInsets.all(8.r),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Icon(SolarIconsOutline.pen, color: const Color(0xFF1E2A3A), size: 18.sp),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGroupedMenuCard(BuildContext context, List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24.r),
        border: Border.all(
          color: Theme.of(context).brightness == Brightness.dark 
            ? Colors.transparent 
            : Colors.grey.shade100.withOpacity(0.5)
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.02), 
            blurRadius: 20, 
            offset: const Offset(0, 8)
          ),
        ],
      ),
      child: Column(
        children: items,
      ),
    );
  }

  Widget _buildMenuListItem(
    BuildContext context, {
    required VoidCallback onTap,
    required IconData icon,
    required String title,
    required Widget trailing,
    bool isDestructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24.r),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 18.h),
        child: Row(
          children: [
            Icon(icon, color: isDestructive ? Colors.red : Theme.of(context).colorScheme.onSurface, size: 24.sp),
            SizedBox(width: 16.w),
            Expanded(
              child: Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w700,
                  color: isDestructive ? Colors.red : Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ),
            trailing,
          ],
        ),
      ),
    );
  }
}

class HeaderCurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    Path path = Path();
    path.lineTo(0, size.height * 0.7);
    
    var firstControlPoint = Offset(size.width * 0.25, size.height * 0.6);
    var firstEndPoint = Offset(size.width * 0.5, size.height * 0.7);
    path.quadraticBezierTo(firstControlPoint.dx, firstControlPoint.dy, firstEndPoint.dx, firstEndPoint.dy);
    
    var secondControlPoint = Offset(size.width * 0.75, size.height * 0.82);
    var secondEndPoint = Offset(size.width, size.height * 0.75);
    path.quadraticBezierTo(secondControlPoint.dx, secondControlPoint.dy, secondEndPoint.dx, secondEndPoint.dy);
    
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
