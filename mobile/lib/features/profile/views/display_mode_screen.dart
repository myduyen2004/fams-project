import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../../../core/controllers/theme_controller.dart';

class DisplayModeScreen extends StatelessWidget {
  const DisplayModeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ThemeController themeController = ThemeController.to;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        leading: GestureDetector(
          onTap: () => Get.back(),
          child: Icon(SolarIconsOutline.altArrowLeft, size: 24.sp),
        ),
        title: Text(
          'Chế độ hiển thị',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 18.sp,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: Obx(() {
        final isSystem = themeController.themeMode.value == ThemeMode.system;
        final isDark = themeController.isDarkMode;

        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 20.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Giao diện',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14.sp,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                  letterSpacing: 0.5,
                ),
              ),
              SizedBox(height: 24.h),
              
              // Appearance Cards
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildMockCard(
                    context: context,
                    title: 'Sáng',
                    isDarkVariant: false,
                    isSelected: !isDark && !isSystem,
                    onTap: () {
                      if (!isSystem) themeController.saveTheme(false);
                    },
                    icon: SolarIconsBold.sun,
                    iconColor: const Color(0xFFF26F21),
                    isDisabled: isSystem,
                  ),
                  SizedBox(width: 32.w),
                  _buildMockCard(
                    context: context,
                    title: 'Tối',
                    isDarkVariant: true,
                    isSelected: isDark && !isSystem,
                    onTap: () {
                      if (!isSystem) themeController.saveTheme(true);
                    },
                    icon: SolarIconsBold.moon,
                    iconColor: Colors.blueAccent,
                    isDisabled: isSystem,
                  ),
                ],
              ),
              
              SizedBox(height: 48.h),
              
              // Device Settings Toggle
              Container(
                padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(20.r),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Sử dụng cài đặt thiết bị',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 16.sp,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Switch(
                          value: isSystem,
                          onChanged: (val) {
                            if (val) {
                              themeController.setSystemTheme();
                            } else {
                              themeController.saveTheme(Get.isPlatformDarkMode);
                            }
                          },
                          activeColor: Colors.white,
                          activeTrackColor: const Color(0xFFF26F21),
                          inactiveTrackColor: Colors.grey.shade300,
                          inactiveThumbColor: Colors.white,
                        ),
                      ],
                    ),
                    SizedBox(height: 8.h),
                    Text(
                      'Tự động khớp giao diện theo cài đặt Hiển thị & Độ sáng của thiết bị.',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.sp,
                        fontWeight: FontWeight.w500,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildMockCard({
    required BuildContext context,
    required String title,
    required bool isDarkVariant,
    required bool isSelected,
    required VoidCallback onTap,
    required IconData icon,
    required Color iconColor,
    required bool isDisabled,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: isDisabled ? 0.5 : 1.0,
        child: Column(
          children: [
            // The Mock UI Device frame
            Container(
              width: 100.w,
              height: 160.h,
              padding: EdgeInsets.all(8.r),
              decoration: BoxDecoration(
                color: isDarkVariant ? const Color(0xFF1E1E1E) : Colors.white,
                borderRadius: BorderRadius.circular(16.r),
                border: Border.all(
                  color: isSelected && !isDisabled
                      ? const Color(0xFFF26F21)
                      : Colors.transparent,
                  width: 2.w,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDarkVariant ? 0.2 : 0.05),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  )
                ],
              ),
              child: Column(
                children: [
                  // Mock Avatar & Name
                  Row(
                    children: [
                      Container(
                        width: 20.r,
                        height: 20.r,
                        decoration: BoxDecoration(
                          color: isDarkVariant ? Colors.grey.shade800 : Colors.grey.shade200,
                          shape: BoxShape.circle,
                        ),
                      ),
                      SizedBox(width: 8.w),
                      Container(
                        width: 40.w,
                        height: 8.h,
                        decoration: BoxDecoration(
                          color: isDarkVariant ? Colors.grey.shade800 : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(4.r),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16.h),
                  // Mock Grid Cards
                  Expanded(
                    child: GridView.count(
                      crossAxisCount: 2,
                      mainAxisSpacing: 6,
                      crossAxisSpacing: 6,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        _mockColorBlock(Colors.green.shade300, isDarkVariant),
                        _mockColorBlock(Colors.amber.shade300, isDarkVariant),
                        _mockColorBlock(Colors.purple.shade200, isDarkVariant),
                        _mockColorBlock(Colors.blue.shade300, isDarkVariant),
                      ],
                    ),
                  )
                ],
              ),
            ),
            SizedBox(height: 16.h),
            Text(
              title,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 15.sp,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            SizedBox(height: 12.h),
            // Radio button manually built
            Container(
              width: 24.r,
              height: 24.r,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected && !isDisabled ? Colors.transparent : Colors.grey.shade400,
                  width: 2,
                ),
                color: isSelected && !isDisabled ? const Color(0xFFF26F21) : Colors.transparent,
              ),
              child: isSelected && !isDisabled
                  ? Icon(Icons.check, size: 16.sp, color: Colors.white)
                  : null,
            )
          ],
        ),
      ),
    );
  }

  Widget _mockColorBlock(Color color, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? color.withOpacity(0.6) : color.withOpacity(0.8),
        borderRadius: BorderRadius.circular(6.r),
      ),
    );
  }
}
