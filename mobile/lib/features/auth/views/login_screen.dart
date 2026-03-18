import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
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

class _LoginScreenState extends State<LoginScreen> {
  final AuthController _authController = Get.find<AuthController>();
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usernameFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Add listeners to ensure the field is visible when focused
    _usernameFocusNode.addListener(_onFocusChange);
    _passwordFocusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    if (_usernameFocusNode.hasFocus || _passwordFocusNode.hasFocus) {
      // Delay to wait for keyboard animation to start
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
            alignment: 0.2, // Show the field slightly above the center
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
                    height: 380.h,
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
                  
                  // Logo at Top Left - Based on the "F A M S" image
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

              // Login Content - Using Transform for overlap (Padding doesn't support negative values)
              Transform.translate(
                offset: Offset(0, -60.h),
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20.w),
                  child: Column(
                    children: [
                      // Login Card
                      Container(
                        width: double.infinity,
                        padding: EdgeInsets.all(35.w),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30.r),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 30,
                              offset: const Offset(0, 15),
                            )
                          ],
                        ),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Đăng nhập",
                                style: TextStyle(
                                  fontSize: 26.sp,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF2D3142),
                                ),
                              ),
                              SizedBox(height: 35.h),
                              
                              // Field: Tên đăng nhập (Light Pill Style)
                              _buildPillTextField(
                                controller: _usernameController,
                                hintText: "Tên đăng nhập",
                                focusNode: _usernameFocusNode,
                                validator: Validators.username,
                              ),
                              
                              SizedBox(height: 18.h),
                              
                              // Field: Mật khẩu (Light Pill Style)
                              _buildPillTextField(
                                controller: _passwordController,
                                hintText: "Mật khẩu",
                                focusNode: _passwordFocusNode,
                                isPassword: true,
                                validator: Validators.password,
                              ),
                              
                              SizedBox(height: 25.h),
                              
                              // Forgot Password (Aligned Right, Orange)
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton(
                                  onPressed: () => Get.toNamed(AppRoutes.forgotPassword),
                                  style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                  child: Text(
                                    "Quên mật khẩu?",
                                    style: TextStyle(
                                      fontSize: 14.sp,
                                      fontWeight: FontWeight.w500,
                                      color: orangePrimary,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      SizedBox(height: 35.h),

                      // Bottom Action Area - Login Button Aligned Right
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 5.w),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: Obx(() => Container(
                            width: 140.w,
                            height: 52.h,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20.r),
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [orangePrimary, Color(0xFFE85D36)],
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
                              onPressed: _authController.isLoading.value ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.r)),
                                padding: EdgeInsets.zero,
                              ),
                              child: _authController.isLoading.value
                                  ? const SizedBox(
                                      height: 22, 
                                      width: 22, 
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                                    )
                                  : Center(
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Padding(
                                          padding: EdgeInsets.symmetric(horizontal: 15.w),
                                          child: Text(
                                            "ĐĂNG NHẬP",
                                            style: TextStyle(
                                              fontSize: 15.sp, 
                                              fontWeight: FontWeight.bold, 
                                              color: Colors.white,
                                              letterSpacing: 1.0,
                                            ),
                                          ),
                                        ),
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
            ],
          ),
        ),
      ),
    );
  }

  // Build the geometric/network pattern background
  Widget _buildPillTextField({
    required TextEditingController controller,
    required String hintText,
    FocusNode? focusNode,
    bool isPassword = false,
    String? Function(String?)? validator,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white, // Pure white for better shadow visibility
        borderRadius: BorderRadius.circular(25.r),
        border: Border.all(
          color: Colors.grey.withOpacity(0.12), // Subtle clear border
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.07), // More prominent shadow
            blurRadius: 16,
            spreadRadius: 0,
            offset: const Offset(0, 5),
          )
        ],
      ),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        obscureText: isPassword && _obscurePassword,
        validator: validator,
        style: TextStyle(fontSize: 16.sp, color: Colors.black54, fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14.sp, fontWeight: FontWeight.w500),
          contentPadding: EdgeInsets.symmetric(horizontal: 25.w, vertical: 15.h),
          border: InputBorder.none,
          suffixIcon: isPassword 
            ? IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: Colors.grey.shade400,
                  size: 20.sp,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
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
