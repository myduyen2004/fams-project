import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/constants/app_colors.dart';
import 'edit_profile_screen.dart';
import '../../../core/widgets/app_background.dart';
import '../../face_recognition/views/face_registration_view.dart';
import '../../face_recognition/views/face_registration_guide_screen.dart';
import '../../face_recognition/views/view_face_info_screen.dart';

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
                      margin: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(40.0),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
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
                              width: 3,
                            ),
                          ),
                          child: ClipOval(
                            child: SizedBox(
                              width: 130, // 2 * radius 65
                              height: 130,
                              child: _buildAvatarImage(authController, user?.avatarUrl),
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),

                        // 2. Name
                        Text(
                          user?.fullName ?? 'Người dùng',
                          style: GoogleFonts.inter(
                            fontSize: 26,
                            fontWeight: FontWeight.w500, // Medium/Regular looks cleaner
                            color: Colors.black87,
                            height: 1.2,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),

                        const SizedBox(height: 12),

                        // 3. ID Capsule
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFE0B2), // Light orange fill
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'ID: ${user?.username ?? "N/A"}',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              color: Colors.black87,
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),
                        Divider(color: Colors.grey[400], thickness: 1, indent: 20, endIndent: 20),
                        const SizedBox(height: 20),

                        // 4. QR Code
                        QrImageView(
                          data: user?.username ?? 'FAMS_USER_ID',
                          version: QrVersions.auto,
                          size: 180.0,
                          gapless: false,
                        ),

                        const SizedBox(height: 24),

                        // 5. Details (Major & Email)
                        if (user != null) ...[
                          _buildInfoRow(
                            icon: Icons.school_outlined, // Outlined looks cleaner
                            text: user.isLecturer 
                                ? (user.department ?? 'Khoa/Bộ môn') 
                                : 'Chuyên ngành: ${user.major ?? "Kỹ thuật phần mềm"}',
                            iconColor: const Color(0xFFFF6B00),
                          ),
                          const SizedBox(height: 12),
                          _buildInfoRow(
                            icon: Icons.email_outlined,
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
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.check_circle, color: Colors.green, size: 24),
                                    const SizedBox(width: 10),
                                    Text(
                                      'Đã đăng ký khuôn mặt',
                                      style: GoogleFonts.inter(
                                        color: Colors.green,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward_ios, color: Colors.green, size: 16),
                                  ],
                                ),
                              ),
                            ),
                          ] else ...[
                            // Show register button if face not registered
                            SizedBox(
                              width: double.infinity,
                              height: 54,
                              child: OutlinedButton.icon(
                                onPressed: () => Get.to(() => const FaceRegistrationGuideScreen()),
                                icon: const Icon(Icons.face, color: AppColors.primaryOrange),
                                label: Text(
                                  'Đăng ký khuôn mặt',
                                  style: GoogleFonts.inter(
                                    color: AppColors.primaryOrange,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(color: AppColors.primaryOrange, width: 2),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                        ],

                        const SizedBox(height: 12),

                        // Logout Button
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton.icon(
                            onPressed: () => authController.logout(),
                            icon: const Icon(Icons.logout_rounded, color: Colors.white),
                            label: Text(
                              'Đăng xuất',
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryOrange,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              elevation: 4,
                              shadowColor: AppColors.primaryOrange.withOpacity(0.4),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
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
                  top: 10,
                  right: 10,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 5)
                      ]
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.edit, color: Color(0xFFFF6B00)),
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
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 15,
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
      child: const Icon(
        Icons.person,
        size: 80,
        color: Color(0xFFFF6B00),
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
