import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/chat_controller.dart';
import '../models/chat_models.dart';
import 'chat_detail_screen.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen>
    with WidgetsBindingObserver {
  ChatController get controller => Get.find<ChatController>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      controller.loadGroups();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      controller.loadGroups();
    }
  }

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
        child: RefreshIndicator(
        color: const Color(0xFFF26F21),
        onRefresh: () => controller.loadGroups(),
        child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        slivers: [
          // 1. Unified Header (Aligned with Home)
          SliverPadding(
            padding: EdgeInsets.fromLTRB(20.w, 60.h, 20.w, 15.h),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tin nhắn',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 22.sp,
                      fontWeight: FontWeight.w800,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  Container(
                    padding: EdgeInsets.all(10.r),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.05), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Icon(SolarIconsOutline.tuning, color: const Color(0xFFF26F21), size: 22.sp),
                  ),
                ],
              ),
            ),
          ),

          // 2. Search & Filters
          SliverPadding(
            padding: EdgeInsets.symmetric(horizontal: 20.w),
            sliver: SliverToBoxAdapter(
              child: Column(
                children: [
                  Container(
                    height: 54.h,
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.dark ? Colors.grey.shade800 : const Color(0xFFF9FAFB),
                      borderRadius: BorderRadius.circular(20.r),
                      border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.transparent : Colors.grey.shade100),
                    ),
                    child: TextField(
                      onChanged: (v) => controller.searchTerm.value = v,
                      style: GoogleFonts.plusJakartaSans(fontSize: 15.sp, fontWeight: FontWeight.w600, color: Theme.of(context).colorScheme.onSurface),
                      decoration: InputDecoration(
                        hintText: 'Tìm kiếm nhóm hoặc tin nhắn...',
                        hintStyle: GoogleFonts.plusJakartaSans(color: Colors.grey.shade400, fontWeight: FontWeight.w500),
                        prefixIcon: Icon(SolarIconsOutline.magnifier, color: const Color(0xFFF26F21), size: 20.sp),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 15.h),
                      ),
                    ),
                  ),
                  SizedBox(height: 16.h),
                  Obx(() => Row(
                    children: [
                      _buildFilterChip(
                        context: context,
                        label: "Tất cả",
                        isSelected: !controller.isUnreadOnly.value,
                        onTap: () => controller.isUnreadOnly.value = false,
                        icon: SolarIconsBold.chatLine,
                      ),
                      SizedBox(width: 12.w),
                      _buildFilterChip(
                        context: context,
                        label: "Chưa đọc",
                        isSelected: controller.isUnreadOnly.value,
                        onTap: () => controller.isUnreadOnly.value = true,
                        icon: SolarIconsBold.letter,
                      ),
                    ],
                  )),
                  SizedBox(height: 12.h),
                ],
              ),
            ),
          ),

          // 3. Message List
          SliverPadding(
            padding: EdgeInsets.fromLTRB(0, 0, 0, 100.h),
            sliver: Obx(() {
              if (controller.isLoadingGroups.value) {
                return const SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: Color(0xFFF26F21))));
              }
              
              if (controller.filteredGroups.isEmpty) {
                return SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: EdgeInsets.all(32.r),
                          decoration: BoxDecoration(color: const Color(0xFFF9FAFB), shape: BoxShape.circle),
                          child: Icon(SolarIconsOutline.chatLine, size: 64.sp, color: Colors.grey.shade300),
                        ),
                        SizedBox(height: 24.h),
                        Text(
                          controller.searchTerm.value.isNotEmpty ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện nào',
                          style: GoogleFonts.plusJakartaSans(fontSize: 18.sp, fontWeight: FontWeight.w700, color: const Color(0xFF1E2A3A).withOpacity(0.6)),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final group = controller.filteredGroups[index];
                    return Padding(
                      padding: EdgeInsets.symmetric(horizontal: 20.w),
                      child: _buildPremiumGroupTile(context, group, controller),
                    );
                  },
                  childCount: controller.filteredGroups.length,
                ),
              );
            }),
          ),
        ],
      )),
     ),
    );
  }

  Widget _buildFilterChip({required BuildContext context, required String label, required bool isSelected, required VoidCallback onTap, required IconData icon}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF26F21) : (Theme.of(context).brightness == Brightness.dark ? Colors.grey.shade800 : const Color(0xFFF9FAFB)),
          borderRadius: BorderRadius.circular(12.r),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16.sp, color: isSelected ? Colors.white : Colors.grey.shade500),
            SizedBox(width: 8.w),
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13.sp, fontWeight: FontWeight.w600, color: isSelected ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white70 : Colors.grey.shade600))),
          ],
        ),
      ),
    );
  }

  Widget _buildPremiumGroupTile(BuildContext context, ChatGroup group, ChatController controller) {
    return InkWell(
      onTap: () {
        // Điều hướng ngay lập tức để UX mượt mà, không đợi load tin nhắn
        controller.selectGroup(group);
        Get.to(() => const ChatDetailScreen(), transition: Transition.cupertino);
      },
      child: Container(
        margin: EdgeInsets.only(bottom: 12.h),
        padding: EdgeInsets.all(12.r),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor, 
          borderRadius: BorderRadius.circular(20.r),
          border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? Colors.transparent : const Color(0xFFF9FAFB)),
        ),
        child: Row(
          children: [
            _buildClassGroupAvatar(size: 56.r, iconSize: 24.sp),
            SizedBox(width: 16.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          group.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(fontSize: 15.sp, fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.onSurface),
                        ),
                      ),
                      SizedBox(width: 8.w),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (group.lastMessage != null)
                            Text(_formatTime(group.lastMessage!.sentAt), style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, color: Colors.grey.shade400)),
                          if (group.unreadCount > 0) ...[
                            SizedBox(width: 8.w),
                            Container(
                              padding: EdgeInsets.symmetric(horizontal: 7.w, vertical: 3.h),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF26F21),
                                borderRadius: BorderRadius.circular(999.r),
                              ),
                              child: Text(
                                group.unreadCount > 99 ? '99+' : '${group.unreadCount}',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10.sp,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                  SizedBox(height: 4.h),
                  Text(
                    group.lastMessage != null ? '${group.lastMessage!.senderName}: ${_getLastMsgPreview(group.lastMessage!)}' : 'Chưa có tin nhắn',
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.plusJakartaSans(fontSize: 13.sp, color: Colors.grey.shade500),
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
      case 'IMAGE': return '📷 Hình ảnh';
      case 'FILE': return '📎 Tệp đính kèm';
      case 'LINK': return '🔗 Liên kết';
      default: return msg.content;
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
      return '${date.day}/${date.month}';
    } catch (_) { return ''; }
  }

  Widget _buildClassGroupAvatar({
    required double size,
    required double iconSize,
  }) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1E7),
        borderRadius: BorderRadius.circular(size * 0.32),
      ),
      child: Center(
        child: Icon(
          SolarIconsBold.chatLine,
          color: const Color(0xFFF26F21),
          size: iconSize,
        ),
      ),
    );
  }
}
