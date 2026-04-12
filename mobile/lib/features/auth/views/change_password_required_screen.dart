import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
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
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final AuthController _authController = Get.find<AuthController>();
  
  final _currentPassFocusNode = FocusNode();
  final _newPassFocusNode = FocusNode();
  final _confirmPassFocusNode = FocusNode();
  
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _currentPasswordController.text = Get.arguments ?? '';
    
    _currentPassFocusNode.addListener(_onFocusChange);
    _newPassFocusNode.addListener(_onFocusChange);
    _confirmPassFocusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    if (_currentPassFocusNode.hasFocus || _newPassFocusNode.hasFocus || _confirmPassFocusNode.hasFocus) {
      Future.delayed(const Duration(milliseconds: 350), () {
        if (!mounted) return;
        final focusedContext = _currentPassFocusNode.hasFocus 
            ? _currentPassFocusNode.context 
            : (_newPassFocusNode.hasFocus ? _newPassFocusNode.context : _confirmPassFocusNode.context);
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
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    _currentPassFocusNode.dispose();
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
          data: {
            'currentPassword': _currentPasswordController.text,
            'newPassword': _newPasswordController.text,
          },
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
    return GestureDetector(
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFFFEF3DE),
                Colors.white,
              ],
              stops: [0.0, 0.3],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 10.h),
                    child: Column(
                      children: [
                        _buildInfoCard(),
                        SizedBox(height: 24.h),
                        _buildForm(),
                        SizedBox(height: 40.h),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 16.h),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Get.offAllNamed(AppRoutes.login),
            child: Container(
              padding: EdgeInsets.all(10.r),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14.r),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10)],
              ),
              child: Icon(Icons.arrow_back_rounded, color: Colors.black87, size: 24.sp),
            ),
          ),
          SizedBox(width: 16.w),
          Text(
            "Đổi mật khẩu",
            style: GoogleFonts.plusJakartaSans(
              fontSize: 24.sp,
              fontWeight: FontWeight.w800,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    const Color orangePrimary = Color(0xFFF26F21);
    return Container(
      padding: EdgeInsets.all(20.r),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(20.r),
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: orangePrimary, size: 24.sp),
          SizedBox(width: 12.w),
          Expanded(
            child: Text(
              "Bạn cần đổi mật khẩu cho lần đăng nhập đầu tiên để bảo mật tài khoản.",
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13.5.sp,
                color: Colors.blueGrey.shade700,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    const Color orangePrimary = Color(0xFFF26F21);
    const Color orangeSecondary = Color(0xFFEA5C36);
    return Form(
      key: _formKey,
      child: Column(
        children: [
          _buildPillTextField(
            controller: _currentPasswordController,
            hintText: "Mật khẩu hiện tại",
            focusNode: _currentPassFocusNode,
            isPassword: true,
            isObscure: _obscureCurrent,
            toggleObscure: () => setState(() => _obscureCurrent = !_obscureCurrent),
            prefixIcon: Icons.lock_open_rounded,
          ),
          SizedBox(height: 20.h),
          _buildPillTextField(
            controller: _newPasswordController,
            hintText: "Mật khẩu mới",
            focusNode: _newPassFocusNode,
            isPassword: true,
            isObscure: _obscureNew,
            toggleObscure: () => setState(() => _obscureNew = !_obscureNew),
            prefixIcon: Icons.lock_outline_rounded,
          ),
          SizedBox(height: 20.h),
          _buildPillTextField(
            controller: _confirmPasswordController,
            hintText: "Xác nhận mật khẩu",
            focusNode: _confirmPassFocusNode,
            isPassword: true,
            isObscure: _obscureConfirm,
            toggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
            prefixIcon: Icons.lock_reset_rounded,
            validator: (v) {
              if (v != _newPasswordController.text) return 'Mật khẩu không khớp';
              return null;
            },
          ),
          SizedBox(height: 48.h),
          Container(
            width: double.infinity,
            height: 60.h,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20.r),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [orangePrimary, orangeSecondary],
              ),
              boxShadow: [
                BoxShadow(
                  color: orangePrimary.withOpacity(0.35),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ],
            ),
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleChangePassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
              ),
              child: _isLoading
                  ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : Text(
                      "ĐỔI MẬT KHẨU",
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 1.2,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPillTextField({
    required TextEditingController controller,
    required String hintText,
    FocusNode? focusNode,
    IconData? prefixIcon,
    bool isPassword = false,
    bool isObscure = false,
    VoidCallback? toggleObscure,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
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
        style: GoogleFonts.plusJakartaSans(
          fontSize: 15.sp, 
          color: const Color(0xFF1E2A3A), 
          fontWeight: FontWeight.w600
        ),
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: Icon(
            prefixIcon ?? Icons.lock_outline_rounded, 
            size: 22.sp, 
            color: AppColors.primaryOrange.withOpacity(0.7)
          ),
          hintStyle: GoogleFonts.plusJakartaSans(color: Colors.grey.shade400, fontSize: 14.sp, fontWeight: FontWeight.w500),
          contentPadding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 18.h),
          border: InputBorder.none,
          suffixIcon: isPassword 
            ? IconButton(
                icon: Icon(
                  isObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, 
                  size: 20.sp, 
                  color: Colors.grey.shade400
                ),
                onPressed: toggleObscure,
              )
            : null,
        ),
      ),
    );
  }
}
