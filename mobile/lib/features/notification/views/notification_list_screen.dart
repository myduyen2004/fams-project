import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/app_background.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../controllers/notification_controller.dart';
import '../models/notification_model.dart';
import 'notification_detail_screen.dart';
import 'package:solar_icons/solar_icons.dart';

class NotificationListScreen extends StatelessWidget {
  const NotificationListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(NotificationController());

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Header
              _buildHeader(context, controller),
              
              // Content
              Expanded(
                child: Obx(() {
                  if (controller.isLoading.value && controller.notifications.isEmpty) {
                    return const Center(child: CircularProgressIndicator(color: AppColors.primaryOrange));
                  }

                  if (controller.notifications.isEmpty) {
                    return _buildEmptyState();
                  }

                  return RefreshIndicator(
                    onRefresh: controller.fetchNotifications,
                    color: AppColors.primaryOrange,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: EdgeInsets.only(bottom: 100.h), // Space for FAB
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildNotificationSection(
                            title: 'Hôm nay',
                            notifications: _getTodayNotifications(controller.notifications),
                            showMarkRead: _getTodayNotifications(controller.notifications).any((n) => !n.isRead),
                            onMarkRead: controller.markAllAsRead,
                          ),
                          
                          SizedBox(height: 16.h),
                          
                          _buildNotificationSection(
                            title: 'Trước đó',
                            notifications: _getEarlierNotifications(controller.notifications),
                            showMarkRead: false,
                          ),
                          
                          // End of list
                          Padding(
                            padding: EdgeInsets.symmetric(vertical: 40.h),
                            child: Center(
                              child: Text(
                                'Không còn thông báo nào khác',
                                style: TextStyle(color: Colors.grey, fontSize: 13.sp),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
      // floatingActionButton removed as requested
    );
  }

  Widget _buildHeader(BuildContext context, NotificationController controller) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      // Background logic handled by AppBackground parent, but we might want a translucent overlay or just transparency
      // The template had white/80 blur. AppBackground usually has a gradient or pattern.
      // If we want it to match "Request Management", that screen uses AppBackground for the WHOLE body.
      // The header there is just a Row child.
      // So I will remove the Container background decoration to let AppBackground show through, or use minimal white if needed for readability.
      // Let's use a subtle white overlay for readability if scrolling, but here it's fixed.
      // I'll stick to transparency to match the "Request Management" feel unless it's too hard to read.
      // Actually, standard practice with AppBackground is transparent header.
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                onTap: () => Get.back(),
                child: Row(
                  mainAxisSize: MainAxisSize.min, // Important for left align
                  children: [
                    Icon(SolarIconsOutline.altArrowLeft, color: AppColors.primaryOrange, size: 28.sp),
                    SizedBox(width: 4.w),
                    Text(
                      'Quay lại',
                      style: GoogleFonts.inter(
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.w500,
                        fontSize: 16.sp,
                      ),
                    ),
                  ],
                ),
              ),
              // Removed "Đã đọc hết" TextButton as requested
            ],
          ),
          SizedBox(height: 12.h),
          Text(
            'Thông báo',
            textAlign: TextAlign.left,
            style: GoogleFonts.inter(
              fontSize: 28.sp, 
              fontWeight: FontWeight.bold,
              color: const Color(0xFF181411),
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(SolarIconsOutline.bell, size: 64.sp, color: Colors.grey[300]),
          SizedBox(height: 16.h),
          Text(
            'Không có thông báo nào',
            style: TextStyle(color: Colors.grey[500], fontSize: 16.sp),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationSection({
    required String title,
    required List<NotificationModel> notifications,
    required bool showMarkRead,
    VoidCallback? onMarkRead,
  }) {
    if (notifications.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 18.sp,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF181411),
                ),
              ),
              if (showMarkRead && onMarkRead != null)
                InkWell(
                  onTap: onMarkRead,
                  child: Text(
                    'Đánh dấu đã đọc',
                    style: GoogleFonts.inter(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w500,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                ),
            ],
          ),
        ),
        ...notifications.map((n) => _buildNotificationItem(n)).toList(),
      ],
    );
  }

  Widget _buildNotificationItem(NotificationModel notification) {
    return InkWell(
      onTap: () {
        final controller = Get.find<NotificationController>();
        if (!notification.isRead) {
          controller.markAsRead(notification.id);
        }
        Get.to(() => NotificationDetailScreen(notification: notification));
      },
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 6.h), // Added margin for card look to pop from background
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 20.h),
        decoration: BoxDecoration(
          color: notification.isRead 
              ? Colors.white.withOpacity(0.7) // Slightly translucent for read
              : Colors.white, // Solid white for unread to pop
          borderRadius: BorderRadius.circular(16.r), // Rounded corners matches Request Card
          border: Border.all(
            color: notification.isRead 
                ? Colors.transparent
                : AppColors.primaryOrange.withOpacity(0.2), // Subtle border for unread
          ),
          boxShadow: [
             if (!notification.isRead)
               BoxShadow(
                 color: AppColors.primaryOrange.withOpacity(0.05),
                 blurRadius: 10.r,
                 offset: Offset(0, 4.h),
               ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: GoogleFonts.inter(
                            fontSize: 15.sp,
                            fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w600,
                            color: const Color(0xFF181411),
                            height: 1.3,
                          ),
                        ),
                      ),
                      SizedBox(width: 8.w),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            _getExactTime(notification.timestamp),
                            style: GoogleFonts.inter(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey[600],
                            ),
                          ),
                          if (!notification.isRead) ...[
                            SizedBox(width: 6.w),
                            Container(
                              width: 8.r,
                              height: 8.r,
                              decoration: const BoxDecoration(
                                color: AppColors.primaryOrange,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                  SizedBox(height: 4.h),
                  // Sender name
                  Text(
                    notification.senderFullName?.toUpperCase() ?? 'HỆ THỐNG',
                    style: GoogleFonts.inter(
                      fontSize: 12.sp,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                  SizedBox(height: 4.h),
                  Text(
                    notification.cleanDescription,
                    style: GoogleFonts.inter(
                      fontSize: 14.sp,
                      color: Colors.grey[600],
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Helpers
  List<NotificationModel> _getTodayNotifications(List<NotificationModel> list) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    return list.where((n) {
      try {
        final date = DateFormat('dd/MM/yyyy HH:mm').parse(n.timestamp);
        return date.isAfter(today);
      } catch (e) {
        return false;
      }
    }).toList();
  }

  List<NotificationModel> _getEarlierNotifications(List<NotificationModel> list) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    return list.where((n) {
      try {
        final date = DateFormat('dd/MM/yyyy HH:mm').parse(n.timestamp);
        return date.isBefore(today);
      } catch (e) {
        return true;
      }
    }).toList();
  }

  String _getExactTime(String timestamp) {
    try {
      final date = DateFormat('dd/MM/yyyy HH:mm').parse(timestamp);
      return DateFormat('HH:mm - dd/MM/yyyy').format(date);
    } catch (e) {
      return timestamp;
    }
  }
}
