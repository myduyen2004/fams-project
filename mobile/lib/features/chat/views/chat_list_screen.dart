import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/constants/app_colors.dart';
import '../controllers/chat_controller.dart';
import '../models/chat_models.dart';
import 'chat_detail_screen.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Chat group list — matches web sidebar
class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ChatController>();

    return Scaffold(
      backgroundColor: const Color(0xFFFFF7F0),
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──
            Container(
              padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 12.h),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFFFF9F43), Color(0xFFFF6B00)],
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24.r),
                  bottomRight: Radius.circular(24.r),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        SolarIconsBold.chatLine,
                        color: Colors.white,
                        size: 28.sp,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Tin nhắn',
                        style: TextStyle(
                          fontSize: 22.sp,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const Spacer(),
                      Obx(
                        () => controller.totalUnreadCount.value > 0
                            ? Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20.r),
                                ),
                                child: Text(
                                  '${controller.totalUnreadCount.value}',
                                  style: TextStyle(
                                    fontSize: 13.sp,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primaryOrange,
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  // ── Search Bar ──
                  Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.25),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: TextField(
                      onChanged: (v) => controller.searchTerm.value = v,
                      style: TextStyle(color: Colors.white, fontSize: 15.sp),
                      decoration: InputDecoration(
                        hintText: 'Tìm kiếm nhóm chat...',
                        hintStyle: TextStyle(
                          color: Colors.white.withOpacity(0.7),
                        ),
                        prefixIcon: Icon(
                          SolarIconsOutline.magnifier,
                          color: Colors.white.withOpacity(0.8),
                          size: 20.sp,
                        ),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(
                          vertical: 12.h,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  // ── Unread Toggle ──
                  Obx(
                    () => Row(
                      children: [
                        GestureDetector(
                          onTap: () => controller.isUnreadOnly.value =
                              !controller.isUnreadOnly.value,
                          child: Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 14.w,
                              vertical: 6.h,
                            ),
                            decoration: BoxDecoration(
                              color: controller.isUnreadOnly.value
                                  ? Colors.white
                                  : Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(20.r),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.mark_email_unread_rounded,
                                  size: 16,
                                  color: controller.isUnreadOnly.value
                                      ? AppColors.primaryOrange
                                      : Colors.white,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Chưa đọc',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: controller.isUnreadOnly.value
                                        ? AppColors.primaryOrange
                                        : Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Group List ──
            Expanded(
              child: Obx(() {
                if (controller.isLoadingGroups.value) {
                  return const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primaryOrange,
                    ),
                  );
                }
                if (controller.filteredGroups.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 64.sp,
                          color: Colors.grey[300],
                        ),
                        SizedBox(height: 16.h),
                        Text(
                          controller.searchTerm.value.isNotEmpty
                              ? 'Không tìm thấy nhóm'
                              : 'Chưa có nhóm chat nào',
                          style: TextStyle(
                            fontSize: 16.sp,
                            color: Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  color: AppColors.primaryOrange,
                  onRefresh: controller.loadGroups,
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: controller.filteredGroups.length,
                    itemBuilder: (context, index) {
                      final group = controller.filteredGroups[index];
                      return _buildGroupTile(context, group, controller);
                    },
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGroupTile(
    BuildContext context,
    ChatGroup group,
    ChatController controller,
  ) {
    return InkWell(
      onTap: () {
        controller.selectGroup(group);
        Get.to(
          () => const ChatDetailScreen(),
          transition: Transition.cupertino,
        );
      },
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: 16.w, vertical: 4.h),
        padding: EdgeInsets.all(14.w),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8.r,
              offset: Offset(0, 2.h),
            ),
          ],
        ),
        child: Row(
          children: [
            // Group Avatar
            Builder(
              builder: (context) {
                final studentMembers =
                    group.members?.where((m) => m.role == 'STUDENT').toList() ??
                    [];
                final avatarsToDisplay = studentMembers.take(2).toList();

                if (avatarsToDisplay.isEmpty) {
                  return Container(
                    width: 48.r,
                    height: 48.r,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1E7),
                      borderRadius: BorderRadius.circular(20.r),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.people_rounded,
                        color: const Color(0xFFFF8C33),
                        size: 26.sp,
                      ),
                    ),
                  );
                }

                return SizedBox(
                  width: avatarsToDisplay.length > 1
                      ? 70.0.w
                      : 48.0.w, // 48 + 22 = 70
                  height: 48.h,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: avatarsToDisplay
                        .asMap()
                        .entries
                        .map((entry) {
                          final idx = entry.key;
                          final member = entry.value;

                          return Positioned(
                            left:
                                idx * 22.0.w,
                            child: Container(
                              width: 48.r,
                              height: 48.r,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 3.w,
                                ),
                                color: idx == 0
                                    ? Colors.white
                                    : const Color(0xFFFFD8B2),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.08),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: ClipOval(
                                child:
                                    member.avatarUrl != null &&
                                        member.avatarUrl!.isNotEmpty
                                    ? CachedNetworkImage(
                                        imageUrl: member.avatarUrl!,
                                        fit: BoxFit.cover,
                                        errorWidget: (context, url, error) =>
                                            _buildInitialAvatar(
                                              member.fullName,
                                            ),
                                        placeholder: (context, url) =>
                                            Container(color: Colors.grey[200]),
                                      )
                                    : _buildInitialAvatar(member.fullName),
                              ),
                            ),
                          );
                        })
                        .toList()
                        .reversed
                        .toList(), // Reverse to make first index on top
                  ),
                );
              },
            ),
            const SizedBox(width: 14),
            // Group Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          group.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 15.sp,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF2D3436),
                          ),
                        ),
                      ),
                      if (group.lastMessage != null)
                        Text(
                          _formatTime(group.lastMessage!.sentAt),
                          style: TextStyle(
                            fontSize: 12.sp,
                            color: group.unreadCount > 0
                                ? AppColors.primaryOrange
                                : Colors.grey[500],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    group.lecturerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12.sp, color: Colors.grey[500]),
                  ),
                  SizedBox(height: 4.h),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          group.lastMessage != null
                              ? '${group.lastMessage!.senderName}: ${_getLastMsgPreview(group.lastMessage!)}'
                              : 'Chưa có tin nhắn',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.sp,
                            fontWeight: group.unreadCount > 0
                                ? FontWeight.w600
                                : FontWeight.normal,
                            color: group.unreadCount > 0
                                ? const Color(0xFF2D3436)
                                : Colors.grey[500],
                          ),
                        ),
                      ),
                      if (group.unreadCount > 0)
                        Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: 8.w,
                            vertical: 3.h,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primaryOrange,
                            borderRadius: BorderRadius.circular(12.r),
                          ),
                          child: Text(
                            '${group.unreadCount}',
                            style: TextStyle(
                              fontSize: 11.sp,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getLastMsgPreview(LastMessage msg) {
    switch (msg.type) {
      case 'IMAGE':
        return '📷 Hình ảnh';
      case 'FILE':
        return '📎 Tệp đính kèm';
      case 'LINK':
        return '🔗 Liên kết';
      default:
        return msg.content;
    }
  }

  String _formatTime(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'Vừa xong';
      if (diff.inHours < 1) return '${diff.inMinutes}p';
      if (diff.inDays < 1) return '${diff.inHours}h';
      if (diff.inDays < 7) return '${diff.inDays}d';
      return '${date.day}/${date.month}';
    } catch (_) {
      return '';
    }
  }

  Widget _buildInitialAvatar(String fullName) {
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U';
    return Container(
      color: const Color(0xFFFFEEDD),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            fontSize: 18.sp,
            fontWeight: FontWeight.bold,
            color: const Color(0xFFFF8C33),
          ),
        ),
      ),
    );
  }
}
