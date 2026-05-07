import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';
import '../../../../core/constants/app_colors.dart';
import '../models/notification_model.dart';

class NotificationDetailScreen extends StatelessWidget {
  final NotificationModel notification;

  const NotificationDetailScreen({super.key, required this.notification});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark 
              ? Theme.of(context).scaffoldBackgroundColor 
              : null,
          gradient: Theme.of(context).brightness == Brightness.dark 
              ? null 
              : const LinearGradient(
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
              // Custom Header - Matching NotificationList style
              _buildHeader(context),

              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(16.w, 8.h, 16.w, 30.h),
                  child: Column(
                    children: [
                      Container(
                        padding: EdgeInsets.fromLTRB(20.w, 24.h, 20.w, 32.h),
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(24.r),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.05),
                              blurRadius: 20.r,
                              offset: Offset(0, 8.h),
                            ),
                          ],
                          border: Border.all(
                            color: Theme.of(context).brightness == Brightness.dark 
                              ? Colors.white10 
                              : Colors.grey.withOpacity(0.1)
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header Row (Sender & Timestamp)
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryOrange.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(8.r),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.person_outline, size: 14.sp, color: AppColors.primaryOrange),
                                      SizedBox(width: 4.w),
                                      Text(
                                        notification.senderFullName?.toUpperCase() ?? 'HỆ THỐNG',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 10.sp,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primaryOrange,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  _getExactTime(notification.timestamp),
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 11.sp,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF9CA3AF),
                                  ),
                                ),
                              ],
                            ),
                            SizedBox(height: 24.h),
                            
                            // Title
                            Text(
                              notification.title,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 24.sp,
                                fontWeight: FontWeight.w800,
                                color: Theme.of(context).colorScheme.onSurface,
                                height: 1.25,
                                letterSpacing: -0.5,
                              ),
                            ),
                            
                            Padding(
                              padding: EdgeInsets.symmetric(vertical: 24.h),
                              child: Divider(color: Colors.grey.withOpacity(0.1), thickness: 1),
                            ),
                            
                            // Content (HTML) - Removed ConstrainedBox to let it flow
                            Html(
                              data: notification.description,
                              style: {
                                "body": Style(
                                  fontSize: FontSize(15.5.sp),
                                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.85),
                                  lineHeight: LineHeight(1.6),
                                  textAlign: TextAlign.justify,
                                  margin: Margins.zero,
                                  padding: HtmlPaddings.zero,
                                  fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
                                ),
                                "p": Style(
                                  margin: Margins.only(bottom: 16.h),
                                ),
                                "li": Style(
                                  margin: Margins.only(bottom: 8.h),
                                ),
                                "strong": Style(
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.onSurface,
                                ),
                              },
                            ),
                            
                            // Attachments Section
                            if (notification.attachmentUrls.isNotEmpty) ...[
                              SizedBox(height: 32.h),
                              Row(
                                children: [
                                  Icon(Icons.attachment_rounded, size: 18.sp, color: const Color(0xFF9CA3AF)),
                                  SizedBox(width: 8.w),
                                  Text(
                                    'TỆP ĐÍNH KÈM',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 11.sp,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF9CA3AF),
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 16.h),
                              ...notification.attachmentUrls.map((url) => _buildAttachmentCard(context, url)),
                            ],
                          ],
                        ),
                      ),
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

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16.w, 12.h, 16.w, 8.h),
      child: Row(
        children: [
          InkWell(
            onTap: () => Get.back(),
            borderRadius: BorderRadius.circular(12.r),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(SolarIconsOutline.altArrowLeft, color: AppColors.primaryOrange, size: 28.sp),
                SizedBox(width: 4.w),
                Text(
                  'Quay lại',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppColors.primaryOrange,
                    fontWeight: FontWeight.w600,
                    fontSize: 16.sp,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachmentCard(BuildContext context, String url) {
    final fileName = url.split('/').last;
    
    return Container(
      margin: EdgeInsets.only(bottom: 12.h),
      padding: EdgeInsets.all(14.r),
      decoration: BoxDecoration(
        color: Theme.of(context).brightness == Brightness.dark 
          ? Colors.white.withOpacity(0.05) 
          : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(16.r),
        border: Border.all(
          color: Theme.of(context).brightness == Brightness.dark 
            ? Colors.transparent 
            : const Color(0xFFF3F4F6)
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(10.r),
            decoration: BoxDecoration(
              color: AppColors.primaryOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Icon(Icons.file_present_rounded, color: AppColors.primaryOrange, size: 20.sp),
          ),
          SizedBox(width: 14.w),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fileName,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13.sp,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 2.h),
                Text(
                  'Tệp đính kèm',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10.sp,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 12.w),
          InkWell(
            onTap: () => _launchUrl(url),
            borderRadius: BorderRadius.circular(8.r),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
              child: Text(
                'TẢI VỀ',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12.sp,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryOrange,
                ),
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
    final date = notification.parsedTimestamp;
    if (date != null) {
      return DateFormat('HH:mm - dd/MM/yyyy').format(date);
    }
    return timestamp;
  }
}

