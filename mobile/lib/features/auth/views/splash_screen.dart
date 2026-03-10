import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../shared/widgets/wavy_background.dart';
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
    debugPrint('SplashScreen: Starting _navigateToNext');
    // Wait for at least 1 second to show the brand
    final minDelay = Future.delayed(const Duration(milliseconds: 1000));

    debugPrint('SplashScreen: Waiting for AuthController initialization...');
    await _waitForInitialization();
    debugPrint('SplashScreen: AuthController initialized.');

    await minDelay;
    debugPrint('SplashScreen: Minimum delay completed. Navigating...');

    // Check authentication status
    if (_authController.isAuthenticated.value) {
      debugPrint('SplashScreen: Authenticated, going to Home');
      Get.offAllNamed(AppRoutes.home);
    } else {
      debugPrint('SplashScreen: Not authenticated, going to Login');
      Get.offAllNamed(AppRoutes.login);
    }
  }

  Future<void> _waitForInitialization() async {
    // Wait until isInitialized becomes true, up to 5 seconds.
    // Replace the while loop with a cleaner GetX worker or Future.any approach
    try {
      if (_authController.isInitialized.value) return;

      // We wait for the value to change to true, but timeout after 5 seconds
      await interval(_authController.isInitialized, (bool init) {
        if (init) return;
      }, time: const Duration(seconds: 5));
    } catch (e) {
      debugPrint('SplashScreen: WARNING: Waiting for init failed: $e');
    }

    // Fallback: Just wait 1 second absolute max if it's still false
    if (!_authController.isInitialized.value) {
      await Future.delayed(const Duration(seconds: 1));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: WavyBackground(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // FAMS Logo
              Hero(
                tag: 'logo',
                child: Image.asset(
                  'assets/images/logo.png',
                  width: 240,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(
                      Icons.favorite,
                      size: 150,
                      color: Colors.white,
                    );
                  },
                ),
              ),
              const SizedBox(height: 48),
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(
                  AppColors.primaryOrange,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
