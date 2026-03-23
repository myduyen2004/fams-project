import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/news_controller.dart';
import '../models/news_model.dart';
import 'news_detail_screen.dart';
import '../../home/controllers/home_controller.dart';
import '../../auth/controllers/auth_controller.dart';

class NewsListScreen extends StatelessWidget {
  const NewsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Inject Controller
    final NewsController controller = Get.put(NewsController());
    final HomeController homeController = Get.find<HomeController>();
    final AuthController authController = Get.find<AuthController>();

    return Scaffold(
      extendBody: true,
      backgroundColor: AppColors.backgroundColor,
      bottomNavigationBar: _buildBottomNav(homeController, authController),
      body: Obx(() {
        if (controller.isLoading.value && controller.newsList.isEmpty) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.brandOrangePrimary),
          );
        }

        if (controller.errorMessage.isNotEmpty && controller.newsList.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(SolarIconsOutline.dangerTriangle, size: 40.sp, color: Colors.grey),
                SizedBox(height: 16.h),
                Text(
                  controller.errorMessage.value,
                  style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, color: Colors.grey),
                ),
                SizedBox(height: 16.h),
                ElevatedButton(
                  onPressed: () => controller.fetchNews(),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.brandOrangePrimary),
                  child: const Text("Thử lại"),
                ),
              ],
            ),
          );
        }

        if (controller.newsList.isEmpty) {
          return Center(
            child: Text(
              "Chưa có tin tức nào",
              style: GoogleFonts.plusJakartaSans(fontSize: 16.sp, color: Colors.grey),
            ),
          );
        }

        // Separate Hero (first item) and the rest
        final NewsModel heroNews = controller.newsList.first;
        final List<NewsModel> feedNews = controller.newsList.length > 1 
            ? controller.newsList.sublist(1) 
            : [];

        return CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // 1. App Bar equivalent handled manually or via SliverAppBar to float over the Hero
            SliverToBoxAdapter(
              child: Stack(
                children: [
                  _buildHeroSection(heroNews),
                  // Back Button Overlay
                  Positioned(
                    top: MediaQuery.of(context).padding.top + 10.h,
                    left: 16.w,
                    child: GestureDetector(
                      onTap: () => Get.back(),
                      child: Container(
                        padding: EdgeInsets.all(8.r),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.3),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          SolarIconsOutline.altArrowLeft,
                          color: Colors.white,
                          size: 24.sp,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // 2. News Feed Header
            if (feedNews.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(20.w, 24.h, 20.w, 16.h),
                  child: Text(
                    "Tin tức mới nhất",
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20.sp,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ),
            
            // 3. Optimized News List
            if (feedNews.isNotEmpty)
              SliverPadding(
                padding: EdgeInsets.symmetric(horizontal: 20.w).copyWith(bottom: 40.h),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = feedNews[index];
                      return Padding(
                        padding: EdgeInsets.only(bottom: 16.h),
                        child: _buildHorizontalNewsCard(item),
                      );
                    },
                    childCount: feedNews.length,
                  ),
                ),
              ),
              
            // Safe area at bottom
            if (feedNews.isEmpty)
              SliverToBoxAdapter(child: SizedBox(height: 40.h)),
          ],
        );
      }),
    );
  }

  Widget _buildHeroSection(NewsModel news) {
    bool hasImage = news.thumbnailImage != null && news.thumbnailImage!.isNotEmpty;

    String displayCategory = news.type ?? 'Tin tức';
    if (displayCategory == 'SYSTEM') displayCategory = 'Hệ thống';
    else if (displayCategory == 'ACADEMIC') displayCategory = 'Học tập';
    else if (displayCategory == 'EVENT') displayCategory = 'Sự kiện';

    return SizedBox(
      width: double.infinity,
      height: 400.h,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background Image
          hasImage
            ? Image.network(
                news.thumbnailImage!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: Colors.white,
                  alignment: Alignment.center,
                  child: Image.asset('assets/images/logo.png', height: 100.h, fit: BoxFit.contain),
                ),
              )
            : Container(
                color: Colors.white,
                alignment: Alignment.center,
                child: Image.asset('assets/images/logo.png', height: 100.h, fit: BoxFit.contain),
              ),
          // Gradient Overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [
                  Colors.black.withOpacity(0.9),
                  Colors.black.withOpacity(0.4),
                  Colors.transparent,
                ],
                stops: const [0.0, 0.4, 1.0],
              ),
            ),
          ),
          // Content
          Positioned(
            left: 20.w,
            right: 20.w,
            bottom: 30.h,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                  decoration: BoxDecoration(
                    color: AppColors.brandOrangePrimary.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(20.r),
                  ),
                  child: Text(
                    displayCategory.toUpperCase(),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.sp,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
                SizedBox(height: 12.h),
                Text(
                  news.title,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 24.sp,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    height: 1.25,
                    letterSpacing: -0.5,
                  ),
                ),
                SizedBox(height: 16.h),
                GestureDetector(
                  onTap: () {
                    Get.to(() => NewsDetailScreen(news: news));
                  },
                  child: Container(
                    padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 12.h),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.brandOrangeSecondary, AppColors.brandOrangePrimary],
                      ),
                      borderRadius: BorderRadius.circular(100.r),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.brandOrangePrimary.withOpacity(0.4),
                          blurRadius: 15,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Text(
                      "Đọc chi tiết",
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14.sp,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHorizontalNewsCard(NewsModel news) {
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
        padding: EdgeInsets.all(12.r),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(20.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: AppColors.borderColor.withOpacity(0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Image
          ClipRRect(
            borderRadius: BorderRadius.circular(14.r),
            child: hasImage 
              ? Image.network(
                  news.thumbnailImage!,
                  height: 96.w,
                  width: 96.w,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    height: 96.w,
                    width: 96.w,
                    color: Colors.white,
                    alignment: Alignment.center,
                    child: Image.asset('assets/images/logo.png', height: 40.h, fit: BoxFit.contain),
                  ),
                )
              : Container(
                  height: 96.w,
                  width: 96.w,
                  color: Colors.white,
                  alignment: Alignment.center,
                  child: Image.asset('assets/images/logo.png', height: 40.h, fit: BoxFit.contain),
                ),
          ),
          SizedBox(width: 16.w),
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Text(
                      displayCategory.toUpperCase(),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.sp,
                        fontWeight: FontWeight.w800,
                        color: AppColors.brandOrangePrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    SizedBox(width: 6.w),
                    Container(width: 4.w, height: 4.w, decoration: BoxDecoration(color: Colors.grey.shade300, shape: BoxShape.circle)),
                    SizedBox(width: 6.w),
                    Text(
                      formattedDate,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.sp,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 8.h),
                Text(
                  news.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14.sp,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  // REPLICATED NAVIGATION BAR FROM HOMESCREEN
  Widget _buildBottomNav(HomeController controller, AuthController authController) {
    return Container(
      height: 82.h,
      margin: EdgeInsets.fromLTRB(16.w, 0, 16.w, 20.h), 
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(100.r), 
        border: Border.all(color: Colors.grey.shade200.withOpacity(0.8), width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
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
    bool isActive = false; // Never active because we are on a separate screen
    final Color inactiveColor = const Color(0xFF9E9E9E);
    final Color activeColor = const Color(0xFFF26F21);

    return Expanded(
      child: GestureDetector(
        onTap: () {
          Get.until((route) => route.isFirst);
          controller.changeTab(index);
        },
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOutCubic,
          margin: EdgeInsets.symmetric(horizontal: 2.w, vertical: 2.h),
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 2.h),
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
                SizedBox(height: 1.h),
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
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
