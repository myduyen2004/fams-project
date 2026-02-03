import 'package:flutter/material.dart';
import 'dart:ui'; // For ImageFilter
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../../schedule/models/schedule_model.dart';
import '../controllers/class_list_controller.dart';
import '../models/class_section_model.dart';
import 'student_list_screen.dart';
import '../../../core/constants/app_colors.dart';
import '../../home/controllers/home_controller.dart';
import 'widgets/animated_status_badge.dart';
import '../../../core/widgets/app_background.dart';

class ClassListScreen extends StatelessWidget {
  ClassListScreen({super.key});

  final ClassListController controller = Get.put(ClassListController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(context),
            
            // Class List
            Expanded(
              child: Obx(() {
                if (controller.isLoading.value && controller.classes.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFFEF7623)),
                  );
                }

                if (controller.errorMessage.value.isNotEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          controller.errorMessage.value,
                          style: GoogleFonts.roboto(color: Colors.red),
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
                    child: Text(
                      'Không có lớp học',
                      style: GoogleFonts.roboto(
                        color: Colors.grey[600],
                        fontSize: 16,
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: controller.fetchClasses,
                  color: const Color(0xFFEF7623),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: controller.classes.length,
                    itemBuilder: (context, index) {
                      return _buildClassCard(controller.classes[index], index + 1);
                    },
                  ),
                );
              }),
            ),
          ],
        ),
      ),
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
            final authController = Get.find<AuthController>();
            return Obx(() {
              final isLecturer = authController.currentUser.value?.isLecturer == true;
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(icon: Icons.home_rounded, label: 'Trang chủ', isActive: false, onTap: () {
                    Get.find<HomeController>().changeTab(0);
                    Get.back();
                  }),
                  _buildNavItem(icon: Icons.calendar_month_rounded, label: isLecturer ? 'Lịch dạy' : 'Lịch học', isActive: false, onTap: () {
                    Get.find<HomeController>().changeTab(1);
                    Get.back();
                  }),
                  const SizedBox(width: 48), // Space for FAB
                  _buildNavItem(icon: Icons.chat_bubble_rounded, label: 'Tin nhắn', isActive: false, onTap: () {
                    Get.find<HomeController>().changeTab(3);
                    Get.back();
                  }),
                  _buildNavItem(icon: Icons.account_circle_rounded, label: 'Tài khoản', isActive: false, onTap: () {
                    Get.find<HomeController>().changeTab(4);
                    Get.back();
                  }),
                ],
              );
            });
          }
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
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
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.arrow_back_rounded, color: Colors.black54, size: 22),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  'Danh sách lớp',
                  style: GoogleFonts.roboto(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),

            ],
          ),
          
          const SizedBox(height: 16),
          
          // Semester Pill Selector (rounded, soft)
          _buildSemesterPill(context),
        ],
      ),
    );
  }

  Widget _buildSemesterPill(BuildContext context) {
    return Obx(() {
      try {
        final scheduleController = Get.find<ScheduleController>();
        final selectedSemester = scheduleController.selectedSemester.value;
        
        return GestureDetector(
          onTap: () => _showSemesterPicker(context, scheduleController),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(30), // Rounded pill shape
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.calendar_today, color: Color(0xFFEF7623), size: 18),
                const SizedBox(width: 10),
                Text(
                  'Học kỳ: ${selectedSemester?.name ?? 'Chọn kỳ'}',
                  style: GoogleFonts.roboto(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFFEF7623),
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.keyboard_arrow_down, color: Color(0xFFEF7623), size: 20),
              ],
            ),
          ),
        );
      } catch (_) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(30),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_today, color: Color(0xFFEF7623), size: 18),
              const SizedBox(width: 10),
              Text(
                'Học kỳ: Spring 2026',
                style: GoogleFonts.roboto(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFFEF7623),
                ),
              ),
            ],
          ),
        );
      }
    });
  }

  void _showSemesterPicker(BuildContext context, ScheduleController scheduleController) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Chọn học kỳ',
                style: GoogleFonts.roboto(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              ...scheduleController.semesters.map((semester) {
                final isSelected = scheduleController.selectedSemester.value?.code == semester.code;
                return ListTile(
                  title: Text(
                    semester.name,
                    style: GoogleFonts.roboto(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? const Color(0xFFEF7623) : Colors.black87,
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: Color(0xFFEF7623))
                      : null,
                  onTap: () {
                    scheduleController.selectedSemester.value = semester;
                    controller.fetchClasses();
                    Get.back();
                  },
                );
              }),
              const SizedBox(height: 20),
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
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Number Badge
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Text(
                  '$index',
                  style: GoogleFonts.roboto(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[600],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),


            
            // Class Info - Class code as title, course info below
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _extractClassCode(classSection.className), // SE18B02
                    style: GoogleFonts.roboto(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${classSection.courseCode} - ${classSection.courseName}', // DBI202 - Cơ sở dữ liệu
                    style: GoogleFonts.roboto(
                      fontSize: 13,
                      color: Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            
            // Animated Status Badge
            AnimatedStatusBadge(classSection: classSection),
            
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }



  Widget _getCourseIcon(String courseCode) {
    IconData icon;
    if (courseCode.startsWith('DBI') || courseCode.startsWith('SQL')) {
      icon = Icons.storage;
    } else if (courseCode.startsWith('MAS') || courseCode.startsWith('MAE')) {
      icon = Icons.functions;
    } else if (courseCode.startsWith('PRO') || courseCode.startsWith('SWR') || courseCode.startsWith('SWT')) {
      icon = Icons.code;
    } else if (courseCode.startsWith('CSI') || courseCode.startsWith('NET')) {
      icon = Icons.lan;
    } else if (courseCode.startsWith('IOT')) {
      icon = Icons.sensors;
    } else {
      icon = Icons.school;
    }
    
    return Icon(icon, color: const Color(0xFFEF7623), size: 24);
  }

  /// Extract class code from className (e.g., "SE18B02-IOT102" -> "SE18B02")
  String _extractClassCode(String className) {
    if (className.contains('-')) {
      return className.split('-').first;
    }
    return className;
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: isActive ? AppColors.primaryOrange : Colors.grey,
            size: 26,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.roboto(
              fontSize: 11,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
              color: isActive ? AppColors.primaryOrange : Colors.grey,
            ),
          ),
        ],
      ),
    );
  }
}
