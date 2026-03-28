import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/constants/app_colors.dart';
import 'edit_profile_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();

    // Using Obx to listen to changes in currentUser
    return Obx(() {
        final user = authController.currentUser.value;
        const backgroundColor = Color(0xFFFFE8D6); // Pale orange/beige background
        const cardColor = Colors.white;

        return Scaffold(
          backgroundColor: backgroundColor,
          body: SafeArea(
            child: Stack(
              children: [
                // Fixed Layout - No Scrolling as requested ("cố định không trượt lên trượt xuống đc")
                Center(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
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
                        // ... content ...
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
                              child: (user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty)
                                  ? Image.network(
                                      authController.getOptimizedAvatarUrl(user.avatarUrl),
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) {
                                        return Image.asset(
                                          'assets/images/logo.png',
                                          fit: BoxFit.cover,
                                        );
                                      },
                                      loadingBuilder: (context, child, loadingProgress) {
                                        if (loadingProgress == null) return child;
                                        return Center(
                                          child: CircularProgressIndicator(
                                            value: loadingProgress.expectedTotalBytes != null
                                                ? loadingProgress.cumulativeBytesLoaded / 
                                                  loadingProgress.expectedTotalBytes!
                                                : null,
                                              strokeWidth: 2,
                                              color: Colors.orange,
                                          ),
                                        );
                                      },
                                    )
                                  : Image.asset(
                                      'assets/images/logo.png', 
                                      fit: BoxFit.cover,
                                    ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 20),

                        // 2. Name
                        Text(
                          user?.fullName ?? 'Người dùng',
                          style: GoogleFonts.roboto(
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
                            style: GoogleFonts.roboto(
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
                      ],
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
            style: GoogleFonts.roboto(
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
}
