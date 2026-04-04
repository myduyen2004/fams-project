import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/constants/app_colors.dart';
import 'edit_profile_screen.dart';
import '../../../core/widgets/app_background.dart';
import '../../face_recognition/views/face_registration_view.dart';
import '../../face_recognition/views/face_registration_guide_screen.dart';
import '../../face_recognition/views/view_face_info_screen.dart';
import 'package:solar_icons/solar_icons.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();

    // Using Obx to listen to changes in currentUser
    return Obx(() {
        final user = authController.currentUser.value;
        const cardColor = Colors.white;

        return Scaffold(
          body: AppBackground(
            child: SafeArea(
            child: Stack(
              children: [
                // Scrollable content to handle different screen sizes
                SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  child: Center(
                    child: Container(
                      margin: EdgeInsets.symmetric(horizontal: 24.0.w, vertical: 20.0.h),
                      padding: EdgeInsets.symmetric(horizontal: 20.0.w, vertical: 24.0.h),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(40.0.r),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 20.r,
                            offset: Offset(0, 10.h),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min, // Wrap content
                        children: [
                        // 1. Avatar
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: const Color(0xFFFFB74D), // Orange border
                              width: 3.w,
                            ),
                          ),
                          child: ClipOval(
                            child: SizedBox(
                              width: 110.r, // 2 * radius 55
                              height: 110.r,
                              child: _buildAvatarImage(authController, user?.avatarUrl),
                            ),
                          ),
                        ),

                        20.verticalSpace,

                        // 2. Name
                        Text(
                          user?.fullName ?? 'Người dùng',
                          style: GoogleFonts.inter(
                            fontSize: 26.sp,
                            fontWeight: FontWeight.w500, // Medium/Regular looks cleaner
                            color: Colors.black87,
                            height: 1.2,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),

                        12.verticalSpace,

                        // 3. ID Capsule
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 8.h),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFE0B2), // Light orange fill
                            borderRadius: BorderRadius.circular(20.r),
                          ),
                          child: Text(
                            'ID: ${user?.username ?? "N/A"}',
                            style: GoogleFonts.inter(
                              fontSize: 16.sp,
                              fontWeight: FontWeight.w500,
                              color: Colors.black87,
                            ),
                          ),
                        ),

                        20.verticalSpace,
                        Divider(color: Colors.grey[400], thickness: 1, indent: 20.w, endIndent: 20.w),
                        20.verticalSpace,

                        // 4. QR Code
                        QrImageView(
                          data: user?.username ?? 'FAMS_USER_ID',
                          version: QrVersions.auto,
                          size: 180.0.r,
                          gapless: false,
                        ),

                        24.verticalSpace,

                        // 5. Details (Major & Email)
                        if (user != null) ...[
                          _buildInfoRow(
                            icon: SolarIconsOutline.courseUp, 
                            text: user.isLecturer 
                                ? (user.department ?? 'Khoa/Bộ môn') 
                                : 'Chuyên ngành: ${user.major ?? "Kỹ thuật phần mềm"}',
                            iconColor: const Color(0xFFFF6B00),
                          ),
                          12.verticalSpace,
                          _buildInfoRow(
                            icon: SolarIconsOutline.letter,
                            text: 'Email: ${user.email}',
                            iconColor: const Color(0xFFFF6B00),
                          ),
                        ],


                        const SizedBox(height: 20),

                        // Face Registration Section (Students Only)
                        if (user?.isLecturer != true) ...[
                          if (user?.hasFaceRegistered == true) ...[
                            // Clickable container to view registered face info
                            InkWell(
                              onTap: () => Get.to(() => const ViewFaceInfoScreen()),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                decoration: BoxDecoration(
                                  color: Colors.green.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(16.r),
                                  border: Border.all(color: Colors.green.withOpacity(0.3), width: 1.w),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(SolarIconsBold.checkCircle, color: Colors.green, size: 24.sp),
                                    SizedBox(width: 10.w),
                                    Text(
                                      'Đã đăng ký khuôn mặt',
                                      style: GoogleFonts.inter(
                                        color: Colors.green,
                                        fontSize: 16.sp,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    8.horizontalSpace,
                                    Icon(SolarIconsOutline.altArrowRight, color: Colors.green, size: 16.r),
                                  ],
                                ),
                              ),
                            ),
                          ] else ...[
                            // Show register button if face not registered
                            SizedBox(
                              width: double.infinity,
                              height: 54.h,
                              child: OutlinedButton.icon(
                                onPressed: () => Get.to(() => const FaceRegistrationGuideScreen()),
                                icon: Icon(SolarIconsOutline.userId, color: AppColors.primaryOrange, size: 24.r),
                                label: Text(
                                  'Đăng ký khuôn mặt',
                                  style: GoogleFonts.inter(
                                    color: AppColors.primaryOrange,
                                    fontSize: 16.sp,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(color: AppColors.primaryOrange, width: 2.w),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16.r),
                                  ),
                                ),
                              ),
                            ),
                          ],
                          20.verticalSpace,
                        ],

                        12.verticalSpace,

                        // Logout Button
                        SizedBox(
                          width: double.infinity,
                          height: 54.h,
                          child: ElevatedButton.icon(
                            onPressed: () => authController.logout(),
                            icon: Icon(SolarIconsBold.logout, color: Colors.white, size: 24.r),
                            label: Text(
                              'Đăng xuất',
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 18.sp,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryOrange,
                              padding: EdgeInsets.symmetric(vertical: 12.h),
                              elevation: 4,
                              shadowColor: AppColors.primaryOrange.withOpacity(0.4),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16.r),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ),
                ),
                
                 // Edit Button
                Positioned(
                  top: 10.h,
                  right: 10.w,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 5.r)
                      ]
                    ),
                    child: IconButton(
                      icon: Icon(SolarIconsOutline.pen, color: const Color(0xFFFF6B00), size: 24.r),
                      onPressed: () => Get.to(() => const EditProfileScreen()),
                    ),
                  ),
                ),
              ],
            ),
          ),
          ),
        );
    });
  }

  Widget _buildInfoRow({required IconData icon, required String text, required Color iconColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: iconColor, size: 20.r),
        10.horizontalSpace,
        Flexible(
          child: Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 15.sp,
              color: Colors.black87,
              fontWeight: FontWeight.w400,
            ),
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildAvatarImage(AuthController authController, String? avatarUrl) {
    // Debug: Print avatar URL to console
    debugPrint('Avatar URL: $avatarUrl');
    
    // Default fallback avatar with person icon
    Widget fallbackAvatar = Container(
      color: const Color(0xFFFFE0B2),
      child: Icon(
        SolarIconsBold.user,
        size: 80.sp,
        color: const Color(0xFFFF6B00),
      ),
    );
    
    if (avatarUrl == null || avatarUrl.isEmpty) {
      debugPrint('Avatar URL is null or empty, using fallback');
      return fallbackAvatar;
    }

    final optimizedUrl = authController.getOptimizedAvatarUrl(avatarUrl);
    debugPrint('Optimized Avatar URL: $optimizedUrl');

    return Image.network(
      optimizedUrl,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) {
        debugPrint('Avatar load error: $error');
        return fallbackAvatar;
      },
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Center(
          child: CircularProgressIndicator(
            value: loadingProgress.expectedTotalBytes != null
                ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                : null,
            strokeWidth: 2,
            color: Colors.orange,
          ),
        );
      },
    );
  }
}
