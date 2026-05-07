import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../controllers/auth_controller.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  final AuthController _authController = Get.find<AuthController>();

  // Animation Controllers
  late AnimationController _circleController; // For orange circle zoom
  late AnimationController _animalController; // For animal running in
  late AnimationController _textController;   // For logo text fade

  // Animations
  late Animation<double> _circleAnimation;
  late Animation<double> _circleOpacityAnimation;
  late Animation<Offset> _animalSlideAnimation;
  late Animation<double> _animalFadeAnimation; // Added for gradual appearance
  late Animation<double> _textFadeAnimation;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _startAnimationSequence();
  }

  void _setupAnimations() {
    // 1. Circle Zoom (Slow and very gradual shrink)
    _circleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3500), // Much slower
    );
    _circleAnimation = Tween<double>(
      begin: 20.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _circleController,
      curve: Curves.easeInOutSine, // More even/gradual transition
    ));

    // 2. Circle Opacity Transition (Fade in more slowly)
    _circleOpacityAnimation = Tween<double>(
      begin: 0.1,
      end: 0.35,
    ).animate(CurvedAnimation(
      parent: _circleController,
      curve: const Interval(0.0, 0.8, curve: Curves.easeIn),
    ));

    // 3. Animal Slide & Fade (Slower and simultaneous)
    _animalController = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 3000));
    
    _animalSlideAnimation = Tween<Offset>(
      begin: const Offset(-2.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animalController, curve: Curves.easeOutCubic));
    
    _animalFadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _animalController, curve: Curves.easeIn));

    // 4. Text Fade (Delayed logo)
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _textFadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(_textController);
  }

  Future<void> _startAnimationSequence() async {
    // 1. Start the circle shrink (gradual and slow)
    _circleController.forward();
    
    // 2. Start the animal character animation mid-way (simultaneous feel)
    await Future.delayed(const Duration(milliseconds: 1000));
    _animalController.forward();
    
    // Wait for the main elements to settle
    await Future.delayed(const Duration(milliseconds: 2500));
    
    // 3. Final logo text appearance
    _textController.forward();
    
    // Maintain splash for a total time (slower overall pace)
    await Future.delayed(const Duration(seconds: 2));

    _navigateToNext();
  }

  void _navigateToNext() {
    if (_authController.isAuthenticated.value) {
      Get.offAllNamed(AppRoutes.home);
    } else {
      Get.offAllNamed(AppRoutes.login);
    }
  }

  @override
  void dispose() {
    _circleController.dispose();
    _animalController.dispose();
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // 1. Centralized Elements
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Top: Logo Text
                FadeTransition(
                  opacity: _textFadeAnimation,
                  child: Image.asset(
                    'assets/images/logo.png', // Placeholder (Owly text style)
                    width: 200,
                    errorBuilder: (context, error, stackTrace) => const Text(
                      'FAMS',
                      style: TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                        color: AppColors.brandOrangePrimary,
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 40),

                // Middle: Circle & Animal
                Stack(
                  alignment: Alignment.center,
                  children: [
                    // Orange Circle
                    AnimatedBuilder(
                      animation: _circleOpacityAnimation,
                      builder: (context, child) {
                        return ScaleTransition(
                          scale: _circleAnimation,
                          child: Container(
                            width: 180,
                            height: 180,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.brandOrangePrimary.withOpacity(_circleOpacityAnimation.value),
                            ),
                          ),
                        );
                      },
                    ),
                    
                    // Animal Character
                    FadeTransition(
                      opacity: _animalFadeAnimation,
                      child: SlideTransition(
                        position: _animalSlideAnimation,
                        child: Image.asset(
                          'assets/images/animal_char.png', // Placeholder (The Owl)
                          width: 150,
                          errorBuilder: (context, error, stackTrace) => const Icon(
                            Icons.pets, // Fallback icon
                            size: 120,
                            color: AppColors.brandOrangePrimary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 60),
                
                // Bottom: Loading indicator
                const SizedBox(
                  width: 200,
                  child: LinearProgressIndicator(
                    backgroundColor: Color(0xFFEEEEEE),
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.brandOrangePrimary),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'loading...',
                  style: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 14,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          
        ],
      ),
    );
  }
}
