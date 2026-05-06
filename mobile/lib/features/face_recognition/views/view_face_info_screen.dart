import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../../core/constants/app_colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/services/api_service.dart';
import '../../profile/views/profile_screen.dart'; // For HeaderCurveClipper
import 'face_registration_guide_screen.dart';

/// Screen to view registered face information
class ViewFaceInfoScreen extends StatefulWidget {
  const ViewFaceInfoScreen({super.key});

  @override
  State<ViewFaceInfoScreen> createState() => _ViewFaceInfoScreenState();
}

class _ViewFaceInfoScreenState extends State<ViewFaceInfoScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _faceStatus;
  Map<String, dynamic>? _faceImage;
  String? _error;
  final authController = Get.find<AuthController>();

  @override
  void initState() {
    super.initState();
    _loadFaceData();
  }

  Future<void> _loadFaceData() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Load face status
      final statusResponse = await _apiService.get('/api/face-attendance/status');
      if (statusResponse.statusCode == 200) {
        _faceStatus = statusResponse.data;
      }

      // Load face image - handle 404 (not registered)
      try {
        final imageResponse = await _apiService.get('/api/face-attendance/face-image');
        if (imageResponse.statusCode == 200) {
          _faceImage = imageResponse.data;
        }
      } catch (imageError) {
        // 404 means no face image registered yet - this is OK
        debugPrint('Face image not available: $imageError');
        _faceImage = null;
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Lỗi kết nối: $e';
        _isLoading = false;
      });
    }
  }

  String _formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return 'Không xác định';
    try {
      final dateTime = DateTime.parse(dateTimeStr);
      return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} lúc ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTimeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
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
                        'Thông tin khuôn mặt',
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

              // 3. Body content
              SliverToBoxAdapter(
                child: _buildBodyContent(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBodyContent() {
    if (_isLoading) {
      return Container(
        height: 300.h,
        alignment: Alignment.center,
        child: const CircularProgressIndicator(
          color: Color(0xFFF26F21),
        ),
      );
    }

    if (_error != null) {
      return Container(
        height: 300.h,
        alignment: Alignment.center,
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(SolarIconsOutline.dangerTriangle, size: 64, color: Colors.redAccent),
              const SizedBox(height: 16),
              Text(
                _error!,
                style: GoogleFonts.plusJakartaSans(color: Colors.redAccent, fontSize: 16.sp),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: _loadFaceData,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFF26F21), width: 1.5),
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFFF26F21),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100.r)),
                ),
                child: Text(
                  'Thử lại',
                  style: GoogleFonts.plusJakartaSans(fontSize: 14.sp, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final hasFaceData = _faceStatus?['hasFaceData'] == true;
    final registeredAt = _faceStatus?['registeredAt'];
    final faceImageBase64 = _faceImage?['faceImage'] as String?;

    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 20.w),
      child: Column(
        children: [
          SizedBox(height: 20.h),
          
          // Face Image
          Center(
            child: _buildFaceImageWidget(faceImageBase64, hasFaceData),
          ),
          
          SizedBox(height: 16.h),
          
          // Status Text
          Text(
            hasFaceData ? 'Đã đăng ký' : 'Chưa đăng ký',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 22.sp,
              fontWeight: FontWeight.w800,
              color: hasFaceData ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            ),
          ),

          SizedBox(height: 30.h),

          // Info Cards
          Align(
            alignment: Alignment.centerLeft,
            child: _buildSectionTitle("TRẠNG THÁI XÁC MINH"),
          ),
          SizedBox(height: 12.h),

          _buildGroupedCard([
            _buildInfoItem(
              icon: SolarIconsOutline.verifiedCheck,
              iconColor: const Color(0xFF64748B),
              iconBgColor: const Color(0xFFF8FAFC),
              label: 'Trạng thái',
              value: hasFaceData ? 'Đã xác minh' : 'Chưa xác minh',
              valueColor: hasFaceData ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              isLast: false,
            ),
            _buildInfoItem(
              icon: SolarIconsOutline.calendar,
              iconColor: const Color(0xFF64748B),
              iconBgColor: const Color(0xFFF8FAFC),
              label: 'Ngày đăng ký',
              value: _formatDateTime(registeredAt),
              valueColor: const Color(0xFF1E2A3A),
              isLast: false,
            ),
            _buildInfoItem(
              icon: SolarIconsOutline.shieldCheck,
              iconColor: const Color(0xFF64748B),
              iconBgColor: const Color(0xFFF8FAFC),
              label: 'Bảo mật',
              value: 'Dữ liệu được mã hóa',
              valueColor: const Color(0xFF1E2A3A),
              isLast: true,
            ),
          ]),

          SizedBox(height: 24.h),

          // Info Note
          Container(
            padding: EdgeInsets.all(16.r),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(20.r),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(SolarIconsOutline.infoCircle, color: const Color(0xFF64748B), size: 24.sp),
                SizedBox(width: 12.w),
                Expanded(
                  child: Text(
                    'Khuôn mặt của bạn được sử dụng để điểm danh tự động. Dữ liệu được bảo mật và chỉ dùng trong hệ thống FAMS.',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF475569),
                      fontSize: 13.sp,
                      fontWeight: FontWeight.w500,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Register button when face not registered
          if (!hasFaceData) ...[
            SizedBox(height: 24.h),
            SizedBox(
              width: double.infinity,
              height: 52.h,
              child: ElevatedButton.icon(
                onPressed: () {
                  Get.off(() => const FaceRegistrationGuideScreen());
                },
                icon: Icon(SolarIconsOutline.faceScanSquare, size: 22.sp),
                label: Text(
                  'Đăng ký khuôn mặt',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16.sp,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF26F21),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16.r),
                  ),
                ),
              ),
            ),
          ],

          SizedBox(height: 40.h),
        ],
      ),
    );
  }

  Widget _buildFaceImageWidget(String? faceImageData, bool hasFaceData) {
    // 1. Try Base64 or URL from _faceImage response
    if (faceImageData != null && faceImageData.isNotEmpty) {
      if (faceImageData.startsWith('http')) {
        return _buildCircleImage(Image.network(faceImageData, fit: BoxFit.cover), hasFaceData);
      }
      try {
        final bytes = base64Decode(faceImageData);
        return _buildCircleImage(Image.memory(bytes, fit: BoxFit.cover), hasFaceData);
      } catch (_) {}
    }

    // 2. Try URL from other potential keys in _faceImage
    final altUrl = _faceImage?['url'] ?? _faceImage?['imageUrl'] ?? _faceImage?['faceImageUrl'];
    if (altUrl != null && altUrl is String && altUrl.startsWith('http')) {
      return _buildCircleImage(Image.network(altUrl, fit: BoxFit.cover), hasFaceData);
    }

    // 3. Fallback to Profile Avatar if registered
    final userAvatar = authController.currentUser.value?.avatarUrl;
    if (userAvatar != null && userAvatar.isNotEmpty) {
      return _buildCircleImage(Image.network(userAvatar, fit: BoxFit.cover), hasFaceData);
    }

    return _buildDefaultFaceIcon(hasFaceData);
  }

  Widget _buildCircleImage(Widget imageWidget, bool hasFaceData) {
    return Container(
      width: 140.r,
      height: 140.r,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(
          color: hasFaceData ? const Color(0xFF10B981) : const Color(0xFFE2E8F0), 
          width: 4.r
        ),
        boxShadow: [
          BoxShadow(
            color: (hasFaceData ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFF94A3B8).withOpacity(0.08)),
            blurRadius: 20,
            spreadRadius: 5,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.all(4.r),
        child: ClipOval(
          child: imageWidget,
        ),
      ),
    );
  }

  Widget _buildDefaultFaceIcon(bool hasFaceData) {
    return Container(
      width: 140.r,
      height: 140.r,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(
          color: hasFaceData ? const Color(0xFF10B981) : const Color(0xFFE2E8F0), 
          width: 4.r
        ),
        boxShadow: [
          BoxShadow(
            color: (hasFaceData ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFF94A3B8).withOpacity(0.08)),
            blurRadius: 20,
            spreadRadius: 5,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Center(
        child: Icon(
          SolarIconsOutline.faceScanSquare,
          size: 64.r,
          color: hasFaceData ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
        ),
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

  Widget _buildInfoItem({
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String label,
    required String value,
    required Color valueColor,
    required bool isLast,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 16.h),
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(10.r),
            decoration: BoxDecoration(color: iconBgColor, borderRadius: BorderRadius.circular(12.r)),
            child: Icon(icon, color: iconColor, size: 20.sp),
          ),
          SizedBox(width: 16.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12.sp, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                SizedBox(height: 4.h),
                Text(
                  value,
                  style: GoogleFonts.plusJakartaSans(fontSize: 15.sp, fontWeight: FontWeight.w700, color: valueColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
