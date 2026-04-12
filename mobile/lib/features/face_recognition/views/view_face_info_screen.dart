import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../auth/controllers/auth_controller.dart';
import '../../../core/services/api_service.dart';

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
      backgroundColor: Theme.of(context).brightness == Brightness.dark ? Theme.of(context).scaffoldBackgroundColor : const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          'Thông tin khuôn mặt',
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        backgroundColor: AppColors.primaryOrange,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: Colors.white, size: 20.r),
          onPressed: () => Get.back(),
        ),
      ),
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: AppColors.primaryOrange,
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: GoogleFonts.plusJakartaSans(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _loadFaceData,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
              ),
              child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }

    final hasFaceData = _faceStatus?['hasFaceData'] == true;
    final registeredAt = _faceStatus?['registeredAt'];
    final faceImageBase64 = _faceImage?['faceImage'] as String?;

    return SingleChildScrollView(
      padding: EdgeInsets.all(24.r),
      child: Column(
        children: [
          // Face Image or Icon Container
          _buildFaceImageWidget(faceImageBase64),

          24.verticalSpace,

          // Status Text
          Text(
            hasFaceData ? 'Đã đăng ký khuôn mặt' : 'Chưa đăng ký',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 24.sp,
              fontWeight: FontWeight.bold,
              color: hasFaceData ? Colors.green : Colors.red,
            ),
          ),

          32.verticalSpace,

          // Info Card
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(20.r),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(16.r),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.05),
                  blurRadius: 10.r,
                  offset: Offset(0, 4.h),
                ),
              ],
            ),
            child: Column(
              children: [
                _buildInfoRow(
                  icon: Icons.check_circle,
                  label: 'Trạng thái',
                  value: hasFaceData ? 'Đã xác minh' : 'Chưa xác minh',
                  valueColor: hasFaceData ? Colors.green : Colors.red,
                ),
                Divider(height: 24.h, color: Theme.of(context).dividerColor),
                _buildInfoRow(
                  icon: Icons.calendar_today,
                  label: 'Ngày đăng ký',
                  value: _formatDateTime(registeredAt),
                  valueColor: Theme.of(context).colorScheme.onSurface,
                ),
                Divider(height: 24.h, color: Theme.of(context).dividerColor),
                _buildInfoRow(
                  icon: Icons.security,
                  label: 'Bảo mật',
                  value: 'Dữ liệu được mã hóa',
                  valueColor: Theme.of(context).colorScheme.onSurface,
                ),
              ],
            ),
          ),

          24.verticalSpace,

          // Info Note
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(16.r),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12.r),
              border: Border.all(color: Colors.blue.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue, size: 24.r),
                12.horizontalSpace,
                Expanded(
                  child: Text(
                    'Khuôn mặt của bạn được sử dụng để điểm danh tự động. Dữ liệu được bảo mật và chỉ dùng trong hệ thống FAMS.',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.blue[800],
                      fontSize: 13.sp,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          32.verticalSpace,
        ],
      ),
    );
  }

  Widget _buildFaceImageWidget(String? faceImageData) {
    // 1. Try Base64 or URL from _faceImage response
    if (faceImageData != null && faceImageData.isNotEmpty) {
      if (faceImageData.startsWith('http')) {
        return _buildCircleImage(Image.network(faceImageData, fit: BoxFit.cover));
      }
      try {
        final bytes = base64Decode(faceImageData);
        return _buildCircleImage(Image.memory(bytes, fit: BoxFit.cover));
      } catch (_) {}
    }

    // 2. Try URL from other potential keys in _faceImage
    final altUrl = _faceImage?['url'] ?? _faceImage?['imageUrl'] ?? _faceImage?['faceImageUrl'];
    if (altUrl != null && altUrl is String && altUrl.startsWith('http')) {
      return _buildCircleImage(Image.network(altUrl, fit: BoxFit.cover));
    }

    // 3. Fallback to Profile Avatar if registered
    final userAvatar = authController.currentUser.value?.avatarUrl;
    if (userAvatar != null && userAvatar.isNotEmpty) {
      return _buildCircleImage(Image.network(userAvatar, fit: BoxFit.cover));
    }

    return _buildDefaultFaceIcon();
  }

  Widget _buildCircleImage(Widget imageWidget) {
    return Container(
      width: 150.r,
      height: 150.r,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: Colors.green, width: 3.r),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10.r,
            offset: Offset(0, 4.h),
          ),
        ],
      ),
      child: ClipOval(
        child: imageWidget,
      ),
    );
  }

  Widget _buildDefaultFaceIcon() {
    return Container(
      width: 120.r,
      height: 120.r,
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.green, width: 3.r),
      ),
      child: Icon(
        Icons.face,
        size: 64.r,
        color: Colors.green,
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    required Color valueColor,
  }) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primaryOrange, size: 24.r),
        12.horizontalSpace,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.grey[600],
                  fontSize: 13.sp,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                  color: valueColor,
                  fontSize: 15.sp,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
