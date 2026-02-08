import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import 'face_registration_view.dart';

/// Face Registration Guide Screen with Stepper Carousel
/// Users swipe through each step before starting face scan
class FaceRegistrationGuideScreen extends StatefulWidget {
  const FaceRegistrationGuideScreen({super.key});

  @override
  State<FaceRegistrationGuideScreen> createState() => _FaceRegistrationGuideScreenState();
}

class _FaceRegistrationGuideScreenState extends State<FaceRegistrationGuideScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  // Guide steps data
  final List<GuideStep> _steps = [
    GuideStep(
      stepLabel: 'CHUẨN BỊ',
      stepNumber: 1,
      title: 'Tìm nơi đủ ánh sáng',
      description: 'Đảm bảo mặt bạn không bị bóng đổ để nhận diện chính xác nhất nhé!',
      imagePlaceholder: 'guide_step_1.png', // TODO: Add your image
    ),
    GuideStep(
      stepLabel: 'VỊ TRÍ',
      stepNumber: 2,
      title: 'Nhìn thẳng camera',
      description: 'Giữ điện thoại ngang tầm mắt và đảm bảo khuôn mặt nằm trong khung hình.',
      imagePlaceholder: 'guide_step_2.png', // TODO: Add your image
    ),
    GuideStep(
      stepLabel: 'XÁC THỰC',
      stepNumber: 3,
      title: 'Nháy mắt nhẹ nhàng',
      description: 'Vui lòng chớp mắt từ 1-2 lần để hệ thống AI xác nhận cử động sinh trắc học của bạn.',
      imagePlaceholder: 'guide_step_3.png', // TODO: Add your image
    ),
    GuideStep(
      stepLabel: 'BIỂU CẢM',
      stepNumber: 4,
      title: 'Mỉm cười nhẹ nhàng',
      description: 'Mỉm cười tự nhiên để hệ thống ghi nhận khuôn mặt rạng rỡ của bạn.',
      imagePlaceholder: 'guide_step_4.png', // TODO: Add your image
    ),
    GuideStep(
      stepLabel: 'HÀNH ĐỘNG',
      stepNumber: 5,
      title: 'Quay đầu sang trái/phải',
      description: 'Nghiêng đầu mượt một góc khoảng 20 độ để hệ thống nhận diện tốt nhất.',
      imagePlaceholder: 'guide_step_5.png', // TODO: Add your image
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _steps.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      // Last page - start face registration
      Get.off(() => const FaceRegistrationView());
    }
  }

  void _skipGuide() {
    Get.off(() => const FaceRegistrationView());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Back button
            Padding(
              padding: const EdgeInsets.only(left: 8, top: 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back_ios, color: Colors.black54),
                  onPressed: () => Get.back(),
                ),
              ),
            ),

            // PageView Carousel
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemCount: _steps.length,
                itemBuilder: (context, index) {
                  return _buildStepPage(_steps[index]);
                },
              ),
            ),

            // Dot Indicators
            _buildDotIndicators(),

            const SizedBox(height: 24),

            // Action Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _nextPage,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryOrange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    _currentPage == _steps.length - 1 ? 'Hoàn tất đăng ký' : 'Tiếp tục',
                    style: GoogleFonts.roboto(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),

            // Skip button (only show if not on last page)
            if (_currentPage < _steps.length - 1)
              TextButton(
                onPressed: _skipGuide,
                child: Text(
                  'Bỏ qua hướng dẫn',
                  style: GoogleFonts.roboto(
                    fontSize: 14,
                    color: Colors.grey.shade500,
                  ),
                ),
              )
            else
              const SizedBox(height: 16),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildStepPage(GuideStep step) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        children: [
          const SizedBox(height: 16),

          // Step Label
          Text(
            'BƯỚC ${step.stepNumber}: ${step.stepLabel}',
            style: GoogleFonts.roboto(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.primaryOrange,
              letterSpacing: 1.2,
            ),
          ),

          const SizedBox(height: 32),

          // Image Placeholder Area
          Expanded(
            child: Center(
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF5EE), // Light peach background
                  borderRadius: BorderRadius.circular(140),
                ),
                child: _buildImagePlaceholder(step),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Title
          Text(
            step.title,
            style: GoogleFonts.roboto(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 16),

          // Description
          Text(
            step.description,
            style: GoogleFonts.roboto(
              fontSize: 16,
              color: Colors.grey.shade600,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  /// Build image placeholder - replace with actual images later
  Widget _buildImagePlaceholder(GuideStep step) {
    return ClipOval(
      child: Image.asset(
        'assets/images/${step.imagePlaceholder}',
        fit: BoxFit.cover,
        width: 280,
        height: 280,
        errorBuilder: (context, error, stackTrace) {
          // Fallback if image not found
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.image_not_supported_outlined,
                size: 50,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 8),
              Text(
                'Chưa có ảnh',
                style: GoogleFonts.roboto(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildDotIndicators() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(_steps.length, (index) {
        final isActive = index == _currentPage;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: isActive ? AppColors.primaryOrange : Colors.grey.shade300,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

/// Data class for guide steps
class GuideStep {
  final String stepLabel;
  final int stepNumber;
  final String title;
  final String description;
  final String imagePlaceholder;

  GuideStep({
    required this.stepLabel,
    required this.stepNumber,
    required this.title,
    required this.description,
    required this.imagePlaceholder,
  });
}
