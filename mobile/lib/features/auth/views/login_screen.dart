import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';
import 'dart:math' as math;
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_routes.dart';
import '../../../core/utils/validators.dart';
import '../controllers/auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final AuthController _authController = Get.find<AuthController>();
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usernameFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  bool _obscurePassword = true;
  bool _isUsernameFocused = false;
  bool _isPasswordFocused = false;

  late AnimationController _animController;
  late Animation<double> _cardFadeIn;
  late Animation<Offset> _cardSlideIn;

  @override
  void initState() {
    super.initState();
    _usernameFocusNode.addListener(_onFocusChange);
    _passwordFocusNode.addListener(_onFocusChange);

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _cardFadeIn = CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic);
    _cardSlideIn = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));

    _animController.forward();
  }

  void _onFocusChange() {
    setState(() {
      _isUsernameFocused = _usernameFocusNode.hasFocus;
      _isPasswordFocused = _passwordFocusNode.hasFocus;
    });

    if (_usernameFocusNode.hasFocus || _passwordFocusNode.hasFocus) {
      Future.delayed(const Duration(milliseconds: 350), () {
        if (!mounted) return;
        
        final focusedContext = _usernameFocusNode.hasFocus 
            ? _usernameFocusNode.context 
            : _passwordFocusNode.context;
            
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
    _usernameController.dispose();
    _passwordController.dispose();
    _usernameFocusNode.dispose();
    _passwordFocusNode.dispose();
    _animController.dispose();
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
              // Header Section (Pattern Background + Logo)
              Stack(
                children: [
                   // Geometric/Network Pattern Background (Height Expanded)
                  Container(
                    height: 320.h,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          orangeSecondary.withOpacity(0.35),
                          orangePrimary.withOpacity(0.02),
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
                  
                  // Logo at Top Left
                  Positioned(
                    top: 65.h,
                    left: 25.w,
                    child: Hero(
                      tag: 'logo',
                      child: Image.asset(
                        'assets/images/logo.png',
                        height: 42.h,
                        errorBuilder: (context, error, stackTrace) => 
                          _buildFamsTextLogo(),
                      ),
                    ),
                  ),
                ],
              ),

              // Login Content — Polished Card with entrance animation
              SlideTransition(
                position: _cardSlideIn,
                child: FadeTransition(
                  opacity: _cardFadeIn,
                  child: Transform.translate(
                    offset: Offset(0, -80.h),
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      child: Column(
                        children: [
                          // ──── Login Card (polished) ────
                          Container(
                            width: double.infinity,
                            padding: EdgeInsets.symmetric(horizontal: 30.w, vertical: 35.w),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(28.r),
                              border: Border.all(
                                color: orangePrimary.withOpacity(0.06),
                                width: 1.2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: orangePrimary.withOpacity(0.08),
                                  blurRadius: 40,
                                  spreadRadius: 0,
                                  offset: const Offset(0, 18),
                                ),
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.04),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // ── Title with accent bar ──
                                  Row(
                                    children: [
                                      Container(
                                        width: 4.w,
                                        height: 30.h,
                                        decoration: BoxDecoration(
                                          gradient: const LinearGradient(
                                            begin: Alignment.topCenter,
                                            end: Alignment.bottomCenter,
                                            colors: [orangePrimary, orangeSecondary],
                                          ),
                                          borderRadius: BorderRadius.circular(2.r),
                                        ),
                                      ),
                                      SizedBox(width: 12.w),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            "Đăng nhập",
                                            style: TextStyle(
                                              fontSize: 26.sp,
                                              fontWeight: FontWeight.w700,
                                              color: const Color(0xFF1E2A3A),
                                              letterSpacing: -0.3,
                                            ),
                                          ),
                                          SizedBox(height: 2.h),
                                          Text(
                                            "Chào mừng bạn trở lại!",
                                            style: TextStyle(
                                              fontSize: 13.sp,
                                              fontWeight: FontWeight.w400,
                                              color: Colors.grey.shade500,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 32.h),
                                  
                                  // ── Label: Tên đăng nhập ──
                                  Padding(
                                    padding: EdgeInsets.only(left: 8.w, bottom: 8.h),
                                    child: Text(
                                      "Tên đăng nhập",
                                      style: TextStyle(
                                        fontSize: 13.sp,
                                        fontWeight: FontWeight.w600,
                                        color: _isUsernameFocused 
                                            ? orangePrimary 
                                            : const Color(0xFF4A5568),
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                  ),
                                  _buildPillTextField(
                                    controller: _usernameController,
                                    hintText: "Nhập mã số sinh viên",
                                    focusNode: _usernameFocusNode,
                                    isFocused: _isUsernameFocused,
                                    prefixIcon: SolarIconsOutline.user,
                                    validator: Validators.username,
                                  ),
                                  
                                  SizedBox(height: 20.h),
                                  
                                  // ── Label: Mật khẩu ──
                                  Padding(
                                    padding: EdgeInsets.only(left: 8.w, bottom: 8.h),
                                    child: Text(
                                      "Mật khẩu",
                                      style: TextStyle(
                                        fontSize: 13.sp,
                                        fontWeight: FontWeight.w600,
                                        color: _isPasswordFocused 
                                            ? orangePrimary 
                                            : const Color(0xFF4A5568),
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                  ),
                                  _buildPillTextField(
                                    controller: _passwordController,
                                    hintText: "Nhập mật khẩu",
                                    focusNode: _passwordFocusNode,
                                    isFocused: _isPasswordFocused,
                                    prefixIcon: SolarIconsOutline.lock,
                                    isPassword: true,
                                    validator: Validators.password,
                                  ),
                                  
                                  SizedBox(height: 20.h),
                                  
                                  // Forgot Password (Aligned Right, Orange)
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      onPressed: () => Get.toNamed(AppRoutes.forgotPassword),
                                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                      child: Text(
                                        "Quên mật khẩu?",
                                        style: TextStyle(
                                          fontSize: 13.5.sp,
                                          fontWeight: FontWeight.w600,
                                          color: orangePrimary,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          
                          SizedBox(height: 32.h),

                          // ──── Login Button (polished) ────
                          Padding(
                            padding: EdgeInsets.symmetric(horizontal: 5.w),
                            child: Align(
                              alignment: Alignment.centerRight,
                              child: Obx(() => Container(
                                width: 155.w,
                                height: 54.h,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(22.r),
                                  gradient: const LinearGradient(
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                    colors: [
                                      Color(0xFFF77D31),
                                      orangePrimary,
                                      Color(0xFFE85D36),
                                    ],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: orangePrimary.withOpacity(0.40),
                                      blurRadius: 20,
                                      spreadRadius: 0,
                                      offset: const Offset(0, 10),
                                    ),
                                    BoxShadow(
                                      color: orangeSecondary.withOpacity(0.20),
                                      blurRadius: 40,
                                      spreadRadius: -5,
                                      offset: const Offset(0, 20),
                                    ),
                                  ],
                                ),
                                child: ElevatedButton(
                                  onPressed: _authController.isLoading.value ? null : _handleLogin,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22.r)),
                                    padding: EdgeInsets.zero,
                                  ),
                                  child: _authController.isLoading.value
                                      ? const SizedBox(
                                          height: 22, 
                                          width: 22, 
                                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
                                        )
                                      : Center(
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                "ĐĂNG NHẬP",
                                                style: TextStyle(
                                                  fontSize: 14.5.sp, 
                                                  fontWeight: FontWeight.w700, 
                                                  color: Colors.white,
                                                  letterSpacing: 1.2,
                                                ),
                                              ),
                                              SizedBox(width: 6.w),
                                              Icon(SolarIconsOutline.altArrowRight, color: Colors.white, size: 18.sp),
                                            ],
                                          ),
                                        ),
                                ),
                              )),
                            ),
                          ),
                          SizedBox(height: 60.h),
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
    );
  }

  // ──── Polished Pill Text Field ────
  Widget _buildPillTextField({
    required TextEditingController controller,
    required String hintText,
    FocusNode? focusNode,
    bool isFocused = false,
    IconData? prefixIcon,
    bool isPassword = false,
    String? Function(String?)? validator,
  }) {
    const Color orangePrimary = Color(0xFFF26F21);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: isFocused ? Colors.white : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(
          color: isFocused 
              ? orangePrimary.withOpacity(0.5) 
              : const Color(0xFFE2E8F0),
          width: isFocused ? 1.8 : 1.2,
        ),
        boxShadow: isFocused
            ? [
                BoxShadow(
                  color: orangePrimary.withOpacity(0.12),
                  blurRadius: 20,
                  spreadRadius: 0,
                  offset: const Offset(0, 6),
                ),
                BoxShadow(
                  color: orangePrimary.withOpacity(0.06),
                  blurRadius: 8,
                  spreadRadius: -2,
                  offset: const Offset(0, 2),
                ),
              ]
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  spreadRadius: 0,
                  offset: const Offset(0, 3),
                ),
              ],
      ),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        obscureText: isPassword && _obscurePassword,
        validator: validator,
        style: TextStyle(
          fontSize: 15.5.sp, 
          color: const Color(0xFF1E2A3A), 
          fontWeight: FontWeight.w600,
          letterSpacing: 0.1,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(
            color: const Color(0xFFADB5BD), 
            fontSize: 14.sp, 
            fontWeight: FontWeight.w400,
          ),
          contentPadding: EdgeInsets.symmetric(horizontal: 18.w, vertical: 16.h),
          border: InputBorder.none,
          prefixIcon: prefixIcon != null
              ? Padding(
                  padding: EdgeInsets.only(left: 16.w, right: 8.w),
                  child: Icon(
                    prefixIcon,
                    color: isFocused ? orangePrimary : const Color(0xFF9CA3AF),
                    size: 22.sp,
                  ),
                )
              : null,
          prefixIconConstraints: BoxConstraints(minWidth: 48.w),
          suffixIcon: isPassword 
            ? Padding(
                padding: EdgeInsets.only(right: 8.w),
                child: IconButton(
                  icon: Icon(
                    _obscurePassword ? SolarIconsOutline.eyeClosed : SolarIconsOutline.eye,
                    color: isFocused ? orangePrimary.withOpacity(0.7) : const Color(0xFFADB5BD),
                    size: 20.sp,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              )
            : null,
        ),
      ),
    );
  }

  // Fallback FAMS Text Logo
  Widget _buildFamsTextLogo() {
    return Row(
      children: [
        _logoSquare("F", const Color(0xFF1E4D92)),
        SizedBox(width: 4.w),
        _logoSquare("A", const Color(0xFFF26F21)),
        SizedBox(width: 4.w),
        _logoSquare("M", const Color(0xFF5AB66F)),
        SizedBox(width: 4.w),
        _logoSquare("S", const Color(0xFF336DB5)),
      ],
    );
  }

  Widget _logoSquare(String text, Color color) {
    return Container(
      width: 32.w,
      height: 32.w,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6.r),
      ),
      alignment: Alignment.center,
      child: Text(
        text,
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18.sp),
      ),
    );
  }
}

// Custom Painter for the Refined Crystal-Network pattern in the header
class _NetworkPatternPainter extends CustomPainter {
  final Color color;
  final List<Color> accentColors;
  _NetworkPatternPainter({required this.color, required this.accentColors});

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = Colors.black.withOpacity(0.06) // Slightly darker lines for better visibility
      ..strokeWidth = 0.4
      ..style = PaintingStyle.stroke;

    // More prominent desaturated tints as requested
    final List<_Crystal> crystals = [
      _Crystal(Offset(size.width * 0.72, size.height * 0.18), 38, accentColors[0].withOpacity(0.3), 5), // Blue Tint
      _Crystal(Offset(size.width * 0.9, size.height * 0.42), 48, accentColors[1].withOpacity(0.25), 6),  // Green Tint
      _Crystal(Offset(size.width * 0.52, size.height * 0.38), 28, color.withOpacity(0.35), 5),          // Peach Tint
      _Crystal(Offset(size.width * 0.82, size.height * 0.68), 32, color.withOpacity(0.25), 4),
      _Crystal(Offset(size.width * 0.42, size.height * 0.22), 22, accentColors[0].withOpacity(0.2), 5),
      _Crystal(Offset(size.width * 0.96, size.height * 0.12), 18, accentColors[1].withOpacity(0.15), 4),
      _Crystal(Offset(size.width * 0.28, size.height * 0.52), 42, accentColors[1].withOpacity(0.3), 5),
      _Crystal(Offset(size.width * 0.68, size.height * 0.78), 24, color.withOpacity(0.2), 4),
    ];

    // 1. Draw Network Connection Lines
    for (int i = 0; i < crystals.length; i++) {
      for (int j = i + 1; j < crystals.length; j++) {
        double dist = (crystals[i].center - crystals[j].center).distance;
        if (dist < 230) {
          canvas.drawLine(crystals[i].center, crystals[j].center, linePaint);
        }
      }
    }

    // 2. Draw Sharp Faceted Crystal Shapes
    for (var crystal in crystals) {
      _drawFacetedCrystal(canvas, crystal);
    }
  }

  void _drawFacetedCrystal(Canvas canvas, _Crystal crystal) {
    final Path path = Path();
    final int sides = crystal.sides;
    final double radius = crystal.size;
    final double angleStep = (2 * math.pi) / sides;
    
    // Sharp Polygon path
    for (int i = 0; i < sides; i++) {
      double angle = i * angleStep;
      double x = crystal.center.dx + radius * math.cos(angle);
      double y = crystal.center.dy + radius * math.sin(angle);
      if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.close();

    // Fill with more visible gradient tint
    final Paint fillPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Colors.white.withOpacity(0.25), 
          crystal.color.withOpacity(0.15)
        ],
      ).createShader(Rect.fromCircle(center: crystal.center, radius: radius));
    
    canvas.drawPath(path, fillPaint);

    // Sharp edges
    final Paint edgePaint = Paint()
      ..color = Colors.white.withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;
    
    canvas.drawPath(path, edgePaint);

    // Interior Facet lines
    final Paint facetLinePaint = Paint()
      ..color = Colors.white.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.4;

    for (int i = 0; i < sides; i++) {
      double angle = i * angleStep;
      canvas.drawLine(
        crystal.center,
        Offset(
          crystal.center.dx + radius * math.cos(angle),
          crystal.center.dy + radius * math.sin(angle)
        ),
        facetLinePaint
      );
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}

// Helper class for refined pattern elements
class _Crystal {
  final Offset center;
  final double size;
  final Color color;
  final int sides;
  _Crystal(this.center, this.size, this.color, this.sides);
}
