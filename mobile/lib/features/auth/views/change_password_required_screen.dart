import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'dart:math' as math;
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../core/utils/validators.dart';
import '../controllers/auth_controller.dart';
import '../models/user_model.dart';

class ChangePasswordRequiredScreen extends StatefulWidget {
  const ChangePasswordRequiredScreen({super.key});

  @override
  State<ChangePasswordRequiredScreen> createState() => _ChangePasswordRequiredScreenState();
}

class _ChangePasswordRequiredScreenState extends State<ChangePasswordRequiredScreen> {
  final _formKey = GlobalKey<FormState>();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final AuthController _authController = Get.find<AuthController>();
  
  final _newPassFocusNode = FocusNode();
  final _confirmPassFocusNode = FocusNode();
  
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _newPassFocusNode.addListener(_onFocusChange);
    _confirmPassFocusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    if (_newPassFocusNode.hasFocus || _confirmPassFocusNode.hasFocus) {
      Future.delayed(const Duration(milliseconds: 350), () {
        if (!mounted) return;
        final focusedContext = _newPassFocusNode.hasFocus 
            ? _newPassFocusNode.context 
            : _confirmPassFocusNode.context;
        if (focusedContext != null) {
          Scrollable.ensureVisible(
            focusedContext,
            duration: const Duration(milliseconds: 350),
            curve: Curves.easeOutCubic,
            alignment: 0.2,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _newPassFocusNode.dispose();
    _confirmPassFocusNode.dispose();
    super.dispose();
  }

  Future<void> _handleChangePassword() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      
      try {
        final response = await _authController.apiService.post(
          '/api/auth/change-password',
          data: {'newPassword': _newPasswordController.text},
        );
        
        if (response.statusCode == 200) {
          final currentUser = _authController.currentUser.value;
          if (currentUser != null) {
             final updatedUser = User(
              id: currentUser.id,
              fullName: currentUser.fullName,
              username: currentUser.username,
              email: currentUser.email,
              role: currentUser.role,
              avatarUrl: currentUser.avatarUrl,
              isPasswordChanged: true,
            );
            _authController.currentUser.value = updatedUser;
            await _authController.apiService.saveUserData(updatedUser.toJson());
          }

          Get.snackbar(
            'Thành công',
            'Đã đổi mật khẩu!',
            backgroundColor: const Color(0xFF5AB66F),
            colorText: Colors.white,
            snackPosition: SnackPosition.TOP,
          );
          
          Get.offAllNamed(AppRoutes.home);
        }
      } catch (e) {
        Get.snackbar(
          'Lỗi',
          'Không thể đổi mật khẩu: ${e.toString()}',
          backgroundColor: const Color(0xFFEA5C36),
          colorText: Colors.white,
          snackPosition: SnackPosition.TOP,
        );
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color orangePrimary = Color(0xFFF26F21);
    const Color orangeSecondary = Color(0xFFEA5C36);

    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: Scaffold(
        backgroundColor: Colors.white,
        resizeToAvoidBottomInset: true,
        body: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            children: [
              // Header Section with Pattern
              Stack(
                children: [
                  Container(
                    height: 320.h,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          orangeSecondary.withOpacity(0.35),
                          orangePrimary.withOpacity(0.01),
                        ],
                      ),
                    ),
                    child: CustomPaint(
                      painter: _NetworkPatternPainter(
                        color: orangePrimary.withOpacity(0.2),
                        accentColors: const [Color(0xFF336DB5), Color(0xFF5AB66F)],
                      ),
                    ),
                  ),
                  
                  // Icon/Logo at Top
                  Positioned(
                    top: 100.h,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        padding: EdgeInsets.all(20.w),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.8),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.lock_reset_rounded,
                          size: 70.sp,
                          color: orangePrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Form Content
              Transform.translate(
                offset: Offset(0, -40.h),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 22.w),
                  child: Column(
                    children: [
                      Container(
                        width: double.infinity,
                        padding: EdgeInsets.all(32.w),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30.r),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 32,
                              offset: const Offset(0, 16),
                            )
                          ],
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Text(
                                "Đổi mật khẩu",
                                style: TextStyle(
                                  fontSize: 24.sp,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF2D3142),
                                ),
                              ),
                              SizedBox(height: 10.h),
                              Text(
                                "Bạn cần đổi mật khẩu cho lần đăng nhập đầu tiên.",
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14.sp,
                                  color: Colors.grey.shade500,
                                  height: 1.4,
                                ),
                              ),
                              SizedBox(height: 35.h),
                              
                              // New Password
                              _buildPillTextField(
                                controller: _newPasswordController,
                                hintText: "Mật khẩu mới",
                                focusNode: _newPassFocusNode,
                                isPassword: true,
                                isObscure: _obscureNew,
                                toggleObscure: () => setState(() => _obscureNew = !_obscureNew),
                              ),
                              
                              SizedBox(height: 18.h),
                              
                              // Confirm Password
                              _buildPillTextField(
                                controller: _confirmPasswordController,
                                hintText: "Xác nhận mật khẩu",
                                focusNode: _confirmPassFocusNode,
                                isPassword: true,
                                isObscure: _obscureConfirm,
                                toggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
                                validator: (v) {
                                  if (v != _newPasswordController.text) return 'Mật khẩu không khớp';
                                  return null;
                                },
                              ),
                              
                              SizedBox(height: 30.h),

                      // Button
                      Container(
                        width: double.infinity,
                        height: 54.h,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(25.r),
                          gradient: const LinearGradient(
                            colors: [orangePrimary, orangeSecondary],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: orangePrimary.withOpacity(0.3),
                              blurRadius: 15,
                              offset: const Offset(0, 8),
                            )
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleChangePassword,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25.r)),
                          ),
                          child: _isLoading
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : Text(
                                  "ĐỔI MẬT KHẨU",
                                  style: TextStyle(
                                    fontSize: 15.sp,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                        ),
                      ),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 60.h),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPillTextField({
    required TextEditingController controller,
    required String hintText,
    FocusNode? focusNode,
    bool isPassword = false,
    bool isObscure = false,
    VoidCallback? toggleObscure,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(25.r),
        border: Border.all(color: Colors.grey.withOpacity(0.12), width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.07),
            blurRadius: 16,
            offset: const Offset(0, 5),
          )
        ],
      ),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        obscureText: isPassword && isObscure,
        validator: validator ?? (v) {
          if (v == null || v.isEmpty) return 'Vui lòng nhập thông tin';
          if (isPassword && v.length < 6) return 'Tối thiểu 6 ký tự';
          return null;
        },
        style: TextStyle(fontSize: 16.sp, color: Colors.black54, fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: Icon(Icons.lock_outline_rounded, size: 20.sp, color: Colors.grey.shade400),
          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14.sp),
          contentPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 15.h),
          border: InputBorder.none,
          suffixIcon: isPassword 
            ? IconButton(
                icon: Icon(isObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20.sp, color: Colors.grey.shade400),
                onPressed: toggleObscure,
              )
            : null,
        ),
      ),
    );
  }
}

