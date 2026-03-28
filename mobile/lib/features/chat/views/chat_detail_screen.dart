import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/chat_controller.dart';
import '../models/chat_models.dart';
import 'chat_info_screen.dart';
import 'image_preview_screen.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Chat detail / conversation screen — matches web chat area
class ChatDetailScreen extends StatefulWidget {
  const ChatDetailScreen({super.key});

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  ChatController get controller => Get.find<ChatController>();

  @override
  void initState() {
    super.initState();
    final controller = Get.find<ChatController>();
    // Register once here — NOT inside build() which re-registers on every rebuild
    ever(controller.messages, (_) => _scrollToBottom());
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0.0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ChatController>();

    return WillPopScope(
      onWillPop: () async {
        controller.clearSelectedGroup();
        return true;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F5F0),
        appBar: _buildAppBar(controller),
        body: Column(
          children: [
            // Messages
            Expanded(
              child: Obx(() {
                if (controller.isLoadingMessages.value) {
                  return const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primaryOrange,
                    ),
                  );
                }
                final List<ChatMessage> processedMessages = _groupMessages(controller.messages);
                return ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  padding: EdgeInsets.symmetric(
                    horizontal: 12.w,
                    vertical: 8.h,
                  ),
                  itemCount: processedMessages.length,
                  itemBuilder: (context, index) {
                    final msg = processedMessages[index];

                    final isOldest = index == processedMessages.length - 1;
                    final chronologicalPrev = isOldest
                        ? null
                        : processedMessages[index + 1];

                    final showDate =
                        isOldest ||
                        _shouldShowDate(chronologicalPrev!.sentAt, msg.sentAt);

                    final showSender =
                        !msg.isOwn &&
                        (isOldest ||
                            chronologicalPrev!.senderId != msg.senderId);

                    final isNewest = index == 0;

                    return Column(
                      children: [
                        if (showDate) _buildDateSeparator(msg.sentAt),
                        _buildMessageBubble(
                          msg,
                          controller,
                          showSender,
                          isNewest: isNewest,
                        ),
                      ],
                    );
                  },
                );
              }),
            ),

            // Typing indicator
            Obx(() {
              if (controller.typingUsers.isEmpty) {
                return const SizedBox.shrink();
              }
              return Container(
                padding: EdgeInsets.symmetric(
                  horizontal: 20.w,
                  vertical: 6.h,
                ),
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    SizedBox(width: 24.w, height: 16.h, child: _TypingDots()),
                    SizedBox(width: 8.w),
                    Text(
                      '${controller.typingUsers.join(", ")} đang nhập...',
                      style: TextStyle(
                        fontSize: 12.sp,
                        fontStyle: FontStyle.italic,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              );
            }),

            // Reply bar
            Obx(() {
              final replyMsg = controller.replyingTo.value;
              if (replyMsg == null) return const SizedBox.shrink();
              return Container(
                padding: EdgeInsets.symmetric(
                  horizontal: 16.w,
                  vertical: 8.h,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: Colors.grey[200]!)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 4.w,
                      height: 40.h,
                      decoration: BoxDecoration(
                        color: AppColors.primaryOrange,
                        borderRadius: BorderRadius.circular(2.r),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Trả lời ${replyMsg.senderName}',
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryOrange,
                            ),
                          ),
                          Text(
                            _getPreviewText(replyMsg),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12.sp,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(SolarIconsOutline.closeCircle, size: 20.sp),
                      onPressed: controller.cancelReply,
                    ),
                  ],
                ),
              );
            }),

