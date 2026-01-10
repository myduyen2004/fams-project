import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../core/utils/validators.dart';
import '../../../shared/widgets/wavy_background.dart';
import '../controllers/auth_controller.dart';

/// Forgot Password Screen
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final AuthController _authController = Get.find<AuthController>();
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    if (_formKey.currentState!.validate()) {
      final success = await _authController.forgotPassword(
        _emailController.text.trim(),
      );

      if (success) {
        Get.toNamed(
          AppRoutes.otpVerification,
          arguments: {'email': _emailController.text.trim()},
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        body: WavyBackground(
          child: SizedBox(
            height: double.infinity,
            child: SingleChildScrollView( // Scrollable
              physics: const ClampingScrollPhysics(),
              child: Column(
                children: [
                   const SizedBox(height: 60), // Status bar padding
                  
                  // Top Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back_ios, color: AppColors.primaryOrange, size: 24),
                          onPressed: () => Get.back(),
                        ),
                        const Expanded(
                          child: Text(
                            'Recovery',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.primaryOrange,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 48), // Balance for back button
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),
                  
                  const Icon(Icons.lock_reset, color: AppColors.primaryOrange, size: 80),
                  const SizedBox(height: 40),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0),
                    child: Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(40),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryOrange.withOpacity(0.1),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Quên mật khẩu',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryOrange,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Nhập email của bạn để nhận mã OTP',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 32),

                            // Email field (Stadium)
                            TextFormField(
                              controller: _emailController,
                              validator: Validators.email,
                              keyboardType: TextInputType.emailAddress,
                              decoration: _buildStadiumDecoration(
                                hintText: 'your.email@fpt.edu.vn',
                              ),
                            ),
                            const SizedBox(height: 32),

                            // Send OTP Button
                            Obx(() => ElevatedButton(
                              onPressed: _authController.isLoading.value ? null : _handleSendOtp,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryOrange,
                                foregroundColor: Colors.white,
                                elevation: 4,
                                shadowColor: AppColors.primaryOrange.withOpacity(0.4),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: const StadiumBorder(),
                              ),
                              child: _authController.isLoading.value
                                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text('Gửi mã OTP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            )),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _buildStadiumDecoration({required String hintText}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
      filled: true,
      fillColor: Colors.white,
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
