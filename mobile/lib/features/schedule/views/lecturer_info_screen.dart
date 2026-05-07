import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../lecturer/services/lecturer_service.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/widgets/app_background.dart';

class LecturerInfoScreen extends StatefulWidget {
  final int lecturerId;

  const LecturerInfoScreen({super.key, required this.lecturerId});

  @override
  State<LecturerInfoScreen> createState() => _LecturerInfoScreenState();
}

class _LecturerInfoScreenState extends State<LecturerInfoScreen> {
  final _lecturerService = LecturerService();
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _lecturerProfile;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      final profile = await _lecturerService.getLecturerProfile(widget.lecturerId);
      setState(() {
        _lecturerProfile = profile;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(context),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(child: Text('Lỗi: $_error', style: const TextStyle(color: Colors.red)))
                        : _buildProfileContent(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: () => Get.back(),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFFFF6B00)),
          ),
          Text(
            'Thông tin giảng viên',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF2D3436),
            ),
          ),
          const IconButton(
            onPressed: null,
            icon: Icon(Icons.more_horiz_rounded, color: Colors.transparent),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileContent() {
    final profile = _lecturerProfile!;
    final avatar = profile['avatar'] as String?;
    final fullName = profile['fullName'] ?? 'N/A';
    final code = profile['code'] ?? 'N/A';
    final email = profile['email'] ?? 'N/A';
    final roleName = profile['roleName'] ?? 'Giảng viên';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(32.r),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 20.r,
              offset: Offset(0, 4.h),
            ),
          ],
        ),
        child: Column(
          children: [
            CircleAvatar(
              radius: 50.r,
              backgroundColor: const Color(0xFFFFF4E6),
              backgroundImage: avatar != null && avatar.isNotEmpty
                  ? CachedNetworkImageProvider(avatar)
                  : null,
              child: avatar == null || avatar.isEmpty
                  ? Text(
                      fullName.isNotEmpty ? fullName[0].toUpperCase() : 'L',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 40.sp,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFFFF922B),
                      ),
                    )
                  : null,
            ),
            20.verticalSpace,
            Text(
              fullName,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 24.sp,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
            ),
            8.verticalSpace,
            Container(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(20.r),
              ),
              child: Text(
                roleName,
                style: GoogleFonts.plusJakartaSans(
                  color: const Color(0xFF27AE60),
                  fontWeight: FontWeight.bold,
                  fontSize: 12.sp,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            32.verticalSpace,
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            24.verticalSpace,
            _buildInfoRow(Icons.email_rounded, 'Email', email),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: EdgeInsets.all(12.r),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(16.r),
          ),
          child: Icon(icon, color: const Color(0xFF64748B), size: 24.r),
        ),
        16.horizontalSpace,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12.sp,
                  color: const Color(0xFF94A3B8),
                  fontWeight: FontWeight.bold,
                ),
              ),
              4.verticalSpace,
              Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF334155),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
