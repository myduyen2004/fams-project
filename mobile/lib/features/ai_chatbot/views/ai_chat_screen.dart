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
    
    // Trigger reload if empty (e.g. after login)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (controller.sessions.isEmpty && !controller.isLoading.value) {
        controller.loadSessions();
      }
    });

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
                  fontWeight: FontWeight.w800,
                  fontSize: 17.sp,
                  letterSpacing: -0.5,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7.r,
                    height: 7.r,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withOpacity(0.4),
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                  SizedBox(width: 6.w),
                  Text(
                    'Trực tuyến',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF10B981),
                      fontSize: 11.sp,
                      fontWeight: FontWeight.w700,
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
        physics: const BouncingScrollPhysics(),
        padding: EdgeInsets.symmetric(horizontal: 24.w, vertical: 32.h),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Hero Icon with pulsing glow effect
            Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: 100.r,
                  height: 100.r,
                  decoration: BoxDecoration(
                    color: AppColors.primaryOrange.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                ),
                Container(
                  width: 70.r,
                  height: 70.r,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.orange400, AppColors.orange600],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryOrange.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Icon(
                    Icons.auto_awesome_rounded,
                    color: Colors.white,
                    size: 32.r,
                  ),
                ),
              ],
            ),
            SizedBox(height: 32.h),
            Text(
              'FAMS AI Assistant',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 26.sp,
                fontWeight: FontWeight.w900,
                color: Theme.of(context).colorScheme.onSurface,
                letterSpacing: -1,
              ),
            ),
            SizedBox(height: 12.h),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 20.w),
              child: Text(
                'Tôi có thể giúp bạn tra cứu lịch học, điểm số, hoặc giải đáp các thắc mắc về quy định học tập.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14.sp,
                  color: Colors.grey[600],
                  height: 1.6,
                ),
              ),
            ),
            SizedBox(height: 48.h),
            
            // Bento-style Grid for Suggestions
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Gợi ý cho bạn',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13.sp,
                  fontWeight: FontWeight.w800,
                  color: Colors.grey[400],
                  letterSpacing: 1,
                  textStyle: const TextStyle(fontFeatures: [FontFeature.enable('smcp')]),
                ),
              ),
            ),
            SizedBox(height: 16.h),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12.r,
              crossAxisSpacing: 12.r,
              childAspectRatio: 1.1,
              children: controller.suggestedQuestions.map((q) {
                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24.r),
                    onTap: () => controller.sendMessage(q),
                    child: Ink(
                      padding: EdgeInsets.all(16.r),
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(24.r),
                        border: Border.all(
                          color: AppColors.primaryOrange.withOpacity(0.08),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: EdgeInsets.all(8.r),
                            decoration: BoxDecoration(
                              color: AppColors.primaryOrange.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12.r),
                            ),
                            child: Icon(
                              _getIconForQuestion(q),
                              color: AppColors.primaryOrange,
                              size: 18.r,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            q,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12.sp,
                              fontWeight: FontWeight.w700,
                              color: Theme.of(context).colorScheme.onSurface,
                              height: 1.3,
                            ),
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getIconForQuestion(String q) {
    if (q.contains('Lịch')) return Icons.calendar_today_rounded;
    if (q.contains('Điểm')) return Icons.analytics_rounded;
    if (q.contains('ngành')) return Icons.school_rounded;
    if (q.contains('Thông tin')) return Icons.info_outline_rounded;
    return Icons.chat_bubble_outline_rounded;
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: EdgeInsets.only(bottom: 20.h),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser)
            Container(
              margin: EdgeInsets.only(right: 8.w, bottom: 2.h),
              child: Container(
                padding: EdgeInsets.all(8.r),
                decoration: BoxDecoration(
                  color: AppColors.primaryOrange.withOpacity(0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primaryOrange.withOpacity(0.2)),
                ),
                child: Icon(
                  Icons.smart_toy_rounded,
                  size: 16.r,
                  color: AppColors.primaryOrange,
                ),
              ),
            ),
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: EdgeInsets.all(16.r),
                  decoration: BoxDecoration(
                    gradient: isUser
                        ? const LinearGradient(
                            colors: [AppColors.orange500, AppColors.orange600],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    color: isUser ? null : (isDark ? const Color(0xFF1C1C1E) : Colors.white),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(24.r),
                      topRight: Radius.circular(24.r),
                      bottomLeft: Radius.circular(isUser ? 24.r : 6.r),
                      bottomRight: Radius.circular(isUser ? 6.r : 24.r),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isUser 
                            ? AppColors.primaryOrange.withOpacity(0.2)
                            : Colors.black.withOpacity(0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                    border: isUser 
                        ? null 
                        : Border.all(
                            color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.withOpacity(0.08),
                          ),
                  ),
                  child: MarkdownBody(
                    data: msg.content,
                    selectable: true,
                    builders: {
                      'table': VerticalTableBuilder(context),
                    },
                    styleSheet: MarkdownStyleSheet(
                      p: GoogleFonts.plusJakartaSans(
                        color: isUser ? Colors.white : (isDark ? Colors.white.withOpacity(0.9) : Colors.black87),
                        fontSize: 13.sp,
                        height: 1.6,
                        fontWeight: FontWeight.w500,
                      ),
                      h1: GoogleFonts.plusJakartaSans(
                        fontSize: 20.sp,
                        fontWeight: FontWeight.w900,
                        color: isUser ? Colors.white : Theme.of(context).colorScheme.onSurface,
                        letterSpacing: -0.5,
                      ),
                      h2: GoogleFonts.plusJakartaSans(
                        fontSize: 18.sp,
                        fontWeight: FontWeight.w800,
                        color: isUser ? Colors.white : Theme.of(context).colorScheme.onSurface,
                      ),
                      strong: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w800,
                        color: isUser ? Colors.white : (isDark ? AppColors.orange300 : AppColors.orange600),
                      ),
                      listBullet: GoogleFonts.plusJakartaSans(
                        color: isUser ? Colors.white70 : AppColors.primaryOrange,
                        fontSize: 13.sp,
                      ),
                      blockquote: GoogleFonts.plusJakartaSans(
                        color: Colors.grey,
                        fontStyle: FontStyle.italic,
                      ),
                      blockquoteDecoration: BoxDecoration(
                        border: Border(left: BorderSide(color: AppColors.primaryOrange.withOpacity(0.5), width: 4)),
                      ),
                      tableBorder: TableBorder.all(
                        color: isUser ? Colors.white24 : Colors.black12,
                        width: 0.5,
                      ),
                    ),
                  ),
                ),
                SizedBox(height: 6.h),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8.w),
                  child: Text(
                    DateFormat('HH:mm').format(msg.createdAt),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.sp,
                      color: Colors.grey[400],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (isUser)
            Container(
              margin: EdgeInsets.only(left: 8.w, bottom: 2.h),
              child: Container(
                padding: EdgeInsets.all(2.r),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primaryOrange.withOpacity(0.3), width: 1.5),
                ),
                child: CircleAvatar(
                  radius: 14.r,
                  backgroundColor: AppColors.primaryOrange,
                  child: Icon(Icons.person_rounded, size: 16.r, color: Colors.white),
                ),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.fromLTRB(
        20.w,
        12.h,
        20.w,
        bottomInset > 0 ? 12.h : (MediaQuery.of(context).padding.bottom + 12.h),
      ),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        border: Border(
          top: BorderSide(
            color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.withOpacity(0.1),
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 8.h),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1C1C1E) : Colors.grey[100],
                borderRadius: BorderRadius.circular(28.r),
                border: Border.all(
                  color: isDark ? Colors.white.withOpacity(0.05) : Colors.transparent,
                ),
              ),
              child: TextField(
                controller: controller.textController,
                minLines: 1,
                maxLines: 5,
                textInputAction: TextInputAction.send,
                onSubmitted: (value) {
                  if (value.trim().isNotEmpty) {
                    controller.sendMessage(value.trim());
                    controller.textController.clear();
                  }
                },
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14.sp,
                  color: Theme.of(context).colorScheme.onSurface,
                  height: 1.5,
                ),
                decoration: InputDecoration(
                  hintText: 'Nhập tin nhắn...',
                  hintStyle: GoogleFonts.plusJakartaSans(
                    fontSize: 14.sp,
                    color: Colors.grey[500],
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 8.h),
                ),
              ),
            ),
          ),
          SizedBox(width: 12.w),
          GestureDetector(
            onTap: () {
              if (controller.textController.text.trim().isNotEmpty) {
                controller.sendMessage(controller.textController.text.trim());
                controller.textController.clear();
              }
            },
            child: Container(
              width: 48.r,
              height: 48.r,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.orange500, AppColors.orange600],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryOrange.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Icon(
                Icons.send_rounded,
                color: Colors.white,
                size: 20.r,
              ),
            ),
          ),
        ],
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
