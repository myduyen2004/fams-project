import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/ai_chat_controller.dart';
import '../models/ai_chat_models.dart';

class AiChatScreen extends StatelessWidget {
  const AiChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    debugPrint('AiChatScreen: building screen');
    final AiChatController controller = Get.find<AiChatController>();
    final TextEditingController textController = TextEditingController();
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
          onPressed: () => Get.back(),
        ),
        title: Obx(
          () => Column(
            children: [
              Text(
                controller.chatTitle,
                style: GoogleFonts.plusJakartaSans(
                  color: Theme.of(context).colorScheme.onSurface,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Online',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.green,
                      fontSize: 12,
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
                ? _buildThinkingProcess(controller.thinkingSteps)
                : const SizedBox.shrink(),
          ),

          Expanded(
            child: Obx(() {
              if (controller.messages.isEmpty && !controller.isLoading.value) {
                return _buildWelcomeScreen(controller);
              }

              return ListView.builder(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: controller.messages.length,
                itemBuilder: (context, index) {
                  final msg = controller.messages[index];
                  return _buildMessageBubble(msg);
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

          _buildInputArea(controller, textController),
        ],
      ),
    );
  }

  Widget _buildWelcomeScreen(AiChatController controller) {
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
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: controller.suggestedQuestions
                  .map(
                    (q) => ActionChip(
                      label: Text(
                        q,
                        style: GoogleFonts.plusJakartaSans(
                          color: AppColors.primaryOrange,
                          fontSize: 13,
                        ),
                      ),
                      backgroundColor: Theme.of(context).cardColor,
                      side: const BorderSide(
                        color: AppColors.primaryOrange,
                        width: 0.5,
                      ),
                      onPressed: () => controller.sendMessage(q),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildThinkingProcess(List<ThinkingStep> steps) {
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
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 4),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: steps.map((s) => _buildStepTag(s)).toList()),
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

  Widget _buildMessageBubble(AiChatMessage msg) {
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
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUser
                        ? AppColors.primaryOrange
                        : (Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : const Color(0xFFF1F0F0)),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 16),
                    ),
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            minWidth: constraints.maxWidth,
                            maxWidth: isUser ? constraints.maxWidth : 1000,
                          ),
                          child: MarkdownBody(
                            data: msg.content,
                            selectable: true,
                            styleSheet: MarkdownStyleSheet(
                              p: GoogleFonts.plusJakartaSans(
                                color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                                fontSize: 14,
                              ),
                              tableBorder: TableBorder.all(
                                color: isUser ? Colors.white70 : Colors.black26,
                                width: 0.5,
                              ),
                              tableBody: GoogleFonts.plusJakartaSans(
                                color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                                fontSize: 12,
                              ),
                              tableHead: GoogleFonts.plusJakartaSans(
                                color: isUser ? Colors.white : (Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black87),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                              tableCellsPadding: const EdgeInsets.all(8),
                            ),
                          ),
                        ),
                      );
                    },
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
    AiChatController controller,
    TextEditingController textController,
  ) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(Theme.of(context).brightness == Brightness.dark ? 0.2 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[800] : Colors.grey[100],
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: textController,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                decoration: InputDecoration(
                  hintText: 'Nhập câu hỏi...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(fontSize: 14, color: Theme.of(context).brightness == Brightness.dark ? Colors.grey[400] : Colors.grey[600]),
                ),
                onSubmitted: (val) {
                  if (val.isNotEmpty) {
                    controller.sendMessage(val);
                    textController.clear();
                  }
                },
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            decoration: const BoxDecoration(
              color: AppColors.primaryOrange,
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.send_rounded, color: Colors.white),
              onPressed: () {
                if (textController.text.isNotEmpty) {
                  controller.sendMessage(textController.text);
                  textController.clear();
                }
              },
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
