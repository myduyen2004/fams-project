import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/chat_controller.dart';
import '../models/chat_models.dart';
import '../services/chat_service.dart';
import '../../lecturer/views/student_detail_screen.dart';
import 'image_preview_screen.dart';

/// Group detail / info screen — matches web detail sidebar
class ChatInfoScreen extends StatelessWidget {
  const ChatInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ChatController>();

    return Scaffold(
      backgroundColor: const Color(0xFFFFF7F0),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF2D3436)),
          onPressed: () => Get.back(),
        ),
        title: Text(
          'Thông tin nhóm',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF2D3436),
          ),
        ),
      ),
      body: Obx(() {
        final group = controller.selectedGroup.value;
        if (group == null) return const SizedBox.shrink();

        final images = controller.messages
            .where((m) => m.type == 'IMAGE' && !m.deleted)
            .toList();
        final files = controller.messages
            .where((m) => m.type == 'FILE' && !m.deleted)
            .toList();
        final links = controller.messages
            .where((m) => m.type == 'LINK' && !m.deleted)
            .toList();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // ── Group Avatar ──
              Builder(
                builder: (context) {
                  final studentMembers =
                      group.members
                          ?.where((m) => m.role == 'STUDENT')
                          .toList() ??
                      [];
                  final avatarsToDisplay = studentMembers.take(2).toList();

                  if (avatarsToDisplay.isEmpty) {
                    return Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEEDD),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 4),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.people_rounded,
                          color: Color(0xFFFF8C33),
                          size: 64,
                        ),
                      ),
                    );
                  }

                  return SizedBox(
                    width:
                        120 +
                        (avatarsToDisplay.length > 1
                            ? 60.0
                            : 0.0), // Adjust width for overlap
                    height: 120,
                    child: Stack(
                      clipBehavior: Clip.none,
                      alignment: Alignment.center,
                      children: avatarsToDisplay
                          .asMap()
                          .entries
                          .map((entry) {
                            final idx = entry.key;
                            final member = entry.value;

                            // Calculate position to center the stack
                            final totalWidth =
                                120 +
                                (avatarsToDisplay.length > 1 ? 60.0 : 0.0);
                            final startLeft =
                                (totalWidth -
                                    (120 +
                                        (avatarsToDisplay.length - 1) * 60.0)) /
                                2;

                            return Positioned(
                              left:
                                  startLeft +
                                  idx * 60.0, // 1/2 overlap (120/2 = 60)
                              child: Container(
                                width: 120,
                                height: 120,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 6,
                                  ),
                                  color: idx == 0
                                      ? Colors.white
                                      : const Color(0xFFFFD8B2),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.08),
                                      blurRadius: 8,
                                      offset: const Offset(0, 4),
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
                                              _buildInitialAvatarForInfo(
                                                member.fullName,
                                              ),
                                          placeholder: (context, url) =>
                                              Container(
                                                color: Colors.grey[200],
                                              ),
                                        )
                                      : _buildInitialAvatarForInfo(
                                          member.fullName,
                                        ),
                                ),
                              ),
                            );
                          })
                          .toList()
                          .reversed
                          .toList(),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
              Text(
                group.name,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF2D3436),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${group.memberCount} thành viên • ${group.className}',
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
              ),

              const SizedBox(height: 24),

              // ── Info Tiles ──
              _buildInfoCard([
                _buildInfoRow(
                  Icons.school_rounded,
                  'Giảng viên',
                  group.lecturerName,
                ),
                _buildInfoRow(Icons.class_rounded, 'Lớp', group.className),
                _buildInfoRow(
                  Icons.category_rounded,
                  'Loại',
                  group.type == 'CLASS' ? 'Lớp học' : group.type,
                ),
                _buildInfoRow(
                  Icons.calendar_today_rounded,
                  'Ngày tạo',
                  _formatDate(group.createdAt),
                ),
              ]),

              const SizedBox(height: 16),

              // ── Members ──
              if (group.members != null && group.members!.isNotEmpty) ...[
                _buildSectionHeader(
                  Icons.people_rounded,
                  'Thành viên (${group.members!.length})',
                ),
                const SizedBox(height: 8),
                _buildInfoCard(
                  group.members!.map((m) => _buildMemberTile(m)).toList(),
                ),
                const SizedBox(height: 16),
              ],

              // ── Images ──
              if (images.isNotEmpty) ...[
                _buildSectionHeader(
                  Icons.image_rounded,
                  'Hình ảnh (${images.length})',
                ),
                const SizedBox(height: 8),
                _buildImageGrid(images),
                const SizedBox(height: 16),
              ],

              // ── Files ──
              if (files.isNotEmpty) ...[
                _buildSectionHeader(
                  Icons.insert_drive_file_rounded,
                  'Tệp (${files.length})',
                ),
                const SizedBox(height: 8),
                _buildInfoCard(files.map((f) => _buildFileTile(f)).toList()),
                const SizedBox(height: 16),
              ],

              // ── Links ──
              if (links.isNotEmpty) ...[
                _buildSectionHeader(
                  Icons.link_rounded,
                  'Liên kết (${links.length})',
                ),
                const SizedBox(height: 8),
                _buildInfoCard(links.map((l) => _buildLinkTile(l)).toList()),
              ],

              const SizedBox(height: 32),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primaryOrange),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF2D3436),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primaryOrange.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: AppColors.primaryOrange),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              color: Colors.grey[600],
              fontWeight: FontWeight.w400,
            ),
          ),
          const Spacer(),
          Text(
            value,
            textAlign: TextAlign.right,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF2D3436),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberTile(ChatMember member) {
    final isLecturer = member.role == 'LECTURER';
    return ListTile(
      onTap: () async {
        print(
          'DEBUG: Tapped member: ${member.fullName}, role: ${member.role}, code: ${member.code}',
        );
        if (!isLecturer && member.code.isNotEmpty) {
          print('DEBUG: Conditions met, fetching info for ${member.code}');
          final chatService = ChatService();
          try {
            Get.dialog(
              const Center(
                child: CircularProgressIndicator(
                  color: AppColors.primaryOrange,
                ),
              ),
              barrierDismissible: false,
            );

            final enrollment = await chatService.getStudentInfo(member.code);
            print('DEBUG: Success fetching info for ${member.code}');
            Get.back(); // Close loading dialog

            Get.to(() => StudentDetailScreen(student: enrollment));
          } catch (e) {
            print('DEBUG: Error fetching info for ${member.code}: $e');
            Get.back(); // Close loading dialog
            Get.snackbar(
              'Lỗi',
              'Không thể tải thông tin sinh viên (${member.code}): $e',
              backgroundColor: Colors.red.withOpacity(0.1),
              colorText: Colors.red,
              duration: const Duration(seconds: 5),
            );
          }
        } else {
          print(
            'DEBUG: Conditions NOT met: isLecturer=$isLecturer, codeEmpty=${member.code.isEmpty}',
          );
        }
      },
      dense: true,
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: isLecturer
              ? const Color(0xFF6C5CE7).withOpacity(0.15)
              : AppColors.primaryOrange.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: member.avatarUrl != null && member.avatarUrl!.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: member.avatarUrl!,
                fit: BoxFit.cover,
                placeholder: (context, url) => _buildMemberInitials(member),
                errorWidget: (context, url, error) =>
                    _buildMemberInitials(member),
              )
            : _buildMemberInitials(member),
      ),
      title: Text(
        member.fullName,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      ),
      subtitle: !isLecturer
          ? Text(
              member.code.isNotEmpty ? member.code : 'Chưa có MSSV',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            )
          : null,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: isLecturer
              ? const Color(0xFF6C5CE7).withOpacity(0.1)
              : AppColors.primaryOrange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          isLecturer ? 'Giảng viên' : 'Sinh viên',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: isLecturer
                ? const Color(0xFF6C5CE7)
                : AppColors.primaryOrange,
          ),
        ),
      ),
    );
  }

  Widget _buildImageGrid(List<ChatMessage> images) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(8),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 6,
          mainAxisSpacing: 6,
        ),
        itemCount: images.length > 9 ? 9 : images.length,
        itemBuilder: (context, index) {
          final msg = images[index];
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
              borderRadius: BorderRadius.circular(10),
              child: CachedNetworkImage(
                imageUrl: msg.attachmentUrl ?? '',
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  color: Colors.grey[200],
                  child: const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.primaryOrange,
                      strokeWidth: 2,
                    ),
                  ),
                ),
                errorWidget: (_, __, ___) => Container(
                  color: Colors.grey[200],
                  child: const Icon(Icons.broken_image, color: Colors.grey),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFileTile(ChatMessage msg) {
    return ListTile(
      dense: true,
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: AppColors.primaryOrange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Center(
          child: Icon(
            Icons.insert_drive_file_rounded,
            color: AppColors.primaryOrange,
            size: 20,
          ),
        ),
      ),
      title: Text(
        msg.attachmentName ?? msg.content,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
      ),
      subtitle: Text(
        msg.senderName,
        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
      ),
      trailing: IconButton(
        icon: const Icon(
          Icons.download_rounded,
          color: AppColors.primaryOrange,
          size: 20,
        ),
        onPressed: () async {
          if (msg.attachmentUrl != null) {
            final uri = Uri.tryParse(msg.attachmentUrl!);
            if (uri != null) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          }
        },
      ),
    );
  }

  Widget _buildLinkTile(ChatMessage msg) {
    return ListTile(
      dense: true,
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.blue.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Center(
          child: Icon(Icons.link_rounded, color: Colors.blue, size: 20),
        ),
      ),
      title: Text(
        msg.content,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: Colors.blue,
        ),
      ),
      subtitle: Text(
        msg.senderName,
        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
      ),
      onTap: () async {
        final uri = Uri.tryParse(msg.content);
        if (uri != null) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
    );
  }

  Widget _buildMemberInitials(ChatMember member) {
    final isLecturer = member.role == 'LECTURER';
    return Center(
      child: Icon(
        Icons.person_rounded,
        size: 20,
        color: isLecturer ? const Color(0xFF6C5CE7) : AppColors.primaryOrange,
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return isoString;
    }
  }

  Widget _buildInitialAvatarForInfo(String fullName) {
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U';
    return Container(
      color: const Color(0xFFFFEEDD),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 48,
            fontWeight: FontWeight.bold,
            color: Color(0xFFFF8C33),
          ),
        ),
      ),
    );
  }
}