// Logic copy-paste from login_screen for consistency
class _NetworkPatternPainter extends CustomPainter {
  final Color color;
  final List<Color> accentColors;
  _NetworkPatternPainter({required this.color, required this.accentColors});

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = Colors.black.withOpacity(0.06)
      ..strokeWidth = 0.4
      ..style = PaintingStyle.stroke;

    final List<_Crystal> crystals = [
      _Crystal(Offset(size.width * 0.72, size.height * 0.18), 38, accentColors[0].withOpacity(0.3), 5),
      _Crystal(Offset(size.width * 0.9, size.height * 0.42), 48, accentColors[1].withOpacity(0.25), 6),
      _Crystal(Offset(size.width * 0.52, size.height * 0.48), 28, color.withOpacity(0.35), 5),
      _Crystal(Offset(size.width * 0.82, size.height * 0.68), 32, color.withOpacity(0.25), 4),
      _Crystal(Offset(size.width * 0.28, size.height * 0.52), 42, accentColors[1].withOpacity(0.3), 5),
    ];

    for (int i = 0; i < crystals.length; i++) {
      for (int j = i + 1; j < crystals.length; j++) {
        double dist = (crystals[i].center - crystals[j].center).distance;
        if (dist < 230) canvas.drawLine(crystals[i].center, crystals[j].center, linePaint);
      }
    }
    for (var crystal in crystals) _drawFacetedCrystal(canvas, crystal);
  }

  void _drawFacetedCrystal(Canvas canvas, _Crystal crystal) {
    final Path path = Path();
    final int sides = crystal.sides;
    final double radius = crystal.size;
    final double angleStep = (2 * math.pi) / sides;
    for (int i = 0; i < sides; i++) {
      double angle = i * angleStep;
      double x = crystal.center.dx + radius * math.cos(angle);
      double y = crystal.center.dy + radius * math.sin(angle);
      if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.close();
    canvas.drawPath(path, Paint()..shader = LinearGradient(colors: [Colors.white.withOpacity(0.25), crystal.color.withOpacity(0.15)]).createShader(Rect.fromCircle(center: crystal.center, radius: radius)));
    canvas.drawPath(path, Paint()..color = Colors.white.withOpacity(0.5)..style = PaintingStyle.stroke..strokeWidth = 0.5);
  }
  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}

class _Crystal {
  final Offset center;
  final double size;
  final Color color;
  final int sides;
  _Crystal(this.center, this.size, this.color, this.sides);
}