            // Input area
            _buildInputArea(controller),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(ChatController controller) {
    return AppBar(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      elevation: 1,
      leading: IconButton(
        icon: Icon(SolarIconsOutline.altArrowLeft, color: const Color(0xFF2D3436), size: 20.sp),
        onPressed: () {
          controller.clearSelectedGroup();
          Get.back();
        },
      ),
      title: Obx(() {
        final group = controller.selectedGroup.value;
        if (group == null) return const SizedBox.shrink();
        return Row(
          children: [
            Builder(
              builder: (context) {
                final studentMembers =
                    group.members?.where((m) => m.role == 'STUDENT').toList() ??
                    [];
                final avatarsToDisplay = studentMembers.take(2).toList();

                if (avatarsToDisplay.isEmpty) {
                  return Container(
                    width: 38.r,
                    height: 38.r,
                    decoration: const BoxDecoration(
                      color: Color(0xFFFFF1E7),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Icon(
                        Icons.people_rounded,
                        color: const Color(0xFFFF8C33),
                        size: 20.sp,
                      ),
                    ),
                  );
                }

                return SizedBox(
                  width: avatarsToDisplay.length > 1
                      ? 54.0.w
                      : 38.0.w, // 38 + 16 = 54
                  height: 38.h,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: avatarsToDisplay
                        .asMap()
                        .entries
                        .map((entry) {
                          final idx = entry.key;
                          final member = entry.value;

                          return Positioned(
                            left: idx * 16.0.w, // Adjust overlap distance
                            child: Container(
                              width: 38.r,
                              height: 38.r,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2.w,
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
                                            _buildInitialAvatarForHeader(
                                              member.fullName,
                                            ),
                                        placeholder: (context, url) =>
                                            Container(color: Colors.grey[200]),
                                      )
                                    : _buildInitialAvatarForHeader(
                                        member.fullName,
                                      ),
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
            SizedBox(width: 12.w),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    group.name,
                    style: TextStyle(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF2D3436),
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${group.memberCount} thành viên',
                    style: TextStyle(fontSize: 12.sp, color: Colors.grey[500]),
                  ),
                ],
              ),
            ),
          ],
        );
      }),
      actions: [
        IconButton(
          icon: Icon(
            Icons.info_outline_rounded,
            color: AppColors.primaryOrange,
            size: 24.sp,
          ),
          onPressed: () {
            Get.to(
              () => const ChatInfoScreen(),
              transition: Transition.cupertino,
            );
          },
        ),
      ],
    );
  }

  Widget _buildDateSeparator(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final now = DateTime.now();
      String text;
      if (date.year == now.year &&
          date.month == now.month &&
          date.day == now.day) {
        text = 'Hôm nay';
      } else if (date.year == now.year &&
          date.month == now.month &&
          date.day == now.day - 1) {
        text = 'Hôm qua';
      } else {
        text = '${date.day}/${date.month}/${date.year}';
      }
      return Padding(
        padding: EdgeInsets.symmetric(vertical: 12.h),
        child: Center(
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 5.h),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12.r),
            ),
            child: Text(
              text,
              style: TextStyle(fontSize: 12.sp, color: Colors.grey[600]),
            ),
          ),
        ),
      );
    } catch (_) {
      return const SizedBox.shrink();
    }
  }

  Widget _buildMessageBubble(
    ChatMessage msg,
    ChatController controller,
    bool showSender, {
    bool isNewest = false,
  }) {
    final isOwn = msg.isOwn;

    return GestureDetector(
      onTap: msg.deleted || msg.readBy.isEmpty
          ? null
          : () => _showReadDetails(msg),
      onLongPress: msg.deleted
          ? null
          : () => _showMessageOptions(context, msg, controller),
      child: Container(
        margin: EdgeInsets.only(bottom: 4.h),
        child: Row(
          mainAxisAlignment: isOwn
              ? MainAxisAlignment.end
              : MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            // Avatar for others
            if (!isOwn)
              showSender
                  ? Container(
                      width: 32.r,
                      height: 32.r,
                      margin: EdgeInsets.only(right: 8.w),
                      decoration: BoxDecoration(
                        color: _getRoleColor(msg.senderRole).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10.r),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child:
                          msg.senderAvatarUrl != null &&
                              msg.senderAvatarUrl!.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: msg.senderAvatarUrl!,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Center(
                                child: Text(
                                  msg.senderName[0].toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: _getRoleColor(msg.senderRole),
                                  ),
                                ),
                              ),
                              errorWidget: (context, url, error) => Center(
                                child: Text(
                                  msg.senderName[0].toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: _getRoleColor(msg.senderRole),
                                  ),
                                ),
                              ),
                            )
                          : Center(
                              child: Icon(
                                Icons.person_rounded,
                                size: 20.sp,
                                color: _getRoleColor(msg.senderRole),
                              ),
                            ),
                    )
                  : SizedBox(width: 40.w),

            // Bubble
            Flexible(
              child: Column(
                crossAxisAlignment: isOwn
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  if (showSender && !isOwn)
                    Padding(
                      padding: EdgeInsets.only(left: 4.w, bottom: 2.h),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            msg.senderName,
                            style: TextStyle(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w600,
                              color: _getRoleColor(msg.senderRole),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 1,
                            ),
                            decoration: BoxDecoration(
                              color: _getRoleColor(
                                msg.senderRole,
                              ).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              msg.senderRole == 'LECTURER' ? 'GV' : 'SV',
                              style: TextStyle(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w600,
                                color: _getRoleColor(msg.senderRole),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.72,
                    ),
                    padding: msg.type == 'IMAGE' && !msg.deleted
                        ? EdgeInsets.zero
                        : EdgeInsets.symmetric(
                            horizontal: 14.w,
                            vertical: 10.h,
                          ),
                    decoration: BoxDecoration(
                      color: msg.deleted
                          ? Colors.grey[100]
                          : isOwn
                          ? AppColors.primaryOrange
                          : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(18.r),
                        topRight: Radius.circular(18.r),
                        bottomLeft: Radius.circular(isOwn ? 18.r : 0),
                        bottomRight: Radius.circular(isOwn ? 0 : 18.r),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: isOwn
                          ? CrossAxisAlignment.end
                          : CrossAxisAlignment.start,
                      children: [
                        // Reply preview
                        if (msg.replyToId != null && !msg.deleted)
                          Container(
                            margin: msg.type == 'IMAGE'
                                ? EdgeInsets.all(8.r)
                                : EdgeInsets.only(bottom: 6.h),
                            padding: EdgeInsets.all(8.r),
                            decoration: BoxDecoration(
                              color: isOwn
                                  ? Colors.white.withOpacity(0.2)
                                  : Colors.grey[100],
                              borderRadius: BorderRadius.circular(8),
                              border: Border(
                                left: BorderSide(
                                  color: isOwn
                                      ? Colors.white.withOpacity(0.6)
                                      : AppColors.primaryOrange,
                                  width: 3,
                                ),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  msg.replyToSenderName ?? '',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: isOwn
                                        ? Colors.white
                                        : AppColors.primaryOrange,
                                  ),
                                ),
                                Text(
                                  msg.replyToContent ?? '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isOwn
                                        ? Colors.white.withOpacity(0.8)
                                        : Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Content
                        _buildContent(msg, isOwn),
                      ],
                    ),
                  ),

                  // Time + Read receipts — OUTSIDE the bubble so always visible
                  Padding(
                    padding: const EdgeInsets.only(top: 3, left: 2, right: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: isOwn
                          ? MainAxisAlignment.end
                          : MainAxisAlignment.start,
                      children: [
                        Text(
                          _formatTime(msg.sentAt),
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey[400],
                          ),
                        ),
                        if (isNewest && msg.readBy.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          _buildReadReceipts(msg.readBy),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(ChatMessage msg, bool isOwn) {
    if (msg.deleted) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.block, size: 14, color: Colors.grey[400]),
          const SizedBox(width: 4),
          Text(
            'Tin nhắn đã được thu hồi',
            style: TextStyle(
              fontSize: 13,
              fontStyle: FontStyle.italic,
              color: isOwn ? Colors.white70 : Colors.grey[400],
            ),
          ),
        ],
      );
    }

    switch (msg.type) {
      case 'IMAGE_GROUP':
        final images = msg.imageMessages ?? [];
        return SizedBox(
          width: 240,
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: images.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: images.length == 1 ? 1 : (images.length <= 4 ? 2 : 3),
              crossAxisSpacing: 2,
              mainAxisSpacing: 2,
            ),
            itemBuilder: (context, idx) {
              final img = images[idx];
              return GestureDetector(
                onTap: () {
                  Get.to(
                    () => ImagePreviewScreen(
                      imageUrl: img.attachmentUrl ?? '',
                      senderName: img.senderName,
                    ),
                  );
                },
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: CachedNetworkImage(
                    imageUrl: img.attachmentUrl ?? '',
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: Colors.grey[200]),
                  ),
                ),
              );
            },
          ),
        );

      case 'IMAGE':
        return GestureDetector(
          onTap: () {
            if (msg.attachmentUrl != null) {
              Get.to(
                () => ImagePreviewScreen(
                  imageUrl: msg.attachmentUrl!,
                  senderName: msg.senderName,
                ),
              );
            }
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: CachedNetworkImage(
              imageUrl: msg.attachmentUrl ?? '',
              width: 220,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                width: 220,
                height: 160,
                color: Colors.grey[200],
                child: const Center(
                  child: CircularProgressIndicator(
                    color: AppColors.primaryOrange,
                    strokeWidth: 2,
                  ),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                width: 220,
                height: 100,
                color: Colors.grey[200],
                child: const Icon(Icons.broken_image, color: Colors.grey),
              ),
            ),
          ),
        );

      case 'FILE':
        return GestureDetector(
          onTap: () => _downloadFile(msg),
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isOwn ? Colors.white.withOpacity(0.15) : Colors.grey[50],
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _getFileIcon(msg.attachmentName ?? ''),
                  size: 28,
                  color: isOwn ? Colors.white : AppColors.primaryOrange,
                ),
                const SizedBox(width: 10),
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.attachmentName ?? msg.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: isOwn ? Colors.white : const Color(0xFF2D3436),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Nhấn để tải',
                        style: TextStyle(
                          fontSize: 11,
                          color: isOwn
                              ? Colors.white.withOpacity(0.7)
                              : Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.download_rounded,
                  size: 22,
                  color: isOwn ? Colors.white : AppColors.primaryOrange,
                ),
              ],
            ),
          ),
        );

      case 'LINK':
        return GestureDetector(
          onTap: () => _openUrl(msg.content),
          child: Text(
            msg.content,
            style: TextStyle(
              fontSize: 14,
              color: isOwn ? Colors.white : Colors.blue,
              decoration: TextDecoration.underline,
              decorationColor: isOwn ? Colors.white : Colors.blue,
            ),
          ),
        );

      default:
        return Text(
          msg.content,
          style: TextStyle(
            fontSize: 14,
            color: isOwn ? Colors.white : const Color(0xFF2D3436),
          ),
        );
    }
  }

  Widget _buildReadReceipts(List<ReadReceipt> readBy) {
    // Only show top 3 avatars
    final displayList = readBy.take(3).toList();
    return SizedBox(
      width: displayList.length * 15.0 + 8,
      height: 20,
      child: Stack(
        children: displayList.asMap().entries.map((entry) {
          final receipt = entry.value;
          return Positioned(
            right: (displayList.length - 1 - entry.key) * 14.0,
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 2.r,
                    offset: Offset(0, 1.h),
                  ),
                ],
              ),
              child: ClipOval(
                child:
                    receipt.avatarUrl != null && receipt.avatarUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: receipt.avatarUrl!,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) =>
                            _buildInitialsAvatar(receipt),
                        placeholder: (context, url) =>
                            Container(color: Colors.grey[200]),
                      )
                    : _buildInitialsAvatar(receipt),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildInitialsAvatar(ReadReceipt receipt) {
    return Container(
      color: AppColors.primaryOrange.withOpacity(0.6),
      child: Center(
        child: Icon(Icons.person_rounded, size: 12.sp, color: Colors.white),
      ),
    );
  }

  Widget _buildInputArea(ChatController controller) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        8.w,
        8.h,
        8.w,
        MediaQuery.of(context).padding.bottom + 8.h,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8.r,
            offset: Offset(0, -2.h),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Obx(() {
            if (controller.selectedFile.value != null) {
              return _buildFilePreview(controller);
            }
            return const SizedBox.shrink();
          }),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Attach button
              IconButton(
                icon: const Icon(
                  Icons.attach_file_rounded,
                  color: AppColors.primaryOrange,
                ),
                onPressed: () => _pickFile(controller),
              ),
              // Text field
              Expanded(
                child: Container(
                  constraints: BoxConstraints(maxHeight: 120.h),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F5F5),
                    borderRadius: BorderRadius.circular(24.r),
                  ),
                  child: TextField(
                    controller: _textController,
                    focusNode: _focusNode,
                    maxLines: null,
                    textInputAction: TextInputAction.newline,
                    onChanged: (v) {
                      if (v.isNotEmpty) controller.sendTypingIndicator();
                    },
                    style: TextStyle(fontSize: 15.sp),
                    decoration: InputDecoration(
                      hintText: 'Nhập tin nhắn...',
                      hintStyle: TextStyle(
                        fontSize: 15.sp,
                        color: Colors.grey[400],
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 18.w,
                        vertical: 10.h,
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox(width: 4.w),
              // Send button
              Container(
                width: 44.r,
                height: 44.r,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF9F43), Color(0xFFFF6B00)],
                  ),
                  shape: BoxShape.circle,
                ),
                child: Obx(
                  () => IconButton(
                    icon: controller.isSending.value
                        ? SizedBox(
                            width: 20.r,
                            height: 20.r,
                            child: const CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : Icon(
                            Icons.send_rounded,
                            color: Colors.white,
                            size: 22.sp,
                          ),
                    onPressed: controller.isSending.value
                        ? null
                        : () {
                            final text = _textController.text.trim();
                            final file = controller.selectedFile.value;

                            if (text.isNotEmpty) {
                              controller.sendMessage(text);
                              _textController.clear();
                            }

                            if (file != null) {
                              controller.sendFile(file);
                            }
                          },
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilePreview(ChatController controller) {
    final file = controller.selectedFile.value!;
    final fileName = file.path.split('/').last;
    final ext = fileName.split('.').last.toLowerCase();
    final isImage = ['png', 'jpg', 'jpeg', 'gif', 'heic'].contains(ext);

    return Container(
      margin: EdgeInsets.only(bottom: 8.h, left: 44.w, right: 44.w),
      padding: EdgeInsets.all(8.r),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(12.r),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Row(
        children: [
          // Preview
          ClipRRect(
            borderRadius: BorderRadius.circular(8.r),
            child: isImage
                ? Image.file(file, width: 40.r, height: 40.r, fit: BoxFit.cover)
                : Container(
                    width: 40.r,
                    height: 40.r,
                    color: Colors.grey[200],
                    child: Icon(
                      _getFileIcon(fileName),
                      color: AppColors.primaryOrange,
                      size: 20.sp,
                    ),
                  ),
          ),
          SizedBox(width: 12.w),
          // Name
          Expanded(
            child: Text(
              fileName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 14.sp, fontWeight: FontWeight.w500),
            ),
          ),
          // Remove button
          IconButton(
            icon: const Icon(Icons.close_rounded, size: 20, color: Colors.grey),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () => controller.clearSelectedFile(),
          ),
        ],
      ),
    );
  }

  void _showMessageOptions(
    BuildContext context,
    ChatMessage msg,
    ChatController controller,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                ListTile(
                  leading: const Icon(
                    SolarIconsOutline.reply,
                    color: AppColors.primaryOrange,
                  ),
                  title: const Text('Trả lời'),
                  onTap: () {
                    Navigator.pop(ctx);
                    controller.setReplyTo(msg);
                    _focusNode.requestFocus();
                  },
                ),
                if (msg.readBy.isNotEmpty)
                  ListTile(
                    leading: const Icon(SolarIconsOutline.eye),
                    title: const Text('Thông tin lượt xem'),
                    onTap: () {
                      Get.back();
                      _showReadDetails(msg);
                    },
                  ),
                if (msg.isOwn && !msg.deleted)
                  ListTile(
                    leading: const Icon(
                      SolarIconsOutline.trashBinMinimalistic,
                      color: Colors.redAccent,
                    ),
                    title: const Text(
                      'Thu hồi',
                      style: TextStyle(color: Colors.redAccent),
                    ),
                    onTap: () {
                      Navigator.pop(ctx);
                      _confirmDelete(context, msg, controller);
                    },
                  ),
                if (msg.type == 'FILE' || msg.type == 'IMAGE')
                  ListTile(
                    leading: const Icon(
                      SolarIconsOutline.download,
                      color: AppColors.primaryOrange,
                    ),
                    title: const Text('Tải xuống'),
                    onTap: () {
                      Navigator.pop(ctx);
                      _downloadFile(msg);
                    },
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _confirmDelete(
    BuildContext context,
    ChatMessage msg,
    ChatController controller,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Thu hồi tin nhắn?'),
        content: const Text('Tin nhắn sẽ bị xóa với tất cả mọi người.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              controller.deleteMessage(msg.id);
            },
            child: const Text('Thu hồi'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickFile(ChatController controller) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      allowMultiple: false,
    );
    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);
      controller.selectFile(file);
    }
  }

  Future<void> _downloadFile(ChatMessage msg) async {
    if (msg.attachmentUrl != null) {
      await _openUrl(msg.attachmentUrl!);
    }
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  bool _shouldShowDate(String prev, String current) {
    try {
      final prevDate = DateTime.parse(prev);
      final currDate = DateTime.parse(current);
      return prevDate.day != currDate.day ||
          prevDate.month != currDate.month ||
          prevDate.year != currDate.year;
    } catch (_) {
      return false;
    }
  }

  void _showReadDetails(ChatMessage msg) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Container(
          padding: EdgeInsets.symmetric(vertical: 20.h),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Đã xem bởi (${msg.readBy.length})',
                style: TextStyle(
                  fontSize: 16.sp,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 15),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  physics: const BouncingScrollPhysics(),
                  itemCount: msg.readBy.length,
                  itemBuilder: (context, index) {
                    final receipt = msg.readBy[index];
                    return ListTile(
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primaryOrange.withOpacity(0.1),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child:
                            receipt.avatarUrl != null &&
                                receipt.avatarUrl!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: receipt.avatarUrl!,
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) =>
                                    _buildInitialsAvatarForDetails(receipt),
                              )
                            : _buildInitialsAvatarForDetails(receipt),
                      ),
                      title: Text(
                        receipt.fullName,
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInitialsAvatarForDetails(ReadReceipt receipt) {
    return const Center(
      child: Icon(
        Icons.person_rounded,
        size: 24,
        color: AppColors.primaryOrange,
      ),
    );
  }

  String _formatTime(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }

  String _getPreviewText(ChatMessage msg) {
    switch (msg.type) {
      case 'IMAGE':
        return '📷 Hình ảnh';
      case 'FILE':
        return '📎 ${msg.attachmentName ?? "Tệp đính kèm"}';
      default:
        return msg.content;
    }
  }

  Color _getRoleColor(String role) {
    return role == 'LECTURER'
        ? const Color(0xFF6C5CE7)
        : AppColors.primaryOrange;
  }

  IconData _getFileIcon(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();

    switch (ext) {
      case 'pdf':
        return Icons.picture_as_pdf_rounded;
      case 'doc':
      case 'docx':
        return Icons.description_rounded;
      case 'xls':
      case 'xlsx':
        return Icons.table_chart_rounded;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow_rounded;
      case 'zip':
      case 'rar':
        return Icons.folder_zip_rounded;
      default:
        return Icons.insert_drive_file_rounded;
    }
  }

  Widget _buildInitialAvatarForHeader(String fullName) {
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U';
    return Container(
      color: const Color(0xFFFFEEDD),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Color(0xFFFF8C33),
          ),
        ),
      ),
    );
  }

  List<ChatMessage> _groupMessages(List<ChatMessage> messages) {
    if (messages.isEmpty) return [];

    final List<ChatMessage> processed = [];
    int i = 0;

    // Messages are in reverse order: newest at index 0
    // So "chronologically previous" is at index i + 1
    while (i < messages.length) {
      final current = messages[i];

      if (current.type == 'IMAGE' && !current.deleted) {
        final List<ChatMessage> group = [current];
        int j = i + 1;

        while (j < messages.length) {
          final next = messages[j];
          final currentAt = DateTime.parse(messages[j - 1].sentAt);
          final nextAt = DateTime.parse(next.sentAt);
          final timeDiff = currentAt.difference(nextAt).inMinutes.abs();

          if (next.type == 'IMAGE' &&
              !next.deleted &&
              next.senderId == current.senderId &&
              timeDiff < 1) {
            group.add(next);
            j++;
          } else {
            break;
          }
        }

        if (group.length > 1) {
          processed.add(ChatMessage(
            id: current.id,
            groupId: current.groupId,
            senderId: current.senderId,
            senderName: current.senderName,
            senderRole: current.senderRole,
            senderAvatarUrl: current.senderAvatarUrl,
            content: '',
            type: 'IMAGE_GROUP',
            isOwn: current.isOwn,
            sentAt: current.sentAt,
            imageMessages: group.reversed.toList(), // Maintain chronological order in grid
            readBy: current.readBy,
          ));
          i = j;
        } else {
          processed.add(current);
          i++;
        }
      } else {
        processed.add(current);
        i++;
      }
    }

    return processed;
  }
}

/// Animated typing dots
class _TypingDots extends StatefulWidget {
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}

class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final offset = (_controller.value * 3 - i).clamp(0.0, 1.0);
            final y = -4 * (1 - (2 * offset - 1).abs());
            return Transform.translate(
              offset: Offset(0, y),
              child: Container(
                width: 5,
                height: 5,
                margin: const EdgeInsets.symmetric(horizontal: 1.5),
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  shape: BoxShape.circle,
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
