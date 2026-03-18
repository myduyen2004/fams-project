import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../core/utils/validators.dart';
import '../../../shared/widgets/wavy_background.dart';
import '../controllers/auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final AuthController _authController = Get.find<AuthController>();
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final success = await _authController.login(
        _usernameController.text.trim(),
        _passwordController.text,
      );

      if (success) {
        final user = _authController.currentUser.value;
        if (user?.isPasswordChanged == false && !user!.isAdmin) {
          Get.offAllNamed(AppRoutes.changePasswordRequired);
        } else {
          Get.offAllNamed(AppRoutes.home);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true, // Allow resize for keyboard
        body: WavyBackground(
          child: SizedBox( // SizedBox to ensure full height
            width: double.infinity,
            height: double.infinity,
            child: Center( // Center content when keyboard is closed
              child: SingleChildScrollView( // Scrollable when keyboard opens
                physics: const ClampingScrollPhysics(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo Section
                      Hero(
                        tag: 'logo',
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 180,
                          errorBuilder: (context, error, stackTrace) => const Icon(Icons.favorite, color: Colors.white, size: 100),
                        ),
                      ),
                      const SizedBox(height: 48),

                      // Glass Login Card
                      ClipRRect(
                        borderRadius: BorderRadius.circular(40),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                          child: Container(
                            padding: const EdgeInsets.all(32),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(40),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text(
                                    'Đăng nhập',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primaryOrange,
                                    ),
                                  ),
                                  const SizedBox(height: 32),

                                  // Email Field (Stadium shape)
                                  TextFormField(
                                    controller: _usernameController,
                                    validator: Validators.username,
                                    decoration: _buildStadiumDecoration(
                                      hintText: 'Tên đăng nhập',
                                    ),
                                  ),
                                  const SizedBox(height: 20),

                                  // Password Field (Stadium shape)
                                  TextFormField(
                                    controller: _passwordController,
                                    validator: Validators.password,
                                    obscureText: _obscurePassword,
                                    decoration: _buildStadiumDecoration(
                                      hintText: 'Mật khẩu',
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                          color: Colors.grey,
                                        ),
                                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 32),

                                  // Continue Button
                                  Obx(() => ElevatedButton(
                                    onPressed: _authController.isLoading.value ? null : _handleLogin,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primaryOrange,
                                      foregroundColor: Colors.white,
                                      elevation: 4,
                                      shadowColor: AppColors.primaryOrange.withOpacity(0.4),
                                      padding: const EdgeInsets.symmetric(vertical: 16),
                                      shape: const StadiumBorder(),
                                    ),
                                    child: _authController.isLoading.value
                                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                        : const Text('Đăng nhập', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                  )),

                                  const SizedBox(height: 16),

                                  // Forgot Password
                                  Center(
                                    child: TextButton(
                                      onPressed: () => Get.toNamed(AppRoutes.forgotPassword),
                                      child: const Text(
                                        'Quên mật khẩu?',
                                        style: TextStyle(
                                          color: Colors.grey,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          decoration: TextDecoration.underline,
                                          decorationColor: Colors.grey,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _buildStadiumDecoration({required String hintText, Widget? suffixIcon}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
      filled: true,
      fillColor: Colors.white,
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(30),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(30),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(30),
        borderSide: const BorderSide(color: AppColors.primaryOrange),
      ),
    );
  }
}
