import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/home_controller.dart';
import '../../profile/views/profile_screen.dart'; // Import ProfileScreen
import '../../schedule/views/schedule_screen.dart'; // Import ScheduleScreen

/// Home Screen - Dashboard for Students and Lecturers
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();
    final HomeController homeController = Get.find<HomeController>();

    return Scaffold(
      backgroundColor: const Color(0xFFFFF7F0), // Cream background
      
      // Use GetBuilder to rebuild body when tab changes
      body: GetBuilder<HomeController>(
        builder: (controller) {
          switch (controller.currentIndex) {
            case 0:
              return _buildHomeContent(context, authController, homeController);
            case 1:
              return const ScheduleScreen(); // Replace with ScheduleScreen
            case 3:
               return const Center(child: Text("Tin nhắn (Coming Soon)"));
            case 4:
              return const ProfileScreen(); // Use the ProfileView
            default:
              return _buildHomeContent(context, authController, homeController);
          }
        },
      ),

      // Floating QR Button and Bottom Bar
      floatingActionButton: Container(
        height: 70,
        width: 70,
         margin: const EdgeInsets.only(top: 40), // Push FAB down slightly
        child: FloatingActionButton(
          backgroundColor: Colors.white,
          elevation: 4,
          onPressed: () {},
          shape: const CircleBorder(),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Color(0xFFFFF0E0),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primaryOrange, size: 32),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 12,
        color: Colors.white,
        elevation: 20,
        surfaceTintColor: Colors.white,
        shadowColor: Colors.black,
        height: 80,
        padding: EdgeInsets.zero,
        child: GetBuilder<HomeController>(
          builder: (controller) {
            return Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(icon: Icons.home_rounded, label: 'Trang chủ', isActive: controller.currentIndex == 0, onTap: () => controller.changeTab(0)),
                _buildNavItem(icon: Icons.calendar_month_rounded, label: 'Lịch học', isActive: controller.currentIndex == 1, onTap: () => controller.changeTab(1)),
                const SizedBox(width: 48), // Space for FAB
                _buildNavItem(icon: Icons.chat_bubble_rounded, label: 'Tin nhắn', isActive: controller.currentIndex == 3, onTap: () => controller.changeTab(3)),
                _buildNavItem(icon: Icons.account_circle_rounded, label: 'Tài khoản', isActive: controller.currentIndex == 4, onTap: () => controller.changeTab(4)),
              ],
            );
          }
        ),
      ),
    );
  }

  // Extracted Home Content (Dashboard)
  Widget _buildHomeContent(BuildContext context, AuthController authController, HomeController homeController) {
    return Stack(
        children: [
          // 1. Orange Curved Header Background
          Container(
            height: 200, // Reduced height
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFFF9F43), // Lighter Orange
                  Color(0xFFFF6B00), // Darker Orange
                ],
              ),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(30),
                bottomRight: Radius.circular(30),
              ),
            ),
          ),

          // 2. Main Content
          SafeArea(
            child: Column(
              children: [
                // 2.1 Top Buttons & User Info (Aligned Horizontally)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.menu_rounded, color: Colors.white, size: 28),
                        onPressed: () => _showMenu(context, homeController),
                      ),
                      
                      // User Info Capsule (Centered and aligned with icons)
                      Expanded(
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Obx(() {
                              final user = authController.currentUser.value;
                              return Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    user?.fullName ?? 'Học viên',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.roboto(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  Text(
                                    user?.username ?? 'DE181818',
                                    style: GoogleFonts.roboto(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: Colors.black54,
                                    ),
                                  ),
                                ],
                              );
                            }),
                          ),
                        ),
                      ),
                      
                      IconButton(
                        icon: const Icon(Icons.notifications_active, color: Colors.white, size: 28),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),

                // 2.2 Content Scrollable Area
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: [
                          // Section 1: Thông báo và đơn từ (White Card Container)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(30),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 15,
                                  offset: const Offset(0, 5),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                const Text(
                                  'Thông báo và đơn từ',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF2D3436),
                                  ),
                                ),
                                Container(
                                  height: 4,
                                  width: 30,
                                  margin: const EdgeInsets.only(top: 8, bottom: 20),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryOrange,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildSquareCard(
                                        icon: Icons.notifications_active_rounded,
                                        title: 'Thông báo',
                                        iconBgColor: const Color(0xFFFFE0B2),
                                        iconColor: const Color(0xFFE65100),
                                        onTap: () {},
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: _buildSquareCard(
                                        icon: Icons.person_search_rounded,
                                        title: 'Đơn yêu cầu',
                                        iconBgColor: const Color(0xFFFFE0B2), 
                                        iconColor: const Color(0xFFE65100),
                                        onTap: () {},
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Section 2: Thông tin học vụ
                          Column(
                            children: [
                              const Text(
                                'Thông tin học vụ',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2D3436),
                                ),
                              ),
                              Container(
                                height: 4,
                                width: 30,
                                margin: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryOrange,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                              const SizedBox(height: 8),
                              
                              // Vertical Cards (Big, Centered)
                              _buildBigCard(
                                icon: Icons.calendar_month_rounded,
                                title: 'Xem điểm danh',
                                onTap: () {},
                              ),

                              const SizedBox(height: 16),

                              _buildBigCard(
                                icon: Icons.assignment_rounded,
                                title: 'Báo cáo điểm',
                                onTap: () {},
                              ),
                            ],
                          ),

                          const SizedBox(height: 100), // Space for FAB
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
  }

  // --- Helper Widgets ---

  Widget _buildSquareCard({
    required IconData icon,
    required String title,
    required Color iconBgColor,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 120,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FA),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.withOpacity(0.1)),
          boxShadow: [
             BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: iconBgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 26),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: GoogleFonts.roboto(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF555555),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  // New widget for the "Information" cards (big, vertical layout like image)
  Widget _buildBigCard({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        width: double.infinity,
        height: 160, // Taller card
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.primaryOrange.withOpacity(0.3), width: 1.5), // Orange border
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryOrange.withOpacity(0.08),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFFFFF0E0),
                borderRadius: BorderRadius.all(Radius.circular(16)),
              ),
              child: Icon(icon, color: AppColors.primaryOrange, size: 36), // Bigger icon
            ),
             const SizedBox(height: 16),
             Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2D3436),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isActive ? AppColors.primaryOrange : Colors.grey[400],
              size: 28,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppColors.primaryOrange : Colors.grey[400],
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showMenu(BuildContext context, HomeController homeController) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.person, color: AppColors.primaryOrange),
                title: const Text('Thông tin cá nhân'),
                onTap: () => Get.back(),
              ),
              ListTile(
                leading: const Icon(Icons.settings, color: AppColors.primaryOrange),
                title: const Text('Cài đặt'),
                onTap: () => Get.back(),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
                onTap: () {
                  Get.back();
                  homeController.logout();
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
