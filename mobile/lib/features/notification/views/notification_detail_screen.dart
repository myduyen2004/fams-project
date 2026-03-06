import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_html/flutter_html.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/app_background.dart';
import '../models/notification_model.dart';
import '../controllers/notification_controller.dart';

class NotificationDetailScreen extends StatelessWidget {
  final NotificationModel notification;

  const NotificationDetailScreen({super.key, required this.notification});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Custom Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: Colors.grey[200]!.withOpacity(0.5))),
                ),
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => Get.back(),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.chevron_left, size: 32, color: AppColors.primaryOrange),
                          const SizedBox(width: 8),
                          Text(
                            'Thông báo',
                            style: GoogleFonts.inter(
                              color: const Color(0xFF181411),
                              fontWeight: FontWeight.w600,
                              fontSize: 18,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(color: Colors.grey.withOpacity(0.1)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header Row (Sender & Timestamp)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.primaryOrange.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                notification.senderFullName?.toUpperCase() ?? 'HỆ THỐNG',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primaryOrange,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                _getExactTime(notification.timestamp),
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF9CA3AF),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        
                        // Title
                        Text(
                          notification.title,
                          style: GoogleFonts.inter(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF111827), // gray-900
                            height: 1.3,
                          ),
                        ),
                        
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Divider(color: Color(0xFFF3F4F6), thickness: 1),
                        ),
                        
                        // Content (HTML)
                        Html(
                          data: notification.description,
                          style: {
                            "body": Style(
                              fontSize: FontSize(15.0),
                              color: const Color(0xFF374151),
                              lineHeight: LineHeight(1.6),
                              margin: Margins.zero,
                              padding: HtmlPaddings.zero,
                            ),
                          },
                        ),
                        
                        // Attachments Section
                        if (notification.attachmentUrls.isNotEmpty) ...[
                          const SizedBox(height: 32),
                          const Divider(color: Color(0xFFF3F4F6), thickness: 1),
                          const SizedBox(height: 20),
                          Text(
                            'TỆP ĐÍNH KÈM',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF9CA3AF), // gray-400
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ...notification.attachmentUrls.map((url) => _buildAttachmentCard(url)),
                        ],
                      ],
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

  Widget _buildAttachmentCard(String url) {
    final fileName = url.split('/').last;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB), // gray-50
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3F4F6)), // gray-100
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fileName,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF111827), // gray-900
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'TỆP ĐÍNH KÈM', // Placeholder for size
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF9CA3AF), // gray-400
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          TextButton(
            onPressed: () => _launchUrl(url),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              'TẢI VỀ',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryOrange,
              ),
            ),
          )
        ],
      ),
    );
  }

  Future<void> _launchUrl(String urlString) async {
    final uri = Uri.parse(urlString);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      Get.snackbar(
        'Lỗi',
        'Không thể mở liên kết: $urlString',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  String _getExactTime(String timestamp) {
    try {
      // Assuming timestamp is in 'dd/MM/yyyy HH:mm'
      // Parse it to format correctly.
      final parts = timestamp.split(' ');
      if (parts.length == 2) {
        return '${parts[1]} - ${parts[0]}'; // HH:mm - dd/MM/yyyy
      }
      return timestamp;
    } catch (e) {
      return timestamp;
    }
  }
}

