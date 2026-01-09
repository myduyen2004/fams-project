import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../controllers/auth_controller.dart';

/// Splash Screen - FAMS Logo
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final AuthController _authController = Get.find<AuthController>();

  @override
  void initState() {
    super.initState();
    _navigateToNext();
  }

  Future<void> _navigateToNext() async {
    await Future.delayed(const Duration(seconds: 2));

    // Check authentication status
    if (_authController.isAuthenticated.value) {
      Get.offAllNamed(AppRoutes.home);
    } else {
      Get.offAllNamed(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // FAMS Logo
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildLogoLetter('F', AppColors.brandBlue),
                const SizedBox(width: 8),
                _buildLogoLetter('A', AppColors.primaryOrange),
                const SizedBox(width: 8),
                _buildLogoLetter('M', AppColors.brandGreen),
                const SizedBox(width: 8),
                _buildLogoLetter('S', AppColors.brandBlue),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoLetter(String letter, Color color) {
    return Transform.rotate(
      angle: -0.05, // Slight tilt
      child: Container(
        width: 60,
        height: 80,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(
            letter,
            style: const TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
