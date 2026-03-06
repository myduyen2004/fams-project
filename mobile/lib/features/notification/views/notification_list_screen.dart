import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/app_background.dart';
import '../controllers/notification_controller.dart';
import '../models/notification_model.dart';
import 'notification_detail_screen.dart';

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
                      padding: const EdgeInsets.only(bottom: 100), // Space for FAB
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildNotificationSection(
                            title: 'Hôm nay',
                            notifications: _getTodayNotifications(controller.notifications),
                            showMarkRead: _getTodayNotifications(controller.notifications).any((n) => !n.isRead),
                            onMarkRead: controller.markAllAsRead,
                          ),
                          
                          const SizedBox(height: 16),
                          
                          _buildNotificationSection(
                            title: 'Trước đó',
                            notifications: _getEarlierNotifications(controller.notifications),
                            showMarkRead: false,
                          ),
                          
                          // End of list
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Center(
                              child: Text(
                                'Không còn thông báo nào khác',
                                style: TextStyle(color: Colors.grey, fontSize: 13),
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
                    const Icon(Icons.chevron_left, color: AppColors.primaryOrange, size: 28),
                    const SizedBox(width: 4),
                    Text(
                      'Quay lại',
                      style: GoogleFonts.inter(
                        color: AppColors.primaryOrange,
                        fontWeight: FontWeight.w500,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
              // Removed "Đã đọc hết" TextButton as requested
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Thông báo',
            textAlign: TextAlign.left,
            style: GoogleFonts.inter(
              fontSize: 28, 
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
          Icon(Icons.notifications_none, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'Không có thông báo nào',
            style: TextStyle(color: Colors.grey[500], fontSize: 16),
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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 18,
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
                      fontSize: 12,
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
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6), // Added margin for card look to pop from background
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        decoration: BoxDecoration(
          color: notification.isRead 
              ? Colors.white.withOpacity(0.7) // Slightly translucent for read
              : Colors.white, // Solid white for unread to pop
          borderRadius: BorderRadius.circular(16), // Rounded corners matches Request Card
          border: Border.all(
            color: notification.isRead 
                ? Colors.transparent
                : AppColors.primaryOrange.withOpacity(0.2), // Subtle border for unread
          ),
          boxShadow: [
             if (!notification.isRead)
               BoxShadow(
                 color: AppColors.primaryOrange.withOpacity(0.05),
                 blurRadius: 10,
                 offset: const Offset(0, 4),
               ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!notification.isRead)
              Container(
                margin: const EdgeInsets.only(right: 12, top: 2),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primaryOrange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: AppColors.primaryOrange.withOpacity(0.5)),
                ),
                child: Text(
                  'MỚI',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryOrange,
                  ),
                ),
              ),
            
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
                            fontSize: 15,
                            fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.w600,
                            color: const Color(0xFF181411),
                            height: 1.3,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _getExactTime(notification.timestamp),
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Sender name
                  Text(
                    notification.senderFullName?.toUpperCase() ?? 'HỆ THỐNG',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.cleanDescription,
                    style: GoogleFonts.inter(
                      fontSize: 14,
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
