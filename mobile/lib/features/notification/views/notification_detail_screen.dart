import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
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
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Sender Label
                      Text(
                        notification.senderFullName?.toUpperCase() ?? 'HỆ THỐNG',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryOrange,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 10),
                      
                      // Title
                      Text(
                        notification.title,
                        style: GoogleFonts.inter(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF111827), // gray-900
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Timestamp
                      Text(
                        'Ngày gửi: ${notification.timestamp}',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF9CA3AF), // gray-400
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      
                      // Content (Cleaned)
                      Text(
                        notification.cleanDescription,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          height: 1.6, // leading-relaxed
                          color: const Color(0xFF374151), // gray-700
                        ),
                      ),
                      
                      const SizedBox(height: 48),
                      
                      // Attachments Section
                      if (notification.attachmentUrls.isNotEmpty) ...[
                        const Divider(color: Color(0xFFF3F4F6), thickness: 1), // gray-100
                        const SizedBox(height: 24),
                        Text(
                          'TỆP ĐÍNH KÈM',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF9CA3AF), // gray-400
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ...notification.attachmentUrls.map((url) => _buildAttachmentCard(url)),
                      ],
                    ],
                  ),
                ),
              ),
              
              // Bottom Footer
              if (!notification.isRead)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
                  ),
                  child: SafeArea(
                    top: false,
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          // Mark as read explicitly just in case, then back
                          final controller = Get.find<NotificationController>();
                          if (!notification.isRead) {
                            controller.markAsRead(notification.id);
                          }
                          Get.back();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryOrange,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 4,
                          shadowColor: AppColors.primaryOrange.withOpacity(0.4),
                        ),
                        child: Text(
                          'Xác nhận đã đọc',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
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
}
