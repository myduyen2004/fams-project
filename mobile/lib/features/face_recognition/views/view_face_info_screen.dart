import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
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
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: Text(
          'Thông tin khuôn mặt',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        backgroundColor: AppColors.primaryOrange,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
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
              style: GoogleFonts.inter(color: Colors.red, fontSize: 16),
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
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Face Image or Icon Container
          _buildFaceImageWidget(faceImageBase64),

          const SizedBox(height: 24),

          // Status Text
          Text(
            hasFaceData ? 'Đã đăng ký khuôn mặt' : 'Chưa đăng ký',
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: hasFaceData ? Colors.green : Colors.red,
            ),
          ),

          const SizedBox(height: 32),

          // Info Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
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
                const Divider(height: 24),
                _buildInfoRow(
                  icon: Icons.calendar_today,
                  label: 'Ngày đăng ký',
                  value: _formatDateTime(registeredAt),
                  valueColor: Colors.black87,
                ),
                const Divider(height: 24),
                _buildInfoRow(
                  icon: Icons.security,
                  label: 'Bảo mật',
                  value: 'Dữ liệu được mã hóa',
                  valueColor: Colors.black87,
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Info Note
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.blue, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Khuôn mặt của bạn được sử dụng để điểm danh tự động. Dữ liệu được bảo mật và chỉ dùng trong hệ thống FAMS.',
                    style: GoogleFonts.inter(
                      color: Colors.blue[800],
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 32),

          // Back Button
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: () => Get.back(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryOrange,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
              child: Text(
                'Quay lại',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFaceImageWidget(String? faceImageBase64) {
    if (faceImageBase64 != null && faceImageBase64.isNotEmpty) {
      // Decode base64 and display image
      try {
        final bytes = base64Decode(faceImageBase64);
        return Container(
          width: 150,
          height: 150,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.green, width: 3),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipOval(
            child: Image.memory(
              bytes,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return _buildDefaultFaceIcon();
              },
            ),
          ),
        );
      } catch (e) {
        return _buildDefaultFaceIcon();
      }
    } else {
      return _buildDefaultFaceIcon();
    }
  }

  Widget _buildDefaultFaceIcon() {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.green, width: 3),
      ),
      child: const Icon(
        Icons.face,
        size: 64,
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
        Icon(icon, color: AppColors.primaryOrange, size: 24),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  color: Colors.grey[600],
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: GoogleFonts.inter(
                  color: valueColor,
                  fontSize: 15,
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
