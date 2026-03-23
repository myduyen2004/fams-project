import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../auth/controllers/auth_controller.dart';
import '../controllers/home_controller.dart';
import '../../profile/views/profile_screen.dart';
import '../../schedule/views/schedule_screen.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../../schedule/controllers/schedule_controller.dart';
import '../../notification/controllers/notification_controller.dart';
import '../../notification/views/notification_list_screen.dart';
import '../../chat/views/chat_list_screen.dart';
import '../../news/controllers/news_controller.dart';
import '../../news/views/news_list_screen.dart';
import '../../news/models/news_model.dart';
import '../../news/views/news_detail_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthController authController = Get.find<AuthController>();
    final HomeController homeController = Get.find<HomeController>();
    // Integrate ScheduleController for real data
    final ScheduleController scheduleController = Get.put(ScheduleController());
    final NewsController newsController = Get.put(NewsController());

    return Scaffold(
      extendBody: true, // Crucial for floating navbar
      backgroundColor: Colors.white, // Pure white background
      body: Container(
        width: double.infinity,
        height: double.infinity,
        color: Colors.white,
        child: GetBuilder<HomeController>(
          builder: (controller) {
            switch (controller.currentIndex) {
              case 0:
                return _buildModernHome(context, authController, controller, scheduleController);
              case 1:
                return const ScheduleScreen(); 
              case 3:
                return const ChatListScreen(); 
              case 4:
                return const ProfileScreen();
              default:
                return _buildModernHome(context, authController, controller, scheduleController);
            }
          },
        ),
      ),
      bottomNavigationBar: GetBuilder<HomeController>(
        builder: (controller) => _buildBottomNav(controller, authController),
      ),
    );
  }

  // 🏛️ MODERN F-SCHOOL LAYOUT (PASSING CONTROLLERS) 🏛️
  Widget _buildModernHome(BuildContext context, AuthController authController, HomeController homeController, ScheduleController scheduleController) {
    final NewsController newsController = Get.find<NewsController>();
    const Color orangePrimary = Color(0xFFF26F21);
    const Color orangeSecondary = Color(0xFFF7941D);

    // Dynamic Week Logic
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: (now.weekday % 7))); // Adjusted for CN - T7
    final weekDates = List.generate(7, (i) => startOfWeek.add(Duration(days: i)));
    
    // Vietnamese Short Days
    final List<String> vnDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    // ✨ MODERN LINE-ART ICON SET ✨
    final List<Map<String, dynamic>> features = [
      {"icon": SolarIconsBold.verifiedCheck, "title": "Điểm danh"},
      {"icon": SolarIconsBold.graphUp, "title": "Bảng điểm"},
      {"icon": SolarIconsBold.documentText, "title": "Đơn từ"},
      {"icon": SolarIconsBold.walletMoney, "title": "Học phí"},
      {"icon": SolarIconsBold.pen2, "title": "BTVN"},
      {"icon": SolarIconsBold.ticket, "title": "Sự kiện"},
      {"icon": SolarIconsBold.usersGroupRounded, "title": "Câu lạc bộ"},
      {"icon": SolarIconsBold.book, "title": "Thư viện"},
      {"icon": SolarIconsBold.bus, "title": "Gửi xe"},
      {"icon": SolarIconsBold.chatLine, "title": "Liên lạc"},
    ];

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header with Chat, Search and Notification
          Padding(
            padding: EdgeInsets.fromLTRB(20.w, 60.h, 20.w, 15.h),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _getGreeting(),
                  style: GoogleFonts.plusJakartaSans(fontSize: 22.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A)),
                ),
                Row(
                  children: [
                    Icon(SolarIconsBold.magnifier, color: const Color(0xFF1E2A3A), size: 26.sp),
                    SizedBox(width: 15.w),
                    GestureDetector(
                      onTap: () => Get.to(() => const ChatListScreen()),
                      child: Icon(SolarIconsBold.chatLine, color: const Color(0xFF1E2A3A), size: 25.sp),
                    ),
                    SizedBox(width: 15.w),
                    GestureDetector(
                      onTap: () => Get.to(() => const NotificationListScreen()),
                      child: Stack(
                        children: [
                          Icon(SolarIconsBold.bell, color: const Color(0xFF1E2A3A), size: 26.sp),
                          Positioned(
                            right: 2,
                            top: 2,
                            child: Container(
                              height: 7.h,
                              width: 7.h,
                              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 2. Profile Card
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20.w),
            child: Container(
              width: double.infinity,
              padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [orangeSecondary, orangePrimary],
                ),
                borderRadius: BorderRadius.circular(24.r),
                boxShadow: [
                  BoxShadow(color: orangePrimary.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8)),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(1.5.r),
                        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                        child: Obx(() {
                          final user = authController.currentUser.value;
                          return CircleAvatar(
                            radius: 28.r,
                            backgroundColor: Colors.white,
                            backgroundImage: user?.avatarUrl != null && user!.avatarUrl!.isNotEmpty ? NetworkImage(user.avatarUrl!) : null,
                            child: user?.avatarUrl == null ? Icon(SolarIconsBold.user, color: orangePrimary, size: 24.sp) : null,
                          );
                        }),
                      ),
                      SizedBox(width: 14.w),
                      Expanded(child: Obx(() {
                        final user = authController.currentUser.value;
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user?.fullName ?? "Người dùng", style: GoogleFonts.plusJakartaSans(fontSize: 17.sp, fontWeight: FontWeight.bold, color: Colors.white)),
                            SizedBox(height: 2.h),
                            Text(user?.username ?? "MSV", style: GoogleFonts.plusJakartaSans(fontSize: 13.sp, color: Colors.white.withOpacity(0.85), fontWeight: FontWeight.w600)),
                          ],
                        );
                      })),
                      GestureDetector(
                        onTap: () => _showLogoutConfirm(context, authController),
                        child: Container(
                          padding: EdgeInsets.all(6.r),
                          decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle),
                          child: Icon(SolarIconsOutline.transferVertical, color: Colors.white, size: 20.sp),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12.h),
                  Row(
                    children: [
                      Icon(SolarIconsOutline.courseUp, color: Colors.white, size: 16.sp),
                      SizedBox(width: 8.w),
                      Obx(() => Text(
                        authController.currentUser.value?.major ?? "Chuyên ngành",
                        style: GoogleFonts.plusJakartaSans(fontSize: 12.sp, fontWeight: FontWeight.w700, color: Colors.white),
                      )),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // 3. ✨ REAL DATA Calendar Card ✨
          Obx(() => AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: SizeTransition(sizeFactor: animation, child: child)),
            child: homeController.isCalendarVisible.value ? Padding(
              key: const ValueKey("calendar_full"),
              padding: EdgeInsets.fromLTRB(20.w, 12.h, 20.w, 12.h),
              child: Container(
                width: double.infinity,
                padding: EdgeInsets.all(16.r),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB), 
                  borderRadius: BorderRadius.circular(24.r),
                  border: Border.all(color: Colors.grey.shade200, width: 1.0),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          DateFormat("d 'Tháng' M, yyyy").format(scheduleController.selectedDate.value), 
                          style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E2A3A))
                        ),
                        GestureDetector(
                          onTap: () => homeController.toggleCalendar(),
                          child: Container(
                            padding: EdgeInsets.all(4.r),
                          child: Icon(SolarIconsOutline.closeCircle, size: 18.sp, color: const Color(0xFF1E2A3A).withOpacity(0.5)),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12.h),
                    Row(
                      children: List.generate(7, (index) {
                        final dayDate = weekDates[index];
                        final isSelected = scheduleController.selectedDate.value.day == dayDate.day && scheduleController.selectedDate.value.month == dayDate.month;
                        
                        return Expanded(
                          child: GestureDetector(
                            onTap: () => scheduleController.selectDate(dayDate),
                            behavior: HitTestBehavior.opaque,
                            child: AnimatedScale(
                              scale: isSelected ? 1.05 : 1.0,
                              duration: const Duration(milliseconds: 200),
                              child: Column(
                                children: [
                                  Text(
                                    vnDays[index], 
                                    style: GoogleFonts.plusJakartaSans(fontSize: 10.sp, fontWeight: FontWeight.w600, color: const Color(0xFF1E2A3A).withOpacity(isSelected ? 0.8 : 0.35))
                                  ),
                                  SizedBox(height: 8.h),
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    width: 38.w,
                                    height: 38.w,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFFF26F21) : Colors.white, 
                                      shape: BoxShape.circle,
                                      border: isSelected ? null : Border.all(color: Colors.grey.shade100, width: 1.0),
                                      boxShadow: isSelected ? [
                                        BoxShadow(color: const Color(0xFFF26F21).withOpacity(0.35), blurRadius: 10, offset: const Offset(0, 4))
                                      ] : null,
                                    ),
                                    child: Text(
                                      dayDate.day.toString(),
                                      style: GoogleFonts.plusJakartaSans(
                                        fontSize: 13.sp, 
                                        fontWeight: FontWeight.w800, 
                                        color: isSelected ? Colors.white : const Color(0xFF1E2A3A)
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                    Padding(
                      padding: EdgeInsets.symmetric(vertical: 12.h),
                      child: Divider(color: Colors.black.withOpacity(0.05), height: 1),
                    ),
                    // ✨ REAL SLOTS SECTION ✨
                    Obx(() {
                      if (scheduleController.isLoading.value) {
                        return const Center(child: Padding(padding: EdgeInsets.all(10.0), child: CircularProgressIndicator(strokeWidth: 2, color: orangePrimary)));
                      }
                      
                      final slots = scheduleController.selectedDaySlots;
                      if (slots.isEmpty) {
                        return Center(
                          child: Text("Không có lịch học", style: GoogleFonts.plusJakartaSans(fontSize: 13.sp, fontWeight: FontWeight.w600, color: const Color(0xFF1E2A3A).withOpacity(0.5))),
                        );
                      }

                      return Column(
                        children: slots.map((slot) => GestureDetector(
                          onTap: () {
                            scheduleController.scrollToSlot(slot, scheduleController.selectedDate.value);
                            homeController.changeTab(1); // Navigate to Schedule Screen
                          },
                          behavior: HitTestBehavior.opaque,
                          child: Container(
                            margin: EdgeInsets.only(bottom: 10.h),
                            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 12.h),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16.r),
                              border: Border.all(color: Colors.grey.shade200.withOpacity(0.5), width: 1.0),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 3, offset: const Offset(0, 1)),
                              ],
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        slot.courseCode ?? '---', 
                                        style: GoogleFonts.plusJakartaSans(fontSize: 13.5.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A))
                                      ),
                                      SizedBox(height: 4.h),
                                      Text(
                                        "${_formatTime(slot.startTime)} - ${_formatTime(slot.endTime)} | ${slot.roomCode ?? 'Online'}", 
                                        style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, color: Colors.grey.shade500, fontWeight: FontWeight.w600)
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(SolarIconsOutline.altArrowRight, size: 10.sp, color: Colors.grey.shade300),
                              ],
                            ),
                          ),
                        )).toList(),
                      );
                    }),
                  ],
                ),
              ),
            ) : Center(
              key: const ValueKey("calendar_collapsed"),
              child: GestureDetector(
                onTap: () => homeController.toggleCalendar(),
                child: Container(
                  margin: EdgeInsets.symmetric(vertical: 8.h),
                  padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20.r),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 5)],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text("Xem lịch tuần", style: GoogleFonts.plusJakartaSans(fontSize: 12.sp, fontWeight: FontWeight.bold, color: const Color(0xFF1E2A3A))),
                      SizedBox(width: 6.w),
                      Icon(SolarIconsOutline.altArrowDown, size: 20.sp, color: orangePrimary),
                    ],
                  ),
                ),
              ),
            ),
          )),

          // 4. Chức năng
          Padding(
            padding: EdgeInsets.fromLTRB(20.w, 15.h, 0, 12.h),
            child: Text("Chức năng", style: GoogleFonts.plusJakartaSans(fontSize: 18.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A))),
          ),
          
          SizedBox(
            height: 98.h,
            child: ListView.builder(
              padding: EdgeInsets.symmetric(horizontal: 16.w),
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: features.length,
              itemBuilder: (context, index) {
                return _buildMinimalFeatureItem(
                  features[index]["icon"], 
                  features[index]["title"], 
                  orangePrimary
                );
              },
            ),
          ),

          // 5. Tin tức mới
          Padding(
            padding: EdgeInsets.fromLTRB(20.w, 20.h, 20.w, 15.h),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Tin tức mới", style: GoogleFonts.plusJakartaSans(fontSize: 18.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A))),
                GestureDetector(
                  onTap: () => Get.to(() => const NewsListScreen()),
                  child: Text("Xem tất cả", style: GoogleFonts.plusJakartaSans(fontSize: 13.sp, fontWeight: FontWeight.w600, color: orangePrimary)),
                ),
              ],
            ),
          ),

          SizedBox(
            height: 220.h,
            child: Obx(() {
              if (newsController.isLoading.value && newsController.newsList.isEmpty) {
                return const Center(child: CircularProgressIndicator(color: orangePrimary));
              }
              if (newsController.newsList.isEmpty) {
                return Center(child: Text("Chưa có tin tức nào", style: GoogleFonts.plusJakartaSans(color: Colors.grey)));
              }
              final displayList = newsController.newsList.take(5).toList();
              return ListView.builder(
                padding: EdgeInsets.symmetric(horizontal: 16.w),
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                itemCount: displayList.length,
                itemBuilder: (context, index) {
                  return _buildNewsCard(displayList[index], orangePrimary);
                },
              );
            }),
          ),
          
          SizedBox(height: 120.h), 
        ],
      ),
    );
  }

  void _showLogoutConfirm(BuildContext context, AuthController authController) {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
        title: Text("Đăng xuất", style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold)),
        content: Text("Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?", style: GoogleFonts.plusJakartaSans()),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: Text("Hủy", style: GoogleFonts.plusJakartaSans(color: Colors.grey, fontWeight: FontWeight.bold)),
          ),
          TextButton(
            onPressed: () {
              Get.back();
              authController.logout();
            },
            child: Text("Đăng xuất", style: GoogleFonts.plusJakartaSans(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // ✨ MINIMALIST FEATURE ITEM ✨
  Widget _buildMinimalFeatureItem(IconData icon, String title, Color brandColor) {
    return Container(
      margin: EdgeInsets.only(right: 18.w),
      child: Column(
        children: [
          Container(
            width: 60.w,
            height: 60.w,
            decoration: BoxDecoration(
              color: brandColor.withOpacity(0.04), 
              borderRadius: BorderRadius.circular(18.r),
              border: Border.all(
                color: brandColor.withOpacity(0.08),
                width: 1.0
              ),
            ),
            child: Icon(
              icon, 
              color: brandColor,
              size: 24.sp,
            ),
          ),
          SizedBox(height: 8.h),
          Text(
            title,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10.5.sp, 
              fontWeight: FontWeight.w700, 
              color: const Color(0xFF1E2A3A),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildNewsCard(NewsModel news, Color brandColor) {
    bool hasImage = news.thumbnailImage != null && news.thumbnailImage!.isNotEmpty;
    
    String formattedDate = '';
    try {
      final dateToParse = news.publishedAt ?? news.createdAt;
      formattedDate = DateFormat('dd/MM/yyyy').format(DateTime.parse(dateToParse));
    } catch (e) {
      formattedDate = 'Vừa xong';
    }

    String displayCategory = news.type ?? 'Tin tức';
    // Translate some common types if needed
    if (displayCategory == 'SYSTEM') displayCategory = 'Hệ thống';
    else if (displayCategory == 'ACADEMIC') displayCategory = 'Học tập';
    else if (displayCategory == 'EVENT') displayCategory = 'Sự kiện';

    return GestureDetector(
      onTap: () => Get.to(() => NewsDetailScreen(news: news)),
      child: Container(
        width: 325.w,
        margin: EdgeInsets.symmetric(horizontal: 8.w),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 15, offset: const Offset(0, 8)),
        ],
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.only(topLeft: Radius.circular(24.r), topRight: Radius.circular(24.r)),
            child: hasImage 
              ? Image.network(
                  news.thumbnailImage!,
                  height: 140.h,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    height: 140.h,
                    color: Colors.white,
                    alignment: Alignment.center,
                    child: Image.asset('assets/images/logo.png', height: 60.h, fit: BoxFit.contain),
                  ),
                )
              : Container(
                  height: 140.h,
                  width: double.infinity,
                  color: Colors.white,
                  alignment: Alignment.center,
                  child: Image.asset('assets/images/logo.png', height: 60.h, fit: BoxFit.contain),
                ),
          ),
          Padding(
            padding: EdgeInsets.all(12.r),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  news.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.plusJakartaSans(fontSize: 13.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A)),
                ),
                SizedBox(height: 6.h),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 2.h),
                      decoration: BoxDecoration(color: brandColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20.r)),
                      child: Text(displayCategory, style: GoogleFonts.plusJakartaSans(fontSize: 10.sp, fontWeight: FontWeight.w700, color: brandColor)),
                    ),
                    Text(formattedDate, style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, fontWeight: FontWeight.w500, color: Colors.grey.shade400)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ));
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }

  Widget _buildBottomNav(HomeController controller, AuthController authController) {
    return Container(
      height: 82.h, // Adjusted height to accommodate larger icons (from 74.h)
      margin: EdgeInsets.fromLTRB(16.w, 0, 16.w, 20.h), 
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(100.r), 
        border: Border.all(color: Colors.grey.shade200.withOpacity(0.8), width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12), // Slightly softer shadow
            blurRadius: 20,
            spreadRadius: 1,
            offset: const Offset(0, 8), 
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 10.w),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavBtn(controller, 0, SolarIconsOutline.home2, SolarIconsBold.home2, "Trang chủ"),
            _buildNavBtn(controller, 1, SolarIconsOutline.checklist, SolarIconsBold.checklist, "Điểm danh"),
            _buildNavBtn(controller, 3, SolarIconsOutline.bus, SolarIconsBold.bus, "Đưa đón"),
            _buildNavBtn(controller, 4, SolarIconsOutline.user, SolarIconsBold.user, "Tôi"),
          ],
        ),
      ),
    );
  }

  Widget _buildNavBtn(HomeController controller, int index, IconData outlineIcon, IconData filledIcon, String label) {
    bool isActive = controller.currentIndex == index;
    final Color inactiveColor = const Color(0xFF9E9E9E);
    final Color activeColor = const Color(0xFFF26F21);

    return Expanded(
      child: GestureDetector(
        onTap: () => controller.changeTab(index),
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOutCubic,
          margin: EdgeInsets.symmetric(horizontal: 2.w, vertical: 2.h), // Minimized vertical margin
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 2.h), // Optimized padding for height
          decoration: BoxDecoration(
            color: isActive ? activeColor.withOpacity(0.06) : Colors.transparent,
            borderRadius: BorderRadius.circular(100.r),
            border: Border.all(
              color: isActive ? activeColor.withOpacity(0.2) : Colors.transparent,
              width: 1.2,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center, 
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, animation) => FadeTransition(
                  opacity: animation,
                  child: ScaleTransition(scale: animation, child: child),
                ),
                child: Icon(
                  isActive ? filledIcon : outlineIcon, 
                  key: ValueKey(isActive),
                  color: isActive ? activeColor : inactiveColor, 
                  size: 24.sp, 
                ),
              ),
              if (isActive) ...[
                SizedBox(height: 1.h), // Very tight spacing
                Text(
                  label, 
                  maxLines: 1,
                  softWrap: false,
                  overflow: TextOverflow.visible,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 9.sp, 
                    fontWeight: FontWeight.w800, 
                    color: activeColor,
                    letterSpacing: 0.1,
                  )
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(String? time) {
    if (time == null || time.isEmpty) return "--:--";
    final parts = time.split(':');
    if (parts.length >= 2) {
      return "${parts[0]}:${parts[1]}";
    }
    return time;
  }
}
