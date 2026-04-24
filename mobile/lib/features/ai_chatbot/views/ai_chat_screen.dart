import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../core/constants/app_colors.dart';
import '../../home/controllers/home_controller.dart';
import '../controllers/ai_chat_controller.dart';
import '../models/ai_chat_models.dart';

class VerticalTableBuilder extends MarkdownElementBuilder {
  final BuildContext context;
  VerticalTableBuilder(this.context);

  @override
  Widget? visitElementAfter(md.Element element, TextStyle? preferredStyle) {
    if (element.tag != 'table') return null;

    List<String> headers = [];
    List<List<String>> dataRows = [];

    // Helper to find all rows in the table
    void collectRows(md.Element el, {bool isHeader = false}) {
      if (el.tag == 'tr') {
        List<String> rowData = [];
        if (el.children != null) {
          for (var cell in el.children!) {
            if (cell is md.Element && (cell.tag == 'th' || cell.tag == 'td')) {
              rowData.add(cell.textContent.trim());
            }
          }
        }
        if (isHeader || el.children?.any((c) => c is md.Element && c.tag == 'th') == true) {
          headers.addAll(rowData);
        } else {
          dataRows.add(rowData);
        }
      } else if (el.children != null) {
        for (var child in el.children!) {
          if (child is md.Element) {
            collectRows(child, isHeader: el.tag == 'thead');
          }
        }
      }
    }

    collectRows(element);

    if (dataRows.isEmpty) return null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: dataRows.asMap().entries.map((entry) {
        final rowIndex = entry.key;
        final row = entry.value;
        return Container(
          width: double.infinity,
          margin: EdgeInsets.only(bottom: 12.h),
          padding: EdgeInsets.all(14.r),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark 
                ? Colors.grey[850] 
                : Colors.white,
            borderRadius: BorderRadius.circular(16.r),
            border: Border.all(color: AppColors.primaryOrange.withOpacity(0.12)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 5,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 10.w, vertical: 6.h),
                    decoration: BoxDecoration(
                      color: AppColors.primaryOrange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8.r),
                    ),
                    child: Text(
                      'Mục ${rowIndex + 1}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.sp,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryOrange,
                      ),
                    ),
                  ),
                  Icon(Icons.info_outline_rounded, size: 14.sp, color: Colors.grey[400]),
                ],
              ),
              SizedBox(height: 14.h),
              ...List.generate(row.length, (i) {
                final header = i < headers.length ? headers[i] : 'Thông tin ${i + 1}';
                return Container(
                  width: double.infinity,
                  margin: EdgeInsets.only(bottom: i == row.length - 1 ? 0 : 8.h),
                  padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 10.h),
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Colors.grey[900]?.withOpacity(0.5)
                        : const Color(0xFFFDFDFD),
                    borderRadius: BorderRadius.circular(10.r),
                    border: Border.all(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.white.withOpacity(0.05)
                          : Colors.grey.withOpacity(0.08),
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        flex: 4,
                        child: Text(
                          header,
                          style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.w600,
                            fontSize: 10.sp,
                            color: Colors.blueGrey[400],
                          ),
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 14.h,
                        color: Colors.grey.withOpacity(0.1),
                        margin: EdgeInsets.symmetric(horizontal: 8.w),
                      ),
                      Expanded(
                        flex: 6,
                        child: Text(
                          row[i].isEmpty ? '-' : row[i],
                          textAlign: TextAlign.right,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11.sp,
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context).colorScheme.onSurface.withOpacity(0.9),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class AiChatScreen extends StatelessWidget {
  const AiChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    if (!Get.isRegistered<AiChatController>()) {
      Get.put(AiChatController());
    }
    final AiChatController controller = Get.find<AiChatController>();
    final ScrollController scrollController = ScrollController();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Theme.of(context).iconTheme.color,
          ),
          onPressed: () {
            // Quay lại trang chủ thay vì pop (vì là tab)
            Get.find<HomeController>().changeTab(0);
          },
        ),
        title: Obx(
          () => Column(
            children: [
              Text(
                controller.chatTitle,
                style: GoogleFonts.plusJakartaSans(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                  fontSize: 16.sp,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6.r,
                    height: 6.r,
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  SizedBox(width: 4.w),
                  Text(
                    'Online',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.green,
                      fontSize: 10.sp,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(
              Icons.history_rounded,
              color: AppColors.primaryOrange,
            ),
            onPressed: () => _showHistoryBottomSheet(context, controller),
          ),
          IconButton(
            icon: const Icon(
              Icons.add_circle_outline_rounded,
              color: AppColors.primaryOrange,
            ),
            onPressed: () => controller.handleNewChat(),
          ),
        ],
      ),
      body: Column(
        children: [
          const Divider(height: 1),
          // Thinking Steps
          Obx(
            () => controller.isThinking.value
                ? _buildThinkingProcess(context, controller.thinkingSteps)
                : const SizedBox.shrink(),
          ),

          Expanded(
            child: Obx(() {
              if (controller.messages.isEmpty && !controller.isLoading.value) {
                return _buildWelcomeScreen(context, controller);
              }

              return ListView.builder(
                controller: scrollController,
                reverse: true, // Tự động cuộn xuống dưới
                padding: const EdgeInsets.all(16),
                itemCount: controller.messages.length,
                itemBuilder: (context, index) {
                  final msg = controller.messages[index];
                  return _buildMessageBubble(context, msg);
                },
              );
            }),
          ),

          if (controller.isThinking.value)
            Padding(
              padding: const EdgeInsets.symmetric(
                vertical: 8.0,
                horizontal: 16,
              ),
              child: Row(
                children: [
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primaryOrange,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'AI đang suy nghĩ...',
                    style: GoogleFonts.plusJakartaSans(color: Colors.grey, fontSize: 13),
                  ),
                ],
              ),
            ),

          _buildInputArea(context, controller),
        ],
      ),
    );
  }

  Widget _buildWelcomeScreen(BuildContext context, AiChatController controller) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.primaryOrange.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: AppColors.primaryOrange,
                size: 48,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Chào mừng bạn!',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tôi là trợ lý ảo FAMS. Tôi có thể giúp gì cho bạn hôm nay?',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(fontSize: 14, color: Colors.grey[600]),
            ),
            const SizedBox(height: 32),
            Column(
              children: controller.suggestedQuestions
                  .map(
                    (q) => Container(
                      width: double.infinity,
                      margin: EdgeInsets.only(bottom: 10.h),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18.r),
                          onTap: () => controller.sendMessage(q),
                          child: Ink(
                            padding: EdgeInsets.all(16.r),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(18.r),
                              border: Border.all(
                                color: AppColors.primaryOrange.withOpacity(0.16),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 34.r,
                                  height: 34.r,
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryOrange.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(12.r),
                                  ),
                                  child: const Icon(
                                    Icons.north_east_rounded,
                                    color: AppColors.primaryOrange,
                                    size: 18,
                                  ),
                                ),
                                SizedBox(width: 12.w),
                                Expanded(
                                  child: Text(
                                    q,
                                    style: GoogleFonts.plusJakartaSans(
                                      color: Theme.of(context).colorScheme.onSurface,
                                      fontSize: 12.sp,
                                      fontWeight: FontWeight.w600,
                                      height: 1.4,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThinkingProcess(BuildContext context, List<ThinkingStep> steps) {
    if (steps.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[900] : Colors.grey[50],
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tiến trình xử lý:',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11.sp,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          SizedBox(height: 8.h),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: steps.map((s) => Padding(
              padding: EdgeInsets.only(bottom: 4.h),
              child: _buildStepTag(s),
            )).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStepTag(ThinkingStep step) {
    Color color = Colors.grey;
    IconData icon = Icons.pending_outlined;
    if (step.status == 'success') {
      color = Colors.green;
      icon = Icons.check_circle_rounded;
    } else if (step.status == 'error') {
      color = Colors.red;
      icon = Icons.error_outline_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            step.name,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(BuildContext context, AiChatMessage msg) {
    final bool isUser = msg.isUser;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser)
            Container(
              margin: const EdgeInsets.only(right: 8, top: 4),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.primaryOrange.withOpacity(0.1),
                child: const Icon(
                  Icons.smart_toy_rounded,
                  size: 18,
                  color: AppColors.primaryOrange,
                ),
              ),
            ),
          Flexible(
            child: Column(
              crossAxisAlignment: isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(12.r),
                  decoration: BoxDecoration(
                    gradient: isUser 
                        ? const LinearGradient(
                            colors: [AppColors.primaryOrange, Color(0xFFFF8C42)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ) 
                        : null,
                    color: isUser
                        ? null
                        : (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF2C2C2E) : Colors.white),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20.r),
                      topRight: Radius.circular(20.r),
                      bottomLeft: Radius.circular(isUser ? 20.r : 4.r),
                      bottomRight: Radius.circular(isUser ? 4.r : 20.r),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: MarkdownBody(
                    data: msg.content,
                    selectable: true,
                    builders: {
                      'table': VerticalTableBuilder(context),
                    },
                    styleSheet: MarkdownStyleSheet(
                      p: GoogleFonts.plusJakartaSans(
                        color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                        fontSize: 12.sp,
                        height: 1.5,
                      ),
                      h1: GoogleFonts.plusJakartaSans(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w800,
                        color: isUser ? Colors.white : Theme.of(context).colorScheme.onSurface,
                      ),
                      h2: GoogleFonts.plusJakartaSans(
                        fontSize: 16.sp,
                        fontWeight: FontWeight.w700,
                        color: isUser ? Colors.white : Theme.of(context).colorScheme.onSurface,
                      ),
                      strong: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w700,
                        color: isUser ? Colors.white : Theme.of(context).colorScheme.onSurface,
                      ),
                      listBullet: GoogleFonts.plusJakartaSans(
                        color: isUser ? Colors.white : Theme.of(context).colorScheme.onSurface,
                      ),
                      tableBorder: TableBorder.all(
                        color: isUser ? Colors.white70 : Colors.black26,
                        width: 0.5,
                      ),
                      tableBody: GoogleFonts.plusJakartaSans(
                        color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                        fontSize: 10.sp,
                      ),
                      tableHead: GoogleFonts.plusJakartaSans(
                        color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                        fontSize: 10.sp,
                        fontWeight: FontWeight.bold,
                      ),
                      tableCellsPadding: EdgeInsets.all(6.r),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
                  child: Text(
                    DateFormat('HH:mm').format(msg.createdAt),
                    style: GoogleFonts.plusJakartaSans(fontSize: 10, color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),
          if (isUser)
            Container(
              margin: const EdgeInsets.only(left: 8, top: 4),
              child: const CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.primaryOrange,
                child: Icon(Icons.person, size: 18, color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInputArea(
    BuildContext context,
    AiChatController controller,
  ) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return SafeArea(
      top: false,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: EdgeInsets.fromLTRB(
          16.w,
          10.h,
          16.w,
          bottomInset > 0 ? 10.h : 18.h,
        ),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(
                Theme.of(context).brightness == Brightness.dark ? 0.22 : 0.06,
              ),
              blurRadius: 18,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: Container(
          padding: EdgeInsets.fromLTRB(14.w, 10.h, 10.w, 10.h),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.grey[850]
                : const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(24.r),
            border: Border.all(
              color: AppColors.primaryOrange.withOpacity(0.10),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: controller.textController,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.newline,
                  style: GoogleFonts.plusJakartaSans(
                    color: Theme.of(context).colorScheme.onSurface,
                    fontSize: 14.sp,
                    height: 1.45,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Hỏi FAMS AI điều bạn cần...',
                    border: InputBorder.none,
                    isCollapsed: true,
                    hintStyle: GoogleFonts.plusJakartaSans(
                      fontSize: 13.sp,
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.grey[400]
                          : Colors.grey[600],
                    ),
                  ),
                ),
              ),
              SizedBox(width: 10.w),
              Material(
                color: AppColors.primaryOrange,
                borderRadius: BorderRadius.circular(18.r),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18.r),
                  onTap: () {
                    if (controller.textController.text.trim().isNotEmpty) {
                      controller.sendMessage(controller.textController.text.trim());
                      controller.textController.clear();
                    }
                  },
                  child: Container(
                    width: 44.r,
                    height: 44.r,
                    alignment: Alignment.center,
                    child: Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 20.sp,
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

  void _showHistoryBottomSheet(
    BuildContext context,
    AiChatController controller,
  ) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Text(
              'Lịch sử trò chuyện',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Obx(
                () => ListView.builder(
                  itemCount: controller.sessions.length,
                  itemBuilder: (context, index) {
                    final session = controller.sessions[index];
                    final isCurrent =
                        controller.currentSession.value?.id == session.id;
                    return ListTile(
                      leading: Icon(
                        Icons.chat_bubble_outline_rounded,
                        color: isCurrent
                            ? AppColors.primaryOrange
                            : Colors.grey,
                      ),
                      title: Text(
                        session.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: isCurrent
                              ? FontWeight.bold
                              : FontWeight.normal,
                          color: isCurrent
                              ? AppColors.primaryOrange
                              : Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      subtitle: Text(
                        DateFormat('dd/MM HH:mm').format(session.lastMessageAt),
                      ),
                      trailing: isCurrent
                          ? const Icon(
                              Icons.check_circle,
                              color: AppColors.primaryOrange,
                            )
                          : null,
                      onTap: () {
                        controller.selectSession(session);
                        Get.back();
                      },
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
