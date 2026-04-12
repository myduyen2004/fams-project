import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../auth/controllers/auth_controller.dart';
import 'profile_screen.dart'; // For HeaderCurveClipper

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final AuthController _authController = Get.find<AuthController>();
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _phoneController;
  DateTime? _selectedDob;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = _authController.currentUser.value;
    _phoneController = TextEditingController(text: user?.phone ?? '');
    _selectedDob = user?.dob;
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDob ?? DateTime(2000),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFFF26F21),
              onPrimary: Colors.white,
              onSurface: Color(0xFF1E2A3A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedDob = picked;
      });
    }
  }

  void _saveProfile() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      
      final success = await _authController.updateProfile(
        phone: _phoneController.text.trim(),
        dob: _selectedDob,
      );
      
      setState(() => _isLoading = false);
      
      if (success) {
        Get.back();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _authController.currentUser.value;
    final isStudent = user?.isStudent ?? true;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Stack(
        children: [
          // 1. Curved Background
          ClipPath(
            clipper: HeaderCurveClipper(),
            child: Container(
              height: 250.h,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    const Color(0xFFE3F2FD),
                    const Color(0xFFF1F8E9).withOpacity(0.5),
                  ],
                ),
              ),
            ),
          ),

          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // 2. Standardized Header
              SliverPadding(
                padding: EdgeInsets.fromLTRB(20.w, 60.h, 20.w, 15.h),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => Get.back(),
                        child: Container(
                          padding: EdgeInsets.all(8.r),
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: Icon(SolarIconsOutline.altArrowLeft, color: const Color(0xFF1E2A3A), size: 24.sp),
                        ),
                      ),
                      SizedBox(width: 16.w),
                      Text(
                        'Chỉnh sửa thông tin',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 22.sp,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF1E2A3A),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 3. Centered Name & Role (Matching View Screen)
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    SizedBox(height: 10.h),
                    Text(
                      user?.fullName ?? "N/A",
                      style: GoogleFonts.plusJakartaSans(fontSize: 22.sp, fontWeight: FontWeight.w800, color: const Color(0xFF1E2A3A)),
                    ),
                    Text(
                      isStudent ? "Sinh viên" : "Giảng viên",
                      style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, fontWeight: FontWeight.w600, color: Colors.grey.shade400),
                    ),
                  ],
                ),
              ),

              // 4. Edit Form
              SliverPadding(
                padding: EdgeInsets.fromLTRB(20.w, 30.h, 20.w, 20.h),
                sliver: SliverToBoxAdapter(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionTitle("THÔNG TIN THAY ĐỔI"),
                        SizedBox(height: 12.h),
                        
                        _buildGroupedCard([
                          _buildEditableItem(
                            icon: SolarIconsOutline.phone,
                            label: "Số điện thoại",
                            child: TextFormField(
                              controller: _phoneController,
                              style: GoogleFonts.plusJakartaSans(fontSize: 15.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E2A3A)),
                              decoration: const InputDecoration(
                                isDense: true,
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                              ),
                              keyboardType: TextInputType.phone,
                            ),
                          ),
                          _buildEditableItem(
                            icon: SolarIconsOutline.calendar,
                            label: "Ngày sinh",
                            onTap: () => _selectDate(context),
                            child: Text(
                              _selectedDob != null ? DateFormat('dd/MM/yyyy').format(_selectedDob!) : 'Chưa chọn',
                              style: GoogleFonts.plusJakartaSans(fontSize: 15.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E2A3A)),
                            ),
                          ),
                        ]),

                        SizedBox(height: 40.h),

                        // Save Button
                        Center(
                          child: SizedBox(
                            width: 160.w,
                            height: 48.h,
                            child: OutlinedButton(
                              onPressed: _isLoading ? null : _saveProfile,
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFFF26F21), width: 1.5),
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFFF26F21),
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100.r)),
                              ),
                              child: _isLoading
                                  ? const CircularProgressIndicator(color: Color(0xFFF26F21), strokeWidth: 2)
                                  : Text(
                                      'Lưu thay đổi',
                                      style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, fontWeight: FontWeight.w800),
                                    ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 12.sp,
        fontWeight: FontWeight.w800,
        color: const Color(0xFF1E2A3A).withOpacity(0.4),
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildGroupedCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildEditableItem({required IconData icon, required String label, required Widget child, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24.r),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(8.r),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12.r)),
              child: Icon(icon, color: const Color(0xFFF26F21), size: 20.sp),
            ),
            SizedBox(width: 16.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                  SizedBox(height: 4.h),
                  child,
                ],
              ),
            ),
            if (onTap != null)
              Icon(SolarIconsOutline.altArrowRight, size: 14.sp, color: Colors.grey.shade300),
          ],
        ),
      ),
    );
  }
}
